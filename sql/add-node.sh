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

# Get master's actual IP address
MASTER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $MASTER_HOST)
echo "🖥️ Master IP address: $MASTER_IP"

# Check if master is accessible on the network
echo "🔍 Verifying master connectivity..."
if ! docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1;" &>/dev/null; then
  echo "⚠️ Warning: Cannot connect to master database. Replication will likely fail."
  echo "Please check that the master container is running and properly configured."
fi

# Check if replication user exists
echo "👤 Verifying replication user exists on master..."
REPL_USER_EXISTS=$(docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT User FROM mysql.user WHERE User='$REPLICATION_USER';" | grep -c "$REPLICATION_USER")
if [ "$REPL_USER_EXISTS" -eq 0 ]; then
  echo "⚠️ Creating missing replication user on master..."
  docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
    CREATE USER '$REPLICATION_USER'@'%' IDENTIFIED BY '$REPLICATION_PASSWORD';
    GRANT REPLICATION SLAVE ON *.* TO '$REPLICATION_USER'@'%';
    FLUSH PRIVILEGES;
  "
fi

# Simply copy the script without changing the hostname:
cp ./slave-init.sh $TEMP_DIR/slave-init.sh
chmod +x $TEMP_DIR/slave-init.sh

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

# Check initial replication status
REPLICATION_STATUS=$(docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G")
echo "$REPLICATION_STATUS" | grep -E "Slave_IO_Running:|Slave_SQL_Running:|Last_IO_Error:"

# If IO thread is not running, try to fix it
if echo "$REPLICATION_STATUS" | grep -q "Slave_IO_Running: No"; then
  echo "⚠️ Slave IO thread is not running. Attempting to fix..."
  
  # 1. First, check the master's binary logs
  echo "📊 Checking master's binary logs"
  docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW BINARY LOGS;"

  # 2. Create a new binary log file on master to start fresh
  echo "🔄 Flushing binary logs on master"
  docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH BINARY LOGS;"

  # 3. Get the current master status with the new log file
  echo "🔍 Getting updated master position"
  MASTER_STATUS=$(docker exec $MASTER_HOST mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G")
  MASTER_LOG_FILE=$(echo "$MASTER_STATUS" | grep "File:" | awk '{print $2}')
  MASTER_LOG_POS=$(echo "$MASTER_STATUS" | grep "Position:" | awk '{print $2}')
  MASTER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $MASTER_HOST)

  echo "📝 New master log file: $MASTER_LOG_FILE, position: $MASTER_LOG_POS"
  echo "🖥️ Master IP address: $MASTER_IP"

  # 4. Reset the slave to use the new binary log file
  echo "🔄 Reconfiguring replication with fresh log position"
  docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
    STOP SLAVE;
    RESET SLAVE;
    CHANGE MASTER TO
      MASTER_HOST='$MASTER_IP',
      MASTER_USER='$REPLICATION_USER',
      MASTER_PASSWORD='$REPLICATION_PASSWORD',
      MASTER_LOG_FILE='$MASTER_LOG_FILE',
      MASTER_LOG_POS=$MASTER_LOG_POS;
    START SLAVE;
  "

  # 5. Check if replication is working now
  sleep 5
  echo "🔍 Checking replication status after fix:"
  docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G" | grep -E "Slave_IO_Running:|Slave_SQL_Running:|Last_IO_Error:"
else
  echo "✅ Replication IO thread is running properly"
fi

# Actualizar HAProxy (añadir el nuevo nodo al balanceador)
echo "🔄 Actualizando configuración de HAProxy"
# Verificar si existe la línea del servidor en haproxy.cfg
if ! grep -q "server $NODE_NAME" ./haproxy.cfg && ! grep -q "server slave.*$NODE_NAME:3306" ./haproxy.cfg; then
  # Extraer el número del nombre del nodo (ej: mariadb-slave3 -> 3)
  NODE_NUM=$(echo $NODE_NAME | grep -o '[0-9]\+$')
  
  # Añadir el nuevo servidor a la configuración, pero sólo después de la PRIMERA aparición del patrón
  sed -i "0,/server slave[0-9]* mariadb-slave[0-9]*:3306/s/server slave[0-9]* mariadb-slave[0-9]*:3306/&\n    server slave$NODE_NUM $NODE_NAME:3306 check weight 3 maxconn 800/" ./haproxy.cfg
  
  # Recargar configuración de HAProxy
  docker kill -s HUP haproxy
  echo "✅ HAProxy actualizado y recargado"
else
  echo "⚠️ El nodo ya existe en la configuración de HAProxy"
fi

# Clean up duplicate entries in haproxy.cfg
awk '!seen[$0]++' haproxy.cfg > haproxy.cfg.tmp && mv haproxy.cfg.tmp haproxy.cfg

echo "✅ Nodo $NODE_NAME añadido exitosamente al clúster"
echo "   Puerto externo: $NODE_PORT"
echo "   Servidor ID: $SERVER_ID"
echo "   Para verificar el estado: docker exec $NODE_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e \"SHOW SLAVE STATUS\\G\""