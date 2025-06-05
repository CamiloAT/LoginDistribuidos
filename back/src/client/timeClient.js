// your-project/back/src/clients/timeClient.js
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path'; // Importa el módulo 'path'
import { fileURLToPath } from 'url'; // Importa fileURLToPath del módulo 'url'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Current directory:", __dirname); // Verifica el directorio actual

const PROTO_PATH = path.join(__dirname, '..', '..', 'time-microservice', 'protos', 'time.proto');

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);

const time_proto = grpc.loadPackageDefinition(packageDefinition).time_service;

const TIME_MICROSERVICE_ADDRESS = process.env.TIME_MICROSERVICE_HOST;

const client = new time_proto.TimeService(TIME_MICROSERVICE_ADDRESS, grpc.credentials.createInsecure());

export const getMicroserviceCurrentTime = () => {
    return new Promise((resolve, reject) => {
        client.GetCurrentTime({}, (error, response) => {
            if (error) {
                console.error("Error al llamar al microservicio de la hora:", error.details || error.message, error.code);
                return reject(error);
            }
            resolve(response.currentTime);
        });
    });
};