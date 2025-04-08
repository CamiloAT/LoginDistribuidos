#!/bin/bash
set -eo pipefail

echo "Iniciando configuración del nodo esclavo..."

# Esperar a que el master esté disponible
echo "Esperando a que el nodo master ($MASTER_HOST) esté disponible..."
until mysqladmin ping -h "$MASTER_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" --silent; do
  echo "Esperando al master ($MASTER_HOST)..."
  sleep 5
done
echo "Master disponible. Continuando con la configuración."

echo "Verificando que las tablas existan en el nodo master..."
until mysql -h "$MASTER_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE gallery_db; SHOW TABLES;" | grep -q "users"; do
  echo "Esperando a que las tablas sean creadas en el master..."
  sleep 5
done
echo "Tablas confirmadas en master. Continuando..."

# Create gallery_db database locally to ensure it exists
echo "Asegurando que gallery_db exista localmente..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS gallery_db;"

# mysql -uroot -p"$MYSQL_ROOT_PASSWORD" gallery_db <<EOF
# -- Copiar aquí todas las sentencias CREATE TABLE desde init.sql
# -- Creación de tablas y datos
# CREATE TABLE users (
#     user_id CHAR(36) PRIMARY KEY,
#     name VARCHAR(100) NOT NULL,
#     email VARCHAR(150) UNIQUE NOT NULL,
#     password_hash VARCHAR(255) NOT NULL,
#     status VARCHAR(255) NOT NULL,
#     creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     failed_attempts INT DEFAULT 0,
#     INDEX idx_email (email),
#     INDEX idx_status (status)
# );

# CREATE TABLE roles (
#     role_id CHAR(36) PRIMARY KEY,
#     name VARCHAR(50) UNIQUE NOT NULL,
#     description TEXT
# );

# CREATE TABLE user_roles (
#     user_role_id CHAR(36) PRIMARY KEY,
#     user_id CHAR(36) NOT NULL,
#     role_id CHAR(36) NOT NULL,
#     assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
#     FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE ON UPDATE CASCADE,
#     INDEX idx_user_role (user_id, role_id)
# );

# CREATE TABLE access_history (
#     access_id CHAR(36) PRIMARY KEY,
#     user_id CHAR(36) NOT NULL,
#     ip_address VARCHAR(45) NOT NULL,
#     access_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     access_successful TINYINT(1) NOT NULL,
#     FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
#     INDEX idx_user_access (user_id, access_date)
# );

# CREATE TABLE images (
#     image_id CHAR(36) PRIMARY KEY,
#     user_id CHAR(36) NOT NULL,
#     image_name VARCHAR(100) NOT NULL,
#     path VARCHAR(255) NOT NULL,
#     creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
#     INDEX idx_user_images (user_id)
# );


# -- Datos iniciales
# INSERT INTO roles (role_id, name, description) 
# VALUES (UUID(), 'admin', 'Administrator with full permissions');

# INSERT INTO roles (role_id, name, description) 
# VALUES (UUID(), 'visitor', 'User with read-only access');

# INSERT INTO roles (role_id, name, description) 
# VALUES (UUID(), 'editor', 'User with permissions to modify content');

# INSERT INTO users (user_id, name, email, password_hash, status, creation_date, failed_attempts) 
# VALUES (UUID(), 'Jose', 'jose.ortega01@uptc.edu.co', '$2b$10$xj/bxoSTNMHCZrRMA9NAluAIaAciD6qDlUK8L.qiD43ul/tjJ22LC', 'active', NOW(), 0);

# SET @user_id = (SELECT user_id FROM users WHERE email = 'jose.ortega01@uptc.edu.co');

# SET @admin_role = (SELECT role_id FROM roles WHERE name = 'admin');
# SET @visitor_role = (SELECT role_id FROM roles WHERE name = 'visitor');
# SET @editor_role = (SELECT role_id FROM roles WHERE name = 'editor');

# INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
# VALUES (UUID(), @user_id, @admin_role, NOW());

# INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
# VALUES (UUID(), @user_id, @visitor_role, NOW());

# INSERT INTO user_roles (user_role_id, user_id, role_id, assignment_date) 
# VALUES (UUID(), @user_id, @editor_role, NOW());
# EOF
# echo "Tablas creadas localmente."

# Verificar si la replicación ya está configurada
SLAVE_STATUS=$(mysql -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G" 2>/dev/null)
if [[ -n "$SLAVE_STATUS" ]]; then
  echo "La replicación ya está configurada en este nodo. Verificando estado..."
  SLAVE_IO_RUNNING=$(echo "$SLAVE_STATUS" | grep 'Slave_IO_Running:' | awk '{print $2}')
  SLAVE_SQL_RUNNING=$(echo "$SLAVE_STATUS" | grep 'Slave_SQL_Running:' | awk '{print $2}')
  
  if [[ "$SLAVE_IO_RUNNING" == "Yes" && "$SLAVE_SQL_RUNNING" == "Yes" ]]; then
    echo "La replicación está funcionando correctamente."
    exit 0
  else
    echo "La replicación está configurada pero no está funcionando correctamente. Reiniciando..."
    mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "STOP SLAVE; RESET SLAVE ALL;"
  fi
fi

# Obtener el estado del master
echo "Obteniendo estado actual del master..."
MASTER_STATUS=$(mysql -h "$MASTER_HOST" -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G")
MASTER_LOG_FILE=$(echo "$MASTER_STATUS" | grep 'File:' | awk '{print $2}')
MASTER_LOG_POS=$(echo "$MASTER_STATUS" | grep 'Position:' | awk '{print $2}')

if [[ -z "$MASTER_LOG_FILE" || -z "$MASTER_LOG_POS" ]]; then
  echo "ERROR: No se pudo obtener el archivo o posición del log del master."
  exit 1
fi

echo "Master Log File: $MASTER_LOG_FILE, Position: $MASTER_LOG_POS"

# Extract schema and data from master and apply to slave
echo "Copiando esquema y datos desde el master..."
# This approach uses a direct dump from master to slave
mysqldump -h "$MASTER_HOST" -u root -p"$MYSQL_ROOT_PASSWORD" --opt gallery_db | mysql -u root -p"$MYSQL_ROOT_PASSWORD" gallery_db

echo "Esquema y datos copiados correctamente."

# Configurar la replicación en el slave y arrancar el proceso de slave
echo "Configurando la replicación en el nodo esclavo..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOF
CHANGE MASTER TO 
  MASTER_HOST='$MASTER_HOST',
  MASTER_USER='$REPLICATION_USER',
  MASTER_PASSWORD='$REPLICATION_PASSWORD',
  MASTER_LOG_FILE='$MASTER_LOG_FILE',
  MASTER_LOG_POS=$MASTER_LOG_POS,
  MASTER_CONNECT_RETRY=10;

START SLAVE;
EOF

# Verificar que la replicación se inició correctamente
sleep 5
SLAVE_STATUS=$(mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G")
SLAVE_IO_RUNNING=$(echo "$SLAVE_STATUS" | grep 'Slave_IO_Running:' | awk '{print $2}')
SLAVE_SQL_RUNNING=$(echo "$SLAVE_STATUS" | grep 'Slave_SQL_Running:' | awk '{print $2}')

if [[ "$SLAVE_IO_RUNNING" == "Yes" && "$SLAVE_SQL_RUNNING" == "Yes" ]]; then
  echo "✅ Replicación configurada exitosamente en el nodo esclavo."
else
  echo "❌ ERROR: La replicación no se inició correctamente."
  echo "Estado de Slave_IO_Running: $SLAVE_IO_RUNNING"
  echo "Estado de Slave_SQL_Running: $SLAVE_SQL_RUNNING"
  echo "Últimos errores:"
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G" | grep -E "Last_IO_Error:|Last_SQL_Error:"
  exit 1
fi

# Crear usuario para HAProxy health check
echo "Creando usuario para HAProxy health check..."
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOF
CREATE USER IF NOT EXISTS 'haproxy'@'%';
GRANT USAGE ON *.* TO 'haproxy'@'%';
FLUSH PRIVILEGES;
EOF

echo "Configuración del nodo esclavo completada con éxito."