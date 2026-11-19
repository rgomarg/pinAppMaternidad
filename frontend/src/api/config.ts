//CAMBIAR IP PARA PODER HACER LLAMADAS AL PORTATIL.
<<<<<<< HEAD
const LOCAL_IP = '192.168.1.136'; // Cámbiala si tu IP cambia
=======
const LOCAL_IP = '172.20.10.4'; // Cámbiala si tu IP cambia

>>>>>>> origin/main
const PORT = 3000;

export const API_URL = `http://${LOCAL_IP}:${PORT}`;

// En el futuro, cuando la app esté en producción (subida a internet),
// puedes hacer algo como esto:
// export const API_URL = process.env.NODE_ENV === 'production' 
//    ? 'https://mi-backend-real.com' 
//    : `http://${LOCAL_IP}:${PORT}`;
