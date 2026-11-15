# Falta por hacer – AVD

**Entrega:** 27 de noviembre

- [ ] **1. Memoria: resultados obtenidos (2.3)**
  - [ ] Hacer una ejecución "oficial" (`npx prisma db seed` + `npm run validacion:rf01`) y guardar los informes en la carpeta común, con fecha (`resultados-rf01-AAAA-MM-DD`).
  - [ ] Capturas del resumen de Newman y de la tabla de cobertura de c8.
  - [ ] Explicar por qué falla cada prueba (PA-05, PA-06, PA-07).
  - [ ] Explicar cómo se ha arreglado cada bug.
  - [ ] Volver a ejecutar tras los arreglos, guardar los informes (`resultados-rf01-tras-arreglos`) y mostrar que ahora pasan.
  - [ ] Comparar antes/después: pruebas superadas y % de cobertura.

- [ ] **2. Arreglar los bugs de RF-01** (cambia código de la app: decidirlo en equipo)
  - [ ] PA-05: se aceptan recordatorios en una fecha pasada (devuelve 201, debería ser 400).
  - [ ] PA-06: un menor que no existe da un error interno 500 (debería ser 400 o 404).
  - [ ] PA-07: `POST /notifications` siempre devuelve 400 (debería ser 201).

- [ ] **3. Mejorar la cobertura**
  - [ ] a) Arreglar el bug de PA-07. Ahora `POST /notifications` se rechaza antes de llegar al servicio, así que el código que guarda el recordatorio no se ejecuta nunca. Al arreglarlo, se cubrirá solo y subirá la cobertura de `notifications.service.ts` y de su controlador. En el 2.3 se puede poner: "antes del arreglo X %, después Y %".
  - [ ] b) (Opcional, decidir) Añadir un caso que compruebe con `GET /event` que el evento creado aparece en el listado (postcondición de RF-01). Cubriría las líneas 34-47 de `event.service.ts`.

- [ ] **4. Explicar en los resultados el porqué de la cobertura**
  > Las líneas no cubiertas de `event.service.ts` corresponden a la consulta del calendario por tutor (RF-02), fuera del alcance de esta validación. El envío a Expo no se cubre porque depende del servicio externo, que se ha considerado un supuesto. Las funciones que implementan RF-01 alcanzan el 100 % de cobertura.

- [ ] **5. Revisar la memoria (2.1 y 2.2)**
  - [ ] En el comando de Newman, el fichero se llama ahora `nanny-rf01.postman_collection.json`.
  - [ ] Añadir la tabla de casos de prueba en el Anexo (Tabla 1), ya que el 2.2 la menciona.
  - [ ] Añadir la nota a pie de página de "source maps".
  - [ ] Indicar el límite de la validación: solo se prueba el backend; la app móvil no se prueba de forma automática.
  - [ ] Comprobar que nadie menciona Keploy como herramienta usada (el profesor dijo que con Newman + c8 basta).

- [ ] **6. Requisitos no funcionales**
  - [ ] TODO
