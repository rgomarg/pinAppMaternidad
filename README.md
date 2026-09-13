# Guía de Configuración y Desarrollo: pinAppMaternidad

Esta guía contiene todo lo necesario para clonar el repositorio, levantar la arquitectura y comenzar a desarrollar. 

## 1. Estado de la Arquitectura

El proyecto utiliza un enfoque híbrido para maximizar la compatibilidad con los editores de código (TypeScript/Autocompletado) y garantizar la consistencia de los datos:

| Capa | Tecnología | Entorno de Ejecución | Notas |
| :--- | :--- | :--- | :--- |
| **Base de Datos** | PostgreSQL 15 | **Docker** | Contenedor aislado. Los datos persisten en un volumen local. |
| **Backend** | NestJS + Prisma (v5) | **Local (Node.js)** | Requiere Node 18+. Expuesto en `localhost:3000`. |
| **Frontend** | React Native (Expo) | **Local (Node.js)** | Expuesto por el puerto `8081`. Conexión vía Expo Go. |

## 2. Requisitos Previos (Para todo el equipo)

Antes de clonar el código, cada miembro del equipo debe tener instalado:
* **Git** configurado con su cuenta de GitHub.
* **Node.js** (versión 18 o superior).
* **Docker Desktop** (En Windows, es obligatorio tener marcada la opción "Use the WSL 2 based engine" en los ajustes).
* **Expo Go** instalada en el teléfono móvil físico.
* Cuenta registrada en expo.dev.

## 3. Instalación y Primer Arranque

**Paso 1: Clonar el repositorio**
Abrid vuestra terminal en la carpeta donde queráis guardar el proyecto y ejecutad:

    git clone https://github.com/rgomarg/pinAppMaternidad.git
    cd pinAppMaternidad

**Paso 2: Levantar la Base de Datos**
Los contenedores se gestionan desde el archivo `docker-compose.yml` de la raíz. Para descargar la imagen de PostgreSQL y encender la base de datos en segundo plano, ejecutad:

    docker compose up -d

**Paso 3: Inicializar el Backend**
Entrad en la carpeta del servidor, instalad las dependencias y sincronizad el esquema de Prisma con el contenedor de Docker:

    cd backend
    npm install
    npx prisma db push

**Paso 4: Inicializar el Frontend**
Abrid una nueva pestaña en la terminal (manteniendo el backend disponible), entrad al frontend e instalad las dependencias:

    cd frontend
    npm install

## 4. Ejecución Diaria

Cada vez que os sentéis a programar, debéis levantar el entorno de desarrollo abriendo dos terminales independientes.


**Lanzar los contenedores de Docker:**
Importante tener abierto docker desktop primero. Con esto lanzamos la BD y los contenedores de docker

    docker compose up -d


**Terminal 1 (Backend):**

    cd backend
    npm run start:dev

**Terminal 2 (Frontend):**

    cd frontend
    npx expo start --tunnel

*(Nota para usuarios de Windows: Utilizamos la bandera `--tunnel` para evitar que el Firewall de Windows bloquee la conexión con el teléfono móvil).* Escanead el código QR generado en esta terminal con la app **Expo Go** de vuestro móvil.

**Cerrar contenedores y terminales:**
Cerrar los terminales con **Ctrl + C** y en uno hacer:

    docker compose down

## 5. Gestión de Base de Datos (Prisma)

Toda la estructura de tablas se encuentra en `backend/prisma/schema.prisma`. 
* **Para ver los datos:** Si queréis consultar, añadir o borrar filas manualmente, abrid una terminal en `backend` y ejecutad `npx prisma studio`. Se abrirá un panel de control en el navegador.
* **Para modificar tablas:** Si un compañero añade nuevas tablas y hace *pull*, o si vosotros mismos modificáis el `schema.prisma`, **siempre** debéis ejecutar `npx prisma db push` para que los cambios se apliquen a vuestro Docker local.

## 6. Flujo de Trabajo (Git)

La rama `main` está protegida. Todo el desarrollo se hace en ramas separadas.
1. Asegúrate de estar actualizado: `git checkout main` seguido de `git pull`.
2. Crea una rama para tu tarea: `git checkout -b feature/nombre-tarea`.
3. Desarrolla, guarda y haz commit: `git add .` y `git commit -m "feat: descripción de los cambios"`.
4. Sube tu rama: `git push -u origin feature/nombre-tarea`.
5. Abre un *Pull Request* en GitHub para que otro compañero revise el código antes de fusionarlo.

## 7. Expo Go (Aplicación movil para ver cambios front)
Hay que instalarse la aplicación de **Expo go** en el movil. Habrá que registrarse tanto en un navegador como en el movil osea que mi recomendación de pasos:
1. Entrar en el /frontend y poner: **npx expo login -b** (-b de browser). Hacer login con github para que este todo conectado a lo mismo.
2. Desde la cuenta en el browsere a la izquierda abajo sale vuestro perfil, darle y darle a **User Settings**. 
3. En Sing-in methods añadir una contraseña.
4. Ahora desde el movil abrir la aplicación. Ir al perfil y darle al login con el **correo de github** y la **contraseña de antes** que hayais puesto
5. Ahora en el front poner **npx expo start** y desde el movil os saldrá ahora en la aplicación directamente como la conexión a este front.
6. Dejar que cargue la primera vez y os tiene que salir un fondo blanco con una frase y en el terminal saldrá que se ha conectado un IOS o android según vuestro movil.