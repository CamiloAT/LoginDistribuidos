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

echo -e "${BOLD}${BLUE}====================================================${NC}"
echo -e "${BOLD}${BLUE}=== ${CYAN}Iniciador de Servicios Docker Compose${BLUE} ===${NC}"
echo -e "${BOLD}${BLUE}====================================================${NC}"
echo ""

# Preguntar al usuario si desea reconstruir las imágenes
echo -e "${YELLOW}¿Deseas reconstruir las imágenes de Docker (usar el flag --build)?${NC}"
read -p "$(echo -e "${BOLD}   (y/N): ${NC}")" rebuild_choice

rebuild_flag=""
if [[ "$rebuild_choice" =~ ^[Yy]$ ]]; then
    rebuild_flag="--build"
    echo -e "${GREEN}✓${NC} ${GREEN}Se utilizará el flag --build para reconstruir las imágenes.${NC}"
else
    echo -e "${BLUE}ℹ${NC} ${BLUE}No se reconstruirán las imágenes (solo se levantarán los servicios existentes).${NC}"
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
            echo -e "${GREEN}✓ ${NC}Encontrado ${BOLD}docker-compose.yml${NC}. Levantando servicios en ${BOLD}$dir${NC}..."
            echo -e "${BOLD}Comando a ejecutar:${NC} ${WHITE}docker-compose up -d $rebuild_flag${NC}"
            docker-compose up -d $rebuild_flag
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✨ Servicios en ${BOLD}$dir${NC} levantados ${BOLD}correctamente${NC}.${NC}"
            else
                echo -e "${RED}❌ Error al levantar servicios en ${BOLD}$dir${NC}. Por favor, ${UNDERLINE}revisa los logs${NC}.${NC}"
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

echo -e "${BOLD}${BLUE}====================================================${NC}"
echo -e "${BOLD}${BLUE}=== ${GREEN}Proceso de inicio completado${BLUE} =========${NC}"
echo -e "${BOLD}${BLUE}====================================================${NC}"
echo ""