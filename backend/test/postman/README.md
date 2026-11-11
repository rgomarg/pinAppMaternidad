# Pruebas de API: RF-01 y RF-02 (Postman + Newman + c8)

Colección: `nanny-rf01-rf02.postman_collection.json` (31 peticiones, 67 comprobaciones).

- **RF-01**: registro de un evento médico con recordatorio.
- **RF-02**: calendario multiperfil por tutor (sin mezclar datos entre tutores).

Los IDs de usuarios y menores se obtienen automáticamente en la carpeta
"0. Preparación", porque cambian cada vez que se ejecuta el seed. La carpeta
"9. Limpieza" borra los eventos creados para poder repetir la ejecución.

## Requisitos

- Docker Desktop en marcha con la base de datos (`docker compose up -d` en la raíz del repo).
- Node.js 20 o superior.
- Newman y c8 se ejecutan con `npx`, sin instalarlos en el proyecto.

## 1. Preparar los datos (borra la base de datos local)

```bash
cd backend
npx prisma db seed
npm run build
```

## 2. Ejecución manual (Postman)

Postman → Import → `nanny-rf01-rf02.postman_collection.json` → botón **Run** sobre la colección.

## 3. Ejecución automática con medida de cobertura

Terminal 1, arranca el backend instrumentado con c8:

```bash
npx c8@10 --reports-dir coverage/api --reporter=text --reporter=html \
  --include "**/src/event/**" --include "**/src/notifications/**" --include "**/src/common/**" \
  node test/postman/coverage-server.js
```

Terminal 2, ejecuta la colección con Newman y genera informes HTML y JUnit:

```bash
npx -p newman@6 -p newman-reporter-htmlextra@1 newman run test/postman/nanny-rf01-rf02.postman_collection.json \
  -r cli,htmlextra,junit \
  --reporter-htmlextra-export coverage/newman/informe-newman.html \
  --reporter-junit-export coverage/newman/resultados.xml
```

Espera al menos un minuto (para que el cron de notificaciones se ejecute) y pulsa
**Ctrl+C** en la terminal 1. c8 imprime la tabla de cobertura y genera
`coverage/api/index.html`.

Resultados en `coverage/` (carpeta ignorada por Git):

| Fichero | Contenido |
|---|---|
| `coverage/newman/informe-newman.html` | Resultado de cada petición y comprobación |
| `coverage/newman/resultados.xml` | Resultados en formato JUnit |
| `coverage/api/index.html` | Cobertura de código línea a línea |
