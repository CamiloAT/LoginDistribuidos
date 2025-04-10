#!/bin/bash
# Turn off debug mode for production
set -e

# Configuration variables
MYSQL_ROOT_PASSWORD="123456"
REPLICATION_USER="replicator"
REPLICATION_PASSWORD="replicator123"
MASTER_HOST="mariadb-master"
CHECK_INTERVAL=5  # Seconds between checks
HEALTHCHECK_TIMEOUT=5  # Seconds before considering master down
MAX_FAILURES=3  # Number of consecutive failures before triggering failover
LOG_FILE="mariadb_failover.log"

# Function to log messages with timestamp
log() {
  local message="$1"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Function to check if master is healthy
check_master_health() {
  log "Checking master health..."
  if docker exec $MASTER_HOST mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent &>/dev/null; then
    log "Master is healthy"
    return 0
  else
    log "WARNING: Master is not responding!"
    return 1
  fi
}

# Function to promote a slave to master
promote_slave_to_master() {
  local new_master=$1
  
  # Validate that new_master contains a valid container name
  if [[ -z "$new_master" || ! "$new_master" =~ mariadb-slave ]]; then
    log "ERROR: Invalid slave name received: '$new_master'"
    return 1
  fi
  
  log "Promoting $new_master to master..."
  
  # First check if binary logging is enabled
  local log_bin=$(docker exec $new_master mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW VARIABLES LIKE 'log_bin';" | grep log_bin | awk '{print $2}')
  log "Binary logging status on $new_master: $log_bin"
  
  if [[ "$log_bin" != "ON" ]]; then
    log "ERROR: Binary logging not enabled on $new_master, cannot promote!"
    return 1
  fi
  
  output=$(docker exec "$new_master" mysql -u root -p"$MYSQL_ROOT_PASSWORD" <<EOF
STOP SLAVE;
RESET SLAVE ALL;
SET GLOBAL read_only = 0;
FLUSH TABLES WITH READ LOCK;
UNLOCK TABLES;
EOF
)
  echo "Command output:"
  echo "$output"

  if [ $? -ne 0 ]; then
    log "ERROR: Failed to promote $new_master to master"
    return 1
  fi

  # Verify master status is working properly
  local master_check=$(docker exec $new_master mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G")
  if [ $? -ne 0 ] || [[ -z "$master_check" ]]; then
    log "ERROR: Failed to get master status after promotion"
    return 1
  fi
  
  log "Successfully promoted $new_master to master"
  # Update our global variable to track the new master
  MASTER_HOST=$new_master
  return 0
}

# Function to reconfigure other slaves to point to the new master
reconfigure_slaves() {
  local new_master=$1
  log "Reconfiguring other slaves to point to new master: $new_master..."
  
  # Give the new master a moment to stabilize
  sleep 5
  
  # Get IP address of the new master
  local master_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $new_master)
  log "New master IP address: $master_ip"
  
  # Get master status from the new master
  local master_status=$(docker exec $new_master mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW MASTER STATUS\G")
  local master_log_file=$(echo "$master_status" | grep "File:" | awk '{print $2}')
  local master_log_pos=$(echo "$master_status" | grep "Position:" | awk '{print $2}')
  
  if [[ -z "$master_log_file" || -z "$master_log_pos" ]]; then
    log "ERROR: Could not get master log file or position from new master"
    return 1
  fi
  
  log "New master log file: $master_log_file, position: $master_log_pos"
  
  # Update each slave to point to the new master - USE IP ADDRESS DIRECTLY
  for container in $(docker ps --format '{{.Names}}' | grep 'mariadb-slave'); do
    # Skip the new master
    if [[ "$container" == "$new_master" ]]; then
      log "Skipping $container as it's the new master"
      continue
    fi
    
    log "Reconfiguring slave: $container to use master IP: $master_ip"
    
    # Force direct IP address usage
    docker exec $container bash -c "mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" -e \"
      STOP SLAVE;
      RESET SLAVE ALL;
      CHANGE MASTER TO
        MASTER_HOST='$master_ip',
        MASTER_USER='$REPLICATION_USER',
        MASTER_PASSWORD='$REPLICATION_PASSWORD',
        MASTER_LOG_FILE='$master_log_file',
        MASTER_LOG_POS=$master_log_pos;
      START SLAVE;
      SHOW SLAVE STATUS\\G
    \"" > /tmp/slave_status_$container.log
    
    # Verify the configuration worked immediately by checking the output
    if grep -q "Master_Host: $master_ip" /tmp/slave_status_$container.log; then
      log "SUCCESS: Slave $container confirmed connected to new master IP: $master_ip"
    else
      log "WARNING: Slave $container may not be properly configured. Check /tmp/slave_status_$container.log"
      
      log "Trying alternative approach for $container"
      docker exec $container bash -c "mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" -e \"
        STOP SLAVE;
        RESET MASTER;
        RESET SLAVE ALL;
        SET GLOBAL master_host='$master_ip';
        SET GLOBAL master_user='$REPLICATION_USER';
        SET GLOBAL master_password='$REPLICATION_PASSWORD';
        SET GLOBAL master_log_file='$master_log_file';
        SET GLOBAL master_log_pos=$master_log_pos;
        START SLAVE;
        SHOW SLAVE STATUS\\G
      \"" > /tmp/slave_status_alt_$container.log
    fi
  done
  
  # Final verification after a short wait
  sleep 5
  log "Verifying all slaves after reconfiguration:"
  for container in $(docker ps --format '{{.Names}}' | grep 'mariadb-slave'); do
    if [[ "$container" == "$new_master" ]]; then
      continue
    fi
    
    local status=$(docker exec $container mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "SHOW SLAVE STATUS\G")
    local current_master=$(echo "$status" | grep "Master_Host:" | awk '{print $2}')
    log "Final check: $container is replicating from: $current_master"
  done
  
  return 0
}

# Function to update HAProxy configuration
update_haproxy() {
  local new_master=$1
  log "Updating HAProxy configuration to use $new_master as the master..."
  
  # Backup the original config
  cp ./haproxy.cfg ./haproxy.cfg.backup.$(date +%Y%m%d%H%M%S)
  
  # Update the backend mysql_write section to point to the new master
  sed -i "/backend mysql_write/,/server/s|server master.*|server master ${new_master}:3306 check weight 1 maxconn 1000|" ./haproxy.cfg
  
  # Update the master entry in the mysql_read backend
  sed -i "/backend mysql_read/,/server slave/s|server master.*|server master ${new_master}:3306 check weight 1 maxconn 1000|" ./haproxy.cfg
  
  # If the new master was previously a slave, remove it from the slave entries
  # to avoid duplicate server entries
  grep -q "server $new_master" ./haproxy.cfg && sed -i "/server ${new_master}/d" ./haproxy.cfg
  
  # Reload HAProxy configuration
  docker kill -s HUP haproxy
  
  log "HAProxy configuration updated and reloaded"
  return 0
}

# Function to handle the old master when it comes back
handle_old_master() {
  local new_master=$1
  log "Monitoring for old master to come back online..."
  
  # Check if old master is back
  if docker exec mariadb-master mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent &>/dev/null; then
    log "Old master is back online. Configuring it as a slave..."
    
    # Get master status from the new master
    local master_status=$(docker exec $new_master mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW MASTER STATUS\G")
    local master_log_file=$(echo "$master_status" | grep "File:" | awk '{print $2}')
    local master_log_pos=$(echo "$master_status" | grep "Position:" | awk '{print $2}')
    
    # Reset the old master and make it a slave of the new master
    docker exec mariadb-master mysql -u root -p$MYSQL_ROOT_PASSWORD <<EOF
RESET MASTER;
SET GLOBAL read_only = 1;
CHANGE MASTER TO
  MASTER_HOST='$new_master',
  MASTER_USER='$REPLICATION_USER',
  MASTER_PASSWORD='$REPLICATION_PASSWORD',
  MASTER_LOG_FILE='$master_log_file',
  MASTER_LOG_POS=$master_log_pos;
START SLAVE;
EOF
    
    if [ $? -ne 0 ]; then
      log "ERROR: Failed to configure old master as slave"
      return 1
    fi
    
    log "Successfully configured old master as slave of the new master"
    
    # Update HAProxy to add old master as a read-only slave
    log "Updating HAProxy configuration for old master..."

    # First, make sure old master is not in the write backend
    if grep -q "server master mariadb-master:3306" ./haproxy.cfg; then
      log "Removing old master from write backend..."
      sed -i "/server master mariadb-master:3306/d" ./haproxy.cfg
    fi

    # Then add it to the read backend if not already there
    if ! grep -q "server oldmaster mariadb-master:3306" ./haproxy.cfg; then
      log "Adding old master to read backend..."
      sed -i "/backend mysql_read/a\\    server oldmaster mariadb-master:3306 check weight 3 maxconn 800" ./haproxy.cfg
    fi

    # Reload HAProxy configuration
    docker kill -s HUP haproxy
    log "HAProxy configuration updated to include old master as a read-only slave"
    return 0
  else
    log "Old master is still down"
    return 1
  fi
}

# Function to find the best slave for promotion
find_best_slave() {
  log "Finding the best slave for promotion..." >&2
  local best_slave=""
  local min_lag=999999
  local first_healthy_slave=""

  # Get list of slave containers
  for container in $(docker ps --format '{{.Names}}' | grep 'mariadb-slave'); do
    log "Checking slave: $container" >&2
    
    # Check if slave is healthy
    if ! docker exec $container mysqladmin ping -h localhost -u root -p$MYSQL_ROOT_PASSWORD --silent &>/dev/null; then
      log "Slave $container is not healthy, skipping" >&2
      continue
    fi
    
    # Check replication status
    local status=$(docker exec $container mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW SLAVE STATUS\G")
    local io_running=$(echo "$status" | grep "Slave_IO_Running:" | awk '{print $2}')
    local sql_running=$(echo "$status" | grep "Slave_SQL_Running:" | awk '{print $2}')
    
    # Store first healthy slave we find (even if IO_Running is Connecting instead of Yes)
    if [[ -z "$first_healthy_slave" && "$sql_running" == "Yes" ]]; then
      first_healthy_slave=$container
      log "Found first healthy slave: $first_healthy_slave" >&2
    fi
    
    if [[ "$io_running" != "Yes" && "$io_running" != "Connecting" || "$sql_running" != "Yes" ]]; then
      log "Slave $container replication is not healthy (IO: $io_running, SQL: $sql_running), skipping" >&2
      continue
    fi
    
    # Get the replication lag
    local seconds_behind=$(echo "$status" | grep "Seconds_Behind_Master:" | awk '{print $2}')
    
    # If seconds_behind is NULL, just log but don't skip
    if [[ "$seconds_behind" == "NULL" ]]; then
      log "Slave $container has NULL lag, continuing to consider it" >&2
      continue
    fi
    
    log "Slave $container lag: $seconds_behind seconds" >&2
    
    # Choose the slave with the least lag
    if [[ $seconds_behind -lt $min_lag ]]; then
      min_lag=$seconds_behind
      best_slave=$container
    fi
  done
  
  # If we couldn't find a slave with numeric lag, use the first healthy slave we found
  if [[ -z "$best_slave" && -n "$first_healthy_slave" ]]; then
    best_slave=$first_healthy_slave
    log "No slave with numeric lag found. Using first healthy slave: $best_slave" >&2
  fi
  
  if [[ -z "$best_slave" ]]; then
    log "ERROR: No suitable slave found for promotion!" >&2
    return 1
  fi
  
  log "Selected $best_slave as the best candidate for promotion" >&2
  # Only output the container name, nothing else
  echo "$best_slave"
}

# Main function to monitor master and trigger failover
monitor_and_failover() {
  log "Starting MariaDB cluster monitoring..."
  local failures=0
  
  while true; do
    if ! check_master_health; then
      failures=$((failures+1))
      log "Master health check failed ($failures/$MAX_FAILURES)"
      
      if [ $failures -ge $MAX_FAILURES ]; then
        log "CRITICAL: Master node is considered DOWN. Initiating failover procedure..."
        
        # Find the best slave to promote - capture only the container name
        local best_slave=$(find_best_slave)
        if [ $? -ne 0 ] || [ -z "$best_slave" ]; then
          log "ERROR: Failed to find a suitable slave for promotion. Manual intervention required!"
          sleep 60  # Wait before retrying
          continue
        fi
        
        # Store the new master name in a variable
        local new_master="$best_slave"
        
        # Promote the selected slave to be the new master
        if ! promote_slave_to_master "$new_master"; then
          log "ERROR: Failed to promote slave to master. Manual intervention required!"
          sleep 60
          continue
        fi
        
        # Reconfigure remaining slaves to point to the new master
        if ! reconfigure_slaves "$new_master"; then
          log "WARNING: Some slaves might not be properly reconfigured."
        fi
        
        # Update HAProxy configuration
        update_haproxy "$new_master"
        
        log "Failover completed successfully. New master is: $new_master"
        
        # Reset failure counter
        failures=0
        
        # Monitor for the old master coming back online
        log "Will check periodically if old master comes back online..."
        # We don't want to wait here, continue with the main loop
      fi
    else
      # Master is healthy, try to handle old master if we previously had a failover
      if [ "$MASTER_HOST" != "mariadb-master" ]; then
        if handle_old_master "$MASTER_HOST"; then
          log "Old master is now a slave. Continuing monitoring..."
        fi
      fi
      
      # Reset failure counter if master is healthy
      failures=0
    fi
    
    sleep $CHECK_INTERVAL
  done
}

# Execute the main function
monitor_and_failover