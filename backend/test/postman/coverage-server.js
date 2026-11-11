// Arranca el backend compilado (dist) para medir su cobertura con c8 mientras
// Newman ejecuta la colección de Postman.
//
// c8 solo escribe los datos de cobertura cuando el proceso termina de forma
// ordenada, así que este script cierra el servidor con process.exit(0):
//   - al pulsar Ctrl+C en la terminal (SIGINT), o
//   - cuando aparece el fichero indicado en STOP_FILE (útil para scripts).
//
// Uso:  npx c8 node test/postman/coverage-server.js
const fs = require('fs');
const path = require('path');

const stop = () => process.exit(0);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const stopFile = process.env.STOP_FILE;
if (stopFile) {
  setInterval(() => {
    if (fs.existsSync(stopFile)) stop();
  }, 500);
}

require(path.join(__dirname, '..', '..', 'dist', 'src', 'main.js'));
