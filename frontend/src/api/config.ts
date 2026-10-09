//CAMBIAR IP PARA PODER HACER LLAMADAS AL PORTATIL.
const LOCAL_IP = '192.168.1.144'; // Cámbiala si tu IP cambia
const PORT = 3000;

export const API_URL = `http://${LOCAL_IP}:${PORT}`;

// En el futuro, cuando la app esté en producción (subida a internet),
// puedes hacer algo como esto:
// export const API_URL = process.env.NODE_ENV === 'production' 
//    ? 'https://mi-backend-real.com' 
//    : `http://${LOCAL_IP}:${PORT}`;
