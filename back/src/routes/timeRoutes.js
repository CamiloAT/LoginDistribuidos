// your-project/back/src/routes/timeRoutes.js
import express from 'express'; // Si usas ES Modules
// const express = require('express'); // Si usas CommonJS

import { getCurrentTime } from '../controllers/timeController.js'; // Asegúrate de la ruta correcta
// const { getCurrentTime } = require('../controllers/timeController'); // Si usas CommonJS

const router = express.Router();

// Define la ruta GET para obtener la hora
router.get('/current', getCurrentTime); // Puedes acceder a esto vía /api/time/current (si lo mapeas así)

export default router; // Si usas ES Modules
// module.exports = router; // Si usas CommonJS