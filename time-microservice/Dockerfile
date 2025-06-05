# Usa una imagen base de Node.js ligera y optimizada para producción
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos package.json y package-lock.json para instalar las dependencias
COPY package*.json ./

# Instala las dependencias del proyecto (asegúrate de que @grpc/grpc-js, google-protobuf y @grpc/proto-loader estén instalados)
RUN npm install --production

# Copia la carpeta 'protos' completa al directorio de trabajo
COPY protos/ ./protos/

# Copia el resto del código de la aplicación
COPY src/ ./src/

# Expone el puerto en el que el microservicio escuchará
EXPOSE 50051

# Comando para iniciar el microservicio cuando el contenedor se inicie
CMD [ "node", "src/index.js" ]