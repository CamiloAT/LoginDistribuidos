#!/bin/bash
# filepath: /home/elcokiin/Code/universidad/distribuidos/lab2/LoginDistribuidos/sql/add-node.sh
set -e

# Variables de configuración
MYSQL_ROOT_PASSWORD="123456"
NETWORK_NAME="sql_db-network"
MASTER_HOST="mariadb-master"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="replicator123"
BASE_PORT=3310  # Incrementar para nuevos nodos (3311, 3312...)
BASE_SERVER_ID=10  # IDs para nuevos nodos (10, 11, 12...)

# Verificar si se proporcionó un nombre de nodo, o generar uno
if [ -z "$1" ]; then
  NODE_COUNT=$(docker ps -a --filter "name=mariadb-slave" | wc -l)
  # Restamos 1 para excluir la línea de encabezado
  NEXT_NODE=$((NODE_COUNT))
  NODE_NAME="mariadb-slave${NEXT_NODE}"
  SERVER_ID=$((BASE_SERVER_ID + NEXT_NODE - 1))
  NODE_PORT=$((BASE_PORT + NEXT_NODE))
else
  NODE_NAME="$1"
  SERVER_ID=$BASE_SERVER_ID
  NODE_PORT=$BASE_PORT
fi

echo "🚀 Añadiendo nuevo nodo: $NODE_NAME (Server ID: $SERVER_ID, Puerto: $NODE_PORT)"

# Crear volumen para el nuevo nodo
VOLUME_NAME="${NODE_NAME}-data"
echo "📦 Creando volumen: $VOLUME_NAME"
docker volume create $VOLUME_NAME

# Copiar archivo slave-init.sh al directorio temporal
echo "📋 Preparando script de inicialización"
TEMP_DIR=$(mktemp -d)
cp ./slave-init.sh $TEMP_DIR/

# Iniciar el nuevo nodo
echo "🛢️ Iniciando nuevo nodo MariaDB"
docker run -d \
  --name $NODE_NAME \
  --network $NETWORK_NAME \
  -e MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD \
  -e MYSQL_DATABASE=gallery_db \
  -e MASTER_HOST=$MASTER_HOST \
  -e REPLICATION_USER=$REPLICATION_USER \
  -e REPLICATION_PASSWORD=$REPLICATION_PASSWORD \
  -p $NODE_PORT:3306 \
  -v $VOLUME_NAME:/var/lib/mysql \
  -v $TEMP_DIR/slave-init.sh:/docker-entrypoint-initdb.d/slave-init.sh \
  --health-cmd="mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD" \
  --health-interval=10s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=30s \
  mariadb:10.6 \
  mysqld --server-id=$SERVER_ID --log-bin --relay-log=${NODE_NAME}-relay-bin --read-only=1 --log-slave-updates=1 --max_connections=1000

echo "⏳ Esperando a que el nodo esté disponible..."
while ! docker exec $NODE_NAME mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent 2>/dev/null; do
  echo "Esperando a que MariaDB se inicie..."
  sleep 5
done

# Verificar replicación
echo "🔍 Verificando estado de replicación"
sleep 10  # Dar tiempo para que la replicación se configure
docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running:|Slave_SQL_Running:"

# Actualizar HAProxy (añadir el nuevo nodo al balanceador)
echo "🔄 Actualizando configuración de HAProxy"
# Verificar si existe la línea del servidor en haproxy.cfg
if ! grep -q "server $NODE_NAME" ./haproxy.cfg; then
  # Añadir el nuevo servidor a la configuración después del último slave
  sed -i "/server slave[0-9]* mariadb-slave[0-9]*:3306 check weight 3/a\\    server $NODE_NAME $NODE_NAME:3306 check weight 3" ./haproxy.cfg
  
  # Recargar configuración de HAProxy
  docker kill -s HUP haproxy
  echo "✅ HAProxy actualizado y recargado"
else
  echo "⚠️ El nodo ya existe en la configuración de HAProxy"
fi

echo "✅ Nodo $NODE_NAME añadido exitosamente al clúster"
echo "   Puerto externo: $NODE_PORT"
echo "   Servidor ID: $SERVER_ID"
echo "   Para verificar el estado: docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e \"SHOW SLAVE STATUS\\G\""