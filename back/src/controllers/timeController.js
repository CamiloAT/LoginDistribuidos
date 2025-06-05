import { getMicroserviceCurrentTime } from '../client/timeClient.js';

export const getCurrentTime = async (req, res) => {
    try {
        const currentTime = await getMicroserviceCurrentTime();

        // Envía una respuesta exitosa con la hora obtenida
        res.status(200).json({
            message: 'Hora actual obtenida exitosamente del microservicio',
            currentTime: currentTime
        });
    } catch (error) {
        console.error('Error en el controlador al obtener la hora del microservicio:', error);
        res.status(500).json({
            message: 'Error interno del servidor al obtener la hora',
            error: error.message || 'Error desconocido' // Muestra el mensaje de error o uno genérico
        });
    }
};