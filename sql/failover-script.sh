#!/bin/bash
# filepath: /home/elcokiin/Code/universidad/distribuidos/lab2/LoginDistribuidos/sql/failover-script.sh

# Script de failover automático para el cluster MariaDB
# Este script verifica el estado del master y promueve un slave si es necesario.

# Configuración
MASTER_CONTAINER="mariadb-master"
SLAVE_CONTAINERS=("mariadb-slave1" "mariadb-slave2")
MYSQL_ROOT_PASSWORD="123456"
HAPROXY_CONTAINER="haproxy"
HAPROXY_CFG="/usr/local/etc/haproxy/haproxy.cfg"
LOG_FILE="/var/log/mariadb-failover.log"

# Función para escribir en el log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Función para verificar si un contenedor está funcionando
is_container_running() {
    if [ "$(docker inspect -f '{{.State.Running}}' $1 2>/dev/null)" == "true" ]; then
        return 0
    else
        return 1
    fi
}

# Función para verificar si MariaDB está accesible en un contenedor
is_mysql_accessible() {
    container=$1
    docker exec $container mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent &>/dev/null
    return $?
}

# Función para verificar el estado de replicación de un slave
check_slave_status() {
    slave=$1
    # Verifica que el slave esté conectado al master y replicando
    docker exec $slave mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running: Yes|Slave_SQL_Running: Yes" | wc -l
}

# Función para encontrar el mejor slave para promoción
find_best_slave() {
    best_slave=""
    max_position=0
    
    for slave in "${SLAVE_CONTAINERS[@]}"; do
        if is_container_running $slave && is_mysql_accessible $slave; then
            # Obtener posición de lectura en binlog
            position=$(docker exec $slave mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep "Read_Master_Log_Pos" | awk '{print $2}')
            
            if [ -z "$best_slave" ] || [ $position -gt $max_position ]; then
                best_slave=$slave
                max_position=$position
            fi
        fi
    done
    
    echo $best_slave
}

# Función para promover un slave a master
promote_slave_to_master() {
    slave=$1
    log "Promoviendo $slave a nuevo master..."
    
    # Detener replicación y configurar como master
    docker exec $slave mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "
        STOP SLAVE;
        RESET SLAVE ALL;
        SET GLOBAL read_only=0;
    "
    
    # Crear usuario de replicación en el nuevo master
    docker exec $slave mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "
        CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY 'replicator123';
        GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'%';
        FLUSH PRIVILEGES;
    "
    
    log "$slave ha sido promovido a master."
    return 0
}

# Función para configurar los slaves para replicar desde el nuevo master
reconfigure_slaves() {
    new_master=$1
    
    # Obtener información del binlog del nuevo master
    binlog_file=$(docker exec $new_master mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G" | grep "File" | awk '{print $2}')
    binlog_pos=$(docker exec $new_master mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G" | grep "Position" | awk '{print $2}')
    
    for slave in "${SLAVE_CONTAINERS[@]}"; do
        if [ "$slave" != "$new_master" ] && is_container_running $slave && is_mysql_accessible $slave; then
            log "Reconfigurando $slave para replicar desde $new_master..."
            
            docker exec $slave mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "
                STOP SLAVE;
                RESET SLAVE ALL;
                CHANGE MASTER TO
                    MASTER_HOST='$new_master',
                    MASTER_USER='replicator',
                    MASTER_PASSWORD='replicator123',
                    MASTER_LOG_FILE='$binlog_file',
                    MASTER_LOG_POS=$binlog_pos;
                START SLAVE;
                SET GLOBAL read_only=1;
            "
            
            log "$slave ahora está replicando desde $new_master."
        fi
    done
}

# Función para actualizar la configuración de HAProxy
update_haproxy_config() {
    new_master=$1
    log "Actualizando configuración de HAProxy para apuntar al nuevo master $new_master..."
    
    # Backup de la configuración
    docker exec $HAPROXY_CONTAINER cp $HAPROXY_CFG ${HAPROXY_CFG}.bak
    
    # Actualizar configuración
    docker exec $HAPROXY_CONTAINER sed -i "s/server master mariadb-master:3306/server master $new_master:3306/g" $HAPROXY_CFG
    
    # Verificar y recargar configuración
    if docker exec $HAPROXY_CONTAINER haproxy -c -f $HAPROXY_CFG; then
        docker exec $HAPROXY_CONTAINER haproxy -f $HAPROXY_CFG -p /var/run/haproxy.pid -D -sf $(docker exec $HAPROXY_CONTAINER cat /var/run/haproxy.pid)
        log "Configuración de HAProxy actualizada y recargada."
        return 0
    else
        log "ERROR: Configuración de HAProxy inválida. Restaurando configuración anterior."
        docker exec $HAPROXY_CONTAINER cp ${HAPROXY_CFG}.bak $HAPROXY_CFG
        return 1
    fi
}

# Función principal para verificar el master y realizar failover si es necesario
check_and_failover() {
    log "Verificando estado del master $MASTER_CONTAINER..."
    
    # Verificar si el master está funcionando
    if is_container_running $MASTER_CONTAINER && is_mysql_accessible $MASTER_CONTAINER; then
        log "Master $MASTER_CONTAINER está funcionando correctamente."
        return 0
    fi
    
    log "ALERTA: Master $MASTER_CONTAINER no está accesible. Iniciando proceso de failover..."
    
    # Encontrar el mejor slave para promoción
    new_master=$(find_best_slave)
    if [ -z "$new_master" ]; then
        log "ERROR: No se encontró ningún slave candidato para failover."
        return 1
    fi
    
    log "Seleccionado $new_master como nuevo master."
    
    # Promover el slave a master
    if ! promote_slave_to_master $new_master; then
        log "ERROR: Falló la promoción de $new_master a master."
        return 1
    fi
    
    # Reconfigurar los slaves restantes
    reconfigure_slaves $new_master
    
    # Actualizar HAProxy
    if ! update_haproxy_config $new_master; then
        log "ERROR: Falló la actualización de HAProxy."
        return 1
    fi
    
    log "Failover completado exitosamente. Nuevo master: $new_master"
    return 0
}

# Crear directorio de logs si no existe
mkdir -p $(dirname $LOG_FILE)

# Comprobar si se está ejecutando como root o con sudo
if [ "$EUID" -ne 0 ]; then
    log "ADVERTENCIA: Este script podría requerir privilegios elevados."
fi

# Ejecutar la verificación y failover
check_and_failover

exit $?