#!/bin/bash
# filepath: /home/elcokiin/Code/universidad/distribuidos/lab2/LoginDistribuidos/sql/failover-script.sh

# Script de failover para el cluster MariaDB
# Este script verifica el estado del master y promueve un slave si es necesario.

# Configuración
MASTER_CONTAINER="mariadb-master"
# Es importante que esta lista incluya todos los posibles slaves que podrían ser promovidos
SLAVE_CONTAINERS=("mariadb-slave1" "mariadb-slave2") 
MYSQL_ROOT_PASSWORD="123456"
HAPROXY_CONTAINER="haproxy"
HAPROXY_CFG="/usr/local/etc/haproxy/haproxy.cfg"
# Si ejecutas esto desde un contenedor, /var/log/ puede no ser persistente.
# Considera montar un volumen para el directorio de logs del script.
LOG_DIR="/var/log/failover" 
LOG_FILE="$LOG_DIR/mariadb-failover.log"

# --- Funciones de Utilidad ---

# Función para escribir en el log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Función para verificar si un contenedor está funcionando
is_container_running() {
    [ "$(docker inspect -f '{{.State.Running}}' $1 2>/dev/null)" == "true" ]
}

# Función para verificar si MariaDB está accesible en un contenedor
is_mysql_accessible() {
    container=$1
    docker exec $container mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent &>/dev/null
    return $?
}

# Función para encontrar el mejor slave para promoción
# El mejor slave es aquel que está más actualizado (mayor Read_Master_Log_Pos)
find_best_slave() {
    best_slave=""
    max_position=-1 # Usar -1 para asegurar que el primer slave válido sea seleccionado
    
    log "Buscando el mejor slave disponible para promoción..."
    for slave in "${SLAVE_CONTAINERS[@]}"; do
        if is_container_running "$slave" && is_mysql_accessible "$slave"; then
            log "  - Slave '$slave' está corriendo y accesible. Verificando estado de replicación..."
            
            # Obtener posición de lectura en binlog
            SLAVE_STATUS_OUTPUT=$(docker exec "$slave" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G" 2>/dev/null)
            
            # Asegúrate de que la replicación esté (o haya estado) activa y obtén la posición.
            # Se usa Read_Master_Log_Pos para saber qué tan lejos está el slave de la última escritura del master
            # Se usa Exec_Master_Log_Pos para saber qué tan lejos ha aplicado cambios el slave
            # En un failover, Read_Master_Log_Pos es más relevante para la menor pérdida de datos.
            
            local_io_running=$(echo "$SLAVE_STATUS_OUTPUT" | grep 'Slave_IO_Running:' | awk '{print $2}')
            local_sql_running=$(echo "$SLAVE_STATUS_OUTPUT" | grep 'Slave_SQL_Running:' | awk '{print $2}')
            current_position=$(echo "$SLAVE_STATUS_OUTPUT" | grep 'Read_Master_Log_Pos:' | awk '{print $2}')
            
            if [ "$local_io_running" == "Yes" ] && [ "$local_sql_running" == "Yes" ] && [ -n "$current_position" ]; then
                log "    -> '$slave' está replicando. Posición: $current_position"
                if [ -z "$best_slave" ] || (( current_position > max_position )); then
                    best_slave="$slave"
                    max_position="$current_position"
                    log "    -> '$slave' es el nuevo mejor candidato."
                fi
            else
                log "    -> '$slave' no está replicando activamente o no tiene posición de log válida. IO: $local_io_running, SQL: $local_sql_running."
            fi
        else
            log "  - Slave '$slave' no está corriendo o no es accesible. Ignorando."
        fi
    done
    
    echo "$best_slave"
}

# Función para detener todos los slaves (excepto el nuevo master) y reconfigurarlos
reconfigure_slaves() {
    new_master_name=$1
    binlog_file=$2
    binlog_pos=$3
    
    log "Reconfigurando slaves para apuntar al nuevo master: $new_master_name..."
    for slave in "${SLAVE_CONTAINERS[@]}"; do
        if [ "$slave" != "$new_master_name" ] && is_container_running "$slave" && is_mysql_accessible "$slave"; then
            log "  - Reconfigurando $slave..."
            docker exec "$slave" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "
                STOP SLAVE;
                RESET SLAVE ALL; # Limpia cualquier replicación antigua
                CHANGE MASTER TO
                    MASTER_HOST='$new_master_name',
                    MASTER_USER='$REPLICATION_USER',
                    MASTER_PASSWORD='$REPLICATION_PASSWORD',
                    MASTER_LOG_FILE='$binlog_file',
                    MASTER_LOG_POS=$binlog_pos;
                START SLAVE;
                SET GLOBAL read_only=1;
            "
            log "  - $slave ahora está replicando desde $new_master_name."
        else
            log "  - Saltando slave '$slave' (es el nuevo master, o no está disponible/accesible)."
        fi
    done
}

# Función para actualizar la configuración de HAProxy
update_haproxy_config() {
    new_master_name=$1
    old_master_name=$2 # mariadb-master (el original)
    
    log "Actualizando configuración de HAProxy..."
    
    # Crea un backup de la configuración actual de HAProxy
    docker exec "$HAPROXY_CONTAINER" cp "$HAPROXY_CFG" "${HAPROXY_CFG}.bak"
    log "Copia de seguridad de HAProxy guardada en ${HAPROXY_CFG}.bak dentro del contenedor."

    # Paso 1: Actualizar el backend mariadb_master_backend para que apunte al nuevo master
    # Usamos `awk` para ser más preciso. Queremos reemplazar la línea del servidor dentro de `mariadb_master_backend`.
    log "  - Apuntando 'mariadb_master_backend' a '$new_master_name'..."
    docker exec "$HAPROXY_CONTAINER" sed -i.tmp \
        -e "/^backend mariadb_master_backend/,/^backend/{s/server mariadb-master mariadb-master:3306/server mariadb-master $new_master_name:3306/}" \
        "$HAPROXY_CFG"
    
    # Asegúrate de eliminar el archivo .tmp creado por sed si es necesario
    docker exec "$HAPROXY_CONTAINER" rm -f "$HAPROXY_CFG.tmp"

    # Paso 2: Asegurarse de que el nuevo master NO esté en el backend mariadb_slaves_backend
    # Si el nuevo master estaba previamente en los slaves, lo eliminamos.
    log "  - Asegurando que '$new_master_name' no esté en 'mariadb_slaves_backend'..."
    docker exec "$HAPROXY_CONTAINER" sed -i.tmp \
        -e "/^backend mariadb_slaves_backend/,/^backend/{/^ *server $new_master_name /d}" \
        "$HAPROXY_CFG"
    docker exec "$HAPROXY_CONTAINER" rm -f "$HAPROXY_CFG.tmp"

    # Paso 3 (Opcional): Si el antiguo master se recupera, añadirlo de nuevo como slave
    # Por ahora, solo nos aseguramos de que no esté en el master backend.
    # Si el viejo master (mariadb-master) sigue ahí, lo eliminamos de la configuración del master backend
    # si es diferente del nuevo master, para evitar configuraciones erróneas.
    if [ "$old_master_name" != "$new_master_name" ]; then
        log "  - Limpiando referencia al antiguo master ('$old_master_name') si es necesario..."
        docker exec "$HAPROXY_CONTAINER" sed -i.tmp \
            -e "/^backend mariadb_master_backend/,/^backend/{/^ *server mariadb-master /d}" \
            "$HAPROXY_CFG"
        docker exec "$HAPROXY_CONTAINER" rm -f "$HAPROXY_CFG.tmp"
        # Luego podrías añadir mariadb-master al backend de slaves si lo deseas, 
        # pero eso requeriría su reconfiguración como slave después de su recuperación.
    fi

    # Verificar y recargar configuración de HAProxy
    log "  - Verificando y recargando HAProxy..."
    if docker exec "$HAPROXY_CONTAINER" haproxy -c -f "$HAPROXY_CFG"; then
        # Obtener PID del proceso HAProxy dentro del contenedor
        HAPROXY_PID=$(docker exec "$HAPROXY_CONTAINER" cat /var/run/haproxy.pid 2>/dev/null)
        if [ -n "$HAPROXY_PID" ]; then
            docker exec "$HAPROXY_CONTAINER" haproxy -sf "$HAPROXY_PID" -f "$HAPROXY_CFG"
            log "Configuración de HAProxy actualizada y recargada."
            return 0
        else
            log "ADVERTENCIA: No se pudo obtener el PID de HAProxy. Intentando recargar con HUP..."
            docker exec "$HAPROXY_CONTAINER" kill -s HUP $(pidof haproxy) 2>/dev/null || docker exec "$HAPROXY_CONTAINER" kill -s HUP 1 || true
            log "HAProxy recargado (posiblemente con interrupción)."
            return 0 # Asumimos que se recargó, aunque no sea graceful
        fi
    else
        log "ERROR: Configuración de HAProxy inválida. Restaurando configuración anterior y no recargando."
        docker exec "$HAPROXY_CONTAINER" cp "${HAPROXY_CFG}.bak" "$HAPROXY_CFG"
        return 1
    fi
}

# --- Lógica Principal de Failover ---

check_and_failover() {
    log "--- Iniciando verificación de estado del master ---"
    
    # Verificar si el master actual está funcionando
    if is_container_running "$MASTER_CONTAINER" && is_mysql_accessible "$MASTER_CONTAINER"; then
        log "Master '$MASTER_CONTAINER' está funcionando correctamente."
        log "--- Verificación de estado del master completada ---"
        return 0
    fi
    
    log "ALERTA: Master '$MASTER_CONTAINER' no está accesible. Iniciando proceso de failover..."
    
    # Encontrar el mejor slave para promoción
    new_master=$(find_best_slave)
    if [ -z "$new_master" ]; then
        log "ERROR: No se encontró ningún slave candidato para failover. El clúster está en un estado crítico."
        return 1
    fi
    
    log "Seleccionado '$new_master' como nuevo master."
    
    # Promover el slave a master
    if ! promote_slave_to_master "$new_master"; then
        log "ERROR: Falló la promoción de '$new_master' a master."
        return 1
    fi
    
    # Obtener información del binlog del nuevo master (después de su promoción)
    log "Obteniendo estado del binlog del nuevo master '$new_master'..."
    MASTER_STATUS_OUTPUT=$(docker exec "$new_master" mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G")
    binlog_file=$(echo "$MASTER_STATUS_OUTPUT" | grep 'File:' | awk '{print $2}')
    binlog_pos=$(echo "$MASTER_STATUS_OUTPUT" | grep 'Position:' | awk '{print $2}')

    if [ -z "$binlog_file" ] || [ -z "$binlog_pos" ]; then
        log "CRÍTICO: No se pudo obtener el archivo o posición del log del nuevo master. Failover incompleto."
        return 1
    fi
    log "Nuevo master binlog: Archivo='$binlog_file', Posición='$binlog_pos'"

    # Reconfigurar los slaves restantes
    reconfigure_slaves "$new_master" "$binlog_file" "$binlog_pos"
    
    # Actualizar HAProxy para apuntar al nuevo master
    if ! update_haproxy_config "$new_master" "$MASTER_CONTAINER"; then
        log "ERROR: Falló la actualización de HAProxy."
        return 1
    fi

    # Opcional: Detener y/o eliminar el antiguo master si está inactivo para evitar interferencias
    if ! is_container_running "$MASTER_CONTAINER"; then
        log "Antiguo master '$MASTER_CONTAINER' no está corriendo. Considera detenerlo y eliminarlo si no se recupera."
        # docker stop "$MASTER_CONTAINER" # Descomentar si quieres forzar la detención
        # docker rm "$MASTER_CONTAINER" # Descomentar si quieres eliminarlo
    else
        log "Antiguo master '$MASTER_CONTAINER' todavía está corriendo. Se recomienda intervención manual para decidir su destino (ej. reconfigurarlo como slave)."
        # Aquí podrías añadir lógica para reconfigurar el antiguo master como un nuevo slave
        # Esto es complejo ya que necesitarías saber la posición binlog del nuevo master para que el antiguo master empiece a replicar desde allí.
    fi
    
    log "Failover completado exitosamente. Nuevo master: $new_master"
    log "--- Proceso de failover completado ---"
    return 0
}

# --- Inicialización ---
mkdir -p "$LOG_DIR" # Asegura que el directorio de logs exista

# Comprobar si se está ejecutando como root o con sudo (necesario para docker comandos)
if [ "$EUID" -ne 0 ]; then
    log "ADVERTENCIA: Este script podría requerir privilegios elevados (sudo) para ejecutar comandos Docker."
    log "Recomendación: ejecutar con 'sudo bash failover-script.sh' o desde un contenedor con acceso a docker.sock."
fi

# Ejecutar la verificación y failover
check_and_failover

exit $?