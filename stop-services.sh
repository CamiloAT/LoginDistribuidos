#!/bin/bash

# Códigos de color ANSI
NC='\033[0m'       # No Color
RED='\033[0;31m'    # Rojo
GREEN='\033[0;32m'  # Verde
YELLOW='\033[0;33m' # Amarillo
BLUE='\033[0;34m'   # Azul
PURPLE='\033[0;35m' # Púrpura
CYAN='\033[0;36m'   # Cian
WHITE='\033[0;37m'  # Blanco

BOLD='\033[1m'      # Negrita
UNDERLINE='\033[4m' # Subrayado

# Define un array con los nombres de las carpetas que contienen docker-compose.yml
DIRECTORIES=("back" "gallery-images" "sql" "storage-image" "time-microservice")

echo -e "${BOLD}${RED}====================================================${NC}"
echo -e "${BOLD}${RED}=== ${YELLOW}Detenedor de Servicios Docker Compose${RED} ===${NC}"
echo -e "${BOLD}${RED}====================================================${NC}"
echo ""

# Preguntar al usuario si desea eliminar los volúmenes
echo -e "${YELLOW}¿Deseas eliminar los volúmenes asociados?${NC}"
echo -e "${RED}${BOLD}¡ADVERTENCIA: Esto borrará PERMANENTEMENTE CUALQUIER DATO PERSISTENTE en esos volúmenes!${NC}"
read -p "$(echo -e "${BOLD}   (y/N): ${NC}")" remove_volumes_choice

volumes_flag=""
if [[ "$remove_volumes_choice" =~ ^[Yy]$ ]]; then
    volumes_flag="-v"
    echo -e "${RED}🔥 ${GREEN}Se utilizará el flag -v para eliminar los volúmenes asociados.${NC}"
    echo -e "${RED}🔥 ${BOLD}¡DATOS SERÁN BORRADOS!${NC}"
else
    echo -e "${BLUE}ℹ${NC} ${BLUE}No se eliminarán los volúmenes asociados.${NC}"
fi

echo ""

# Iterar sobre cada directorio
for dir in "${DIRECTORIES[@]}"; do
    echo -e "${BOLD}${PURPLE}==================================================${NC}"
    echo -e "${BOLD}${PURPLE}>> ${YELLOW}Procesando directorio:${NC} ${BOLD}${WHITE}$dir${NC}"
    echo -e "${BOLD}${PURPLE}==================================================${NC}"

    if [ -d "$dir" ]; then
        echo -e "${BLUE}Entrando al directorio: ${CYAN}$dir${NC}"
        cd "$dir" || { echo -e "${RED}✗ Error:${NC} ${RED}No se pudo entrar al directorio ${BOLD}$dir${NC}. ${YELLOW}Saltando...${NC}"; echo ""; continue; }

        if [ -f "docker-compose.yml" ]; then
            echo -e "${GREEN}✓ ${NC}Encontrado ${BOLD}docker-compose.yml${NC}. Deteniendo servicios en ${BOLD}$dir${NC}..."
            echo -e "${BOLD}Comando a ejecutar:${NC} ${WHITE}docker-compose down $volumes_flag${NC}"
            docker-compose down $volumes_flag
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Servicios en ${BOLD}$dir${NC} detenidos ${BOLD}correctamente${NC}.${NC}"
            else
                echo -e "${RED}❌ Error al detener servicios en ${BOLD}$dir${NC}. Por favor, ${UNDERLINE}revisa los logs${NC}.${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ ADVERTENCIA:${NC} No se encontró ${BOLD}docker-compose.yml${NC} en ${BOLD}$dir${NC}. ${YELLOW}Saltando...${NC}"
        fi

        # Volver al directorio principal para el siguiente ciclo
        cd ..
        echo "" # Línea en blanco para separar
    else
        echo -e "${YELLOW}⚠ ADVERTENCIA:${NC} El directorio '${BOLD}$dir${NC}' ${RED}no existe${NC}. ${YELLOW}Saltando...${NC}"
        echo "" # Línea en blanco para separar
    fi
done

echo -e "${BOLD}${RED}====================================================${NC}"
echo -e "${BOLD}${RED}=== ${GREEN}Proceso de detención completado${RED} =======${NC}"
echo -e "${BOLD}${RED}====================================================${NC}"
echo ""