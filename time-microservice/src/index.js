const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const moment = require('moment-timezone');

// La ruta al .proto ahora es relativa a la raíz del WORKDIR (/app)
// Desde src/index.js: '..' sube a /app, luego 'protos' entra en /app/protos
const PROTO_PATH = path.join(__dirname, '..', 'protos', 'time.proto'); // <--- ¡CAMBIO AQUÍ!

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });
const time_proto = grpc.loadPackageDefinition(packageDefinition).time_service;

function getCurrentTime(call, callback) {
  const now = moment().tz('America/Bogota'); // Obtiene la hora actual en la zona horaria de Colombia
  callback(null, { currentTime: now.format() }); // Devuelve la hora en formato ISO
}

function main() {
  const server = new grpc.Server();
  server.addService(time_proto.TimeService.service, { getCurrentTime: getCurrentTime });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    server.start();
    console.log('gRPC server running on port 50051');
  });
}

main();