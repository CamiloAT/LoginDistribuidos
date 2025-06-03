#!/bin/bash
# filepath: /home/elcokiin/Code/universidad/distribuidos/lab2/LoginDistribuidos/sql/add-node.sh
set -e

# Variables de configuración (deberían coincidir con tu docker-compose.yml y .env)
MYSQL_ROOT_PASSWORD="123456"
NETWORK_NAME="db-network" # Usar el nombre de la red del docker-compose
MASTER_HOST="mariadb-master"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="replicator123"

# Encuentra el número de esclavos existentes para calcular el nuevo ID y puerto
# Filtra por contenedores que contengan "mariadb-slave" y estén en estado 'Up'
# Excluye el encabezado y cuenta las líneas.
CURRENT_SLAVE_COUNT=$(docker ps --filter "name=mariadb-slave" --format "{{.Names}}" | wc -l)
NEXT_SLAVE_NUMBER=$((CURRENT_SLAVE_COUNT + 1))

# Generar un nombre, ID de servidor y puerto únicos para el nuevo nodo
NODE_NAME="mariadb-slave${NEXT_SLAVE_NUMBER}"
SERVER_ID=$((100 + NEXT_SLAVE_NUMBER)) # Usar un rango más alto para IDs de esclavos adicionales
NODE_PORT=$((3306 + NEXT_SLAVE_NUMBER + 2)) # Ajusta para que no colisione con 3307, 3308, 3309

echo "🚀 Iniciando proceso para añadir un nuevo nodo esclavo:"
echo "   - Nombre del nodo: $NODE_NAME"
echo "   - ID del servidor: $SERVER_ID"
echo "   - Puerto expuesto: $NODE_PORT"

# Crear volumen para el nuevo nodo
VOLUME_NAME="${NODE_NAME}-data"
echo "📦 Creando volumen: $VOLUME_NAME"
docker volume create $VOLUME_NAME

# Copiar el script slave-init.sh a un directorio temporal para el contenedor
echo "📋 Preparando script de inicialización para el nuevo esclavo..."
TEMP_DIR=$(mktemp -d)
cp ./slave-init.sh "$TEMP_DIR/"

# Iniciar el nuevo nodo MariaDB
echo "🛢️ Iniciando contenedor del nuevo nodo MariaDB: $NODE_NAME"
docker run -d \
  --name "$NODE_NAME" \
  --network "$NETWORK_NAME" \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -e MYSQL_DATABASE="gallery_db" \
  -e MASTER_HOST="$MASTER_HOST" \
  -e REPLICATION_USER="$REPLICATION_USER" \
  -e REPLICATION_PASSWORD="$REPLICATION_PASSWORD" \
  -p "$NODE_PORT":3306 \
  -v "$VOLUME_NAME":/var/lib/mysql \
  -v "$TEMP_DIR/slave-init.sh":/docker-entrypoint-initdb.d/slave-init.sh \
  --health-cmd="mysqladmin ping -h localhost -u root -p$$MYSQL_ROOT_PASSWORD" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=30s \
  mariadb:10.6 \
  mysqld --server-id="$SERVER_ID" --log-bin --relay-log="${NODE_NAME}-relay-bin" --read-only=1 --log-slave-updates=1 --max_connections=1000

# Limpiar el directorio temporal después de montar el volumen
rm -rf "$TEMP_DIR"

echo "⏳ Esperando a que el nuevo nodo MariaDB ($NODE_NAME) esté disponible..."
until docker exec "$NODE_NAME" mysqladmin ping -h localhost -u root -p"$MYSQL_ROOT_PASSWORD" --silent; do
  echo "   ... MariaDB en $NODE_NAME aún no responde. Esperando..."
  sleep 5
done
echo "✅ Nodo MariaDB $NODE_NAME está disponible."

# Esperar un poco más para que el script slave-init.sh tenga tiempo de ejecutarse
echo "⏳ Dando tiempo a slave-init.sh para configurar la replicación (15 segundos)..."
sleep 15

# Verificar el estado de la replicación en el nuevo nodo
echo "🔍 Verificando el estado de replicación en $NODE_NAME:"
docker exec "$NODE_NAME" mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running:|Slave_SQL_Running:|Last_IO_Error:|Last_SQL_Error:"

# Actualizar HAProxy (añadir el nuevo nodo al balanceador de lectura)
echo "🔄 Actualizando configuración de HAProxy para incluir $NODE_NAME..."
# Verificar si el servidor ya está en la configuración para evitar duplicados
if ! grep -q "server $NODE_NAME" ./haproxy.cfg; then
  # Añadir el nuevo servidor al backend de esclavos de lectura
  sed -i "/backend mariadb_slaves_backend/a\\    server $NODE_NAME $NODE_NAME:3306 check inter 5s rise 2 fall 3" ./haproxy.cfg
  
  # Recargar configuración de HAProxy de forma suave
  echo "Reloading HAProxy configuration..."
  docker exec haproxy haproxy -sf $(pidof haproxy) -f /usr/local/etc/haproxy/haproxy.cfg
  # Alternativa (más simple pero puede causar una breve interrupción si HAProxy no maneja bien SIGHUP):
  # docker kill -s HUP haproxy
  
  echo "✅ HAProxy actualizado y recargado con $NODE_NAME."
else
  echo "⚠️ El nodo $NODE_NAME ya existe en la configuración de HAProxy. No se hicieron cambios."
fi

echo "🎉 Nodo esclavo $NODE_NAME añadido exitosamente al clúster."
echo "   Puedes verificar su estado con: docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e \"SHOW SLAVE STATUS\\G\""
echo "   También puedes verificar HAProxy en http://localhost:8404"