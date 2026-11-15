# Validación de RF-01 (Postman + Newman + c8)

**RF-01:** registrar un evento médico con recordatorio para un menor.

Colección: `nanny-rf01.postman_collection.json` (20 peticiones, 39 comprobaciones).

| Carpeta | Contenido |
|---|---|
| 0. Preparación | Busca a la tutora del seed (Laura) y a sus hijos (Leo e Inés) y guarda sus IDs en variables, porque cambian cada vez que se ejecuta el seed |
| RF-01 | Los 14 casos de prueba (PA-01 … PA-13b) |
| 9. Limpieza | Borra los eventos creados para poder repetir la ejecución |

La validación prueba solo el backend a través de su API. Se supone que la base
de datos y el servicio de notificaciones push (Expo) funcionan correctamente.

## Requisitos (una sola vez por ordenador)

- Git, Node.js 24 y Docker Desktop.
- Fichero `backend/.env` (no está en Git) con esta línea:

  ```
  DATABASE_URL="postgresql://root:rootpassword@localhost:5432/maternidad_db?schema=public"
  ```

- Dependencias del backend:

  ```
  cd backend
  npm install
  npx prisma generate
  ```

Newman y c8 se descargan solos con `npx`; no hace falta instalarlos.

## Ejecución

Con Docker Desktop abierto, desde la raíz del repositorio:

```
docker compose up -d
cd backend
npx prisma migrate deploy
npx prisma db seed
npm run validacion:rf01
```

> `npx prisma db seed` **borra la base de datos local** y carga los datos de prueba.

`npm run validacion:rf01` compila el backend, lo arranca bajo c8, ejecuta la
colección con Newman, espera 65 s a que el cron de notificaciones se ejecute y
para el backend. Tarda unos 2 minutos. Al terminar, c8 muestra la tabla de
cobertura en la terminal.

Si Newman encuentra pruebas fallidas, npm termina con un mensaje de error. Es lo
esperado mientras los bugs de RF-01 no estén corregidos.

Para repetir la validación, vuelve a ejecutar `npx prisma db seed` y
`npm run validacion:rf01`.

## Resultados (carpeta `backend/coverage/`, ignorada por Git)

| Fichero | Contenido |
|---|---|
| `coverage/newman/informe-newman.html` | Resultado de cada prueba: petición, respuesta y comprobaciones |
| `coverage/api/index.html` | Cobertura de código línea a línea (verde ejecutado, rojo no) |

## Ejecución por partes (opcional)

Para ver cada paso por separado, en lugar de `npm run validacion:rf01`:

```
npm run build
```

Terminal 1, backend con c8:

```
npx c8@10 --reports-dir coverage/api --reporter=text --reporter=html --include "**/src/event/**" --include "**/src/notifications/**" node test/postman/coverage-server.js
```

Terminal 2, solo las pruebas (Newman):

```
npm run test:rf01
```

Espera un minuto y pulsa **Ctrl+C** en la terminal 1 para que c8 genere la cobertura.

También se puede importar `nanny-rf01.postman_collection.json` en Postman
(Import → Run) para lanzar las pruebas a mano con el backend arrancado.

## Ficheros

| Fichero | Para qué sirve |
|---|---|
| `nanny-rf01.postman_collection.json` | Los casos de prueba y sus comprobaciones |
| `run-rf01.js` | Lanza backend + c8 + Newman y lo para todo al final |
| `coverage-server.js` | Arranca el backend compilado y lo cierra de forma ordenada para que c8 guarde los datos |
