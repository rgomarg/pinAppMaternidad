// Validación completa de RF-01 con un solo comando (npm run validacion:rf01):
//   1. Arranca el backend compilado bajo c8 para medir la cobertura.
//   2. Espera a que responda.
//   3. Ejecuta la colección de Postman con Newman.
//   4. Espera a que el cron de notificaciones se ejecute al menos una vez.
//   5. Para el backend; c8 imprime la tabla de cobertura y genera el informe HTML.
//
// Requisitos previos: base de datos en marcha, seed cargado y `npm run build`.
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', '..');
const baseUrl = 'http://localhost:3000';
const stopFile = path.join(backendDir, 'coverage', '.stop-backend');
const cronWaitSeconds = Number(process.env.CRON_WAIT ?? 65);

const C8 =
  'npx c8@10 --reports-dir coverage/api --reporter=text --reporter=html ' +
  '--include "**/src/event/**" --include "**/src/notifications/**" ' +
  'node test/postman/coverage-server.js';

const NEWMAN =
  'npx -p newman@6 -p newman-reporter-htmlextra@1 newman run ' +
  'test/postman/nanny-rf01.postman_collection.json ' +
  '-r cli,htmlextra --reporter-htmlextra-export coverage/newman/informe-newman.html';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function backendResponde() {
  try {
    await fetch(`${baseUrl}/event/0`);
    return true;
  } catch {
    return false;
  }
}

function ejecutar(comando, env = process.env) {
  return spawn(comando, { cwd: backendDir, shell: true, stdio: 'inherit', env });
}

async function main() {
  if (!fs.existsSync(path.join(backendDir, 'dist', 'src', 'main.js'))) {
    console.error('No existe dist/src/main.js. Ejecuta antes: npm run build');
    process.exit(1);
  }
  if (await backendResponde()) {
    console.error(`Ya hay algo escuchando en ${baseUrl}. Cierra el otro backend y vuelve a intentarlo.`);
    process.exit(1);
  }

  // Se borra el informe anterior para que no queden ficheros de otras ejecuciones.
  fs.rmSync(path.join(backendDir, 'coverage', 'api'), { recursive: true, force: true });
  fs.mkdirSync(path.dirname(stopFile), { recursive: true });
  fs.rmSync(stopFile, { force: true });

  console.log('\n[1/4] Arrancando el backend con c8...');
  const backend = ejecutar(C8, { ...process.env, STOP_FILE: stopFile });
  const backendTerminado = new Promise((r) => backend.on('exit', r));

  let listo = false;
  for (let i = 0; i < 60 && !listo; i++) {
    await sleep(1000);
    listo = await backendResponde();
  }
  if (!listo) {
    console.error('El backend no ha arrancado en 60 s. ¿Está encendida la base de datos (docker compose up -d)?');
    fs.writeFileSync(stopFile, '');
    await backendTerminado;
    process.exit(1);
  }

  console.log('\n[2/4] Ejecutando la colección de RF-01 con Newman...');
  const newman = ejecutar(NEWMAN);
  const codigoNewman = await new Promise((r) => newman.on('exit', r));

  console.log(`\n[3/4] Esperando ${cronWaitSeconds} s para que el cron de notificaciones se ejecute...`);
  await sleep(cronWaitSeconds * 1000);

  console.log('\n[4/4] Parando el backend y generando la cobertura...');
  fs.writeFileSync(stopFile, '');
  await backendTerminado;
  fs.rmSync(stopFile, { force: true });

  console.log('\nInformes generados:');
  console.log('  - Resultado de las pruebas: coverage/newman/informe-newman.html');
  console.log('  - Cobertura de código:      coverage/api/index.html');
  if (codigoNewman !== 0) {
    console.log('\nNewman ha encontrado pruebas fallidas (detalle en el informe HTML).');
  }
  process.exit(codigoNewman);
}

main();
