# Propuesta de Arquitectura: Eventos, Medicamentos, Vacunas y Calendario

Este documento resume la decisión de diseño y arquitectura acordada para la gestión de **Eventos**, **Medicamentos** y **Vacunas** en la app, así como su visualización en el **Calendario** y el envío de **Notificaciones periódicas**.

---

## 1. El Problema y la Duda Inicial

> **Ejemplo real:** El pediatra receta tomar *Apiretal (2.5 ml)* cada **8 horas durante 7 días**.  
> Eso equivale a **21 tomas en total**.

* **Duda:** ¿Debemos crear 21 filas en la tabla `Event` y 21 filas en la tabla `Notification` en la base de datos?
* **Decisión:** **NO**. Crear una fila por cada toma individual es una mala práctica por las siguientes razones:
  1. **Inconsistencia ante cambios:** Si al día 2 el pediatra retira el medicamento o cambia la dosis, tendríamos que buscar y borrar o actualizar 15 filas futuras en la BD.
  2. **Tratamientos crónicos o continuos:** Si un niño toma vitaminas a diario sin fecha fin, sería imposible crear infinitos eventos futuros en la BD.
  3. **Contaminación de la tabla `Event`:** La base de datos se llenaría de miles de registros repetitivos, ocultando los eventos importantes (citas, cumpleaños, etc.).

---

## 2. La Solución: 1 Registro de Tratamiento + Proyección Virtual

En lugar de guardar cada toma como un evento independiente, **guardamos solo la "Receta" médica**.

### Modelo de Responsabilidades (Una sola fuente de verdad)

| Si el usuario quiere registrar... | Se guarda en la tabla... | Motivo |
| :--- | :--- | :--- |
| **Cita puntual o aviso general** *(Pediatra, revisión, cumple)* | **`Event`** | Ocurre en una fecha y hora fija. |
| **Tratamiento continuo** *(Apiretal cada 8h durante 5 días)* | **`Medicine`** | Requiere dosis, frecuencia horaria, inicio y fin. |
| **Vacuna de la cartilla** *(Meningitis B a los 4 meses)* | **`Vaccine`** | Requiere control de estado (*pendiente* o *aplicada*). |

> ⚠️ **Regla de oro:** Al crear un medicamento o vacuna, **NUNCA** se crea un `Event` duplicado para el primer día. Solo se guarda en su tabla correspondiente (`Medicine` o `Vaccine`).

---

## 3. ¿Cómo funciona el Calendario? (Cálculo Virtual)

El **Calendario no es una tabla de la base de datos**, es una **pantalla** que muestra la foto completa del día.

Cuando el usuario pulsa sobre un día en el calendario (ej: `2026-10-25`):
1. La app móvil llama al backend:
   ```http
   GET /event/guardian/:id?date=2026-10-25
   ```
2. **El Backend unifica los datos al vuelo**:
   * Busca los eventos puntuales de ese día en la tabla `Event`.
   * Busca las vacunas programadas para ese día en `Vaccine` (`scheduledFor == 2026-10-25`).
   * Busca los medicamentos en `Medicine` que estén activos (`startDate <= 2026-10-25 <= endDate`) y **calcula matemáticamente las tomas de ese día** según `intervalHours`.
3. El backend devuelve una **lista unificada** al móvil:
   ```json
   [
     {
       "id": 10,
       "title": "Cita Pediatra - Revisión 6 meses",
       "type": "MEDICAL_APPOINTMENT",
       "time": "10:30"
     },
     {
       "id": 3,
       "title": "Tomar Apiretal (2.5 ml)",
       "type": "MEDICINE",
       "time": "16:00"
     },
     {
       "id": 5,
       "title": "Vacuna Hexavalente",
       "type": "VACCINE",
       "status": "Pendiente"
     }
   ]
   ```
4. El frontend simplemente renderiza cada tarjeta con su icono correspondiente (hospital, pastilla o jeringuilla).

---

## 4. ¿Cómo gestionar las Notificaciones Periódicas?

Para recordar las tomas de medicación sin llenar la tabla `Notification` de filas futuras:

### Opción A (Recomendada): Notificaciones Locales en el Móvil (`expo-notifications`)
El propio sistema operativo del teléfono móvil puede gestionar alarmas periódicas sin conexión a internet y sin sobrecargar el servidor:

```typescript
import * as Notifications from 'expo-notifications';

// Al guardar el medicamento en la app móvil:
if (intervalHours) {
  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Hora de la medicina: ${name}`,
      body: `Administrar ${dosage} a ${child.name}`,
    },
    trigger: {
      seconds: intervalHours * 3600, // Ej: cada 8 horas
      repeats: true,                 // 👈 Se repite automáticamente en el teléfono
    },
  });
}
```

### Opción B: Notificaciones Push desde el Backend (Estrategia "Próxima Toma")
Si se envían mediante el Cron de NestJS (`notifications-scheduler.service.ts`):
* En la tabla `Notification` se guarda **únicamente la próxima toma inmediata**.
* Cuando el Cron la envía con éxito:
  * Comprueba si el medicamento sigue activo (`now < endDate`).
  * Si sigue activo, calcula la siguiente fecha (`scheduledAt + intervalHours`) y crea la siguiente notificación.
* **Resultado:** La base de datos solo almacena 1 notificación pendiente a la vez por medicamento.

---

## 5. Cambios Concretos a Realizar en el Código

### 1. Base de Datos (`backend/prisma/schema.prisma`)
* **No requiere cambios estructurales.** Las tablas `Event`, `Medicine` y `Vaccine` ya tienen los campos necesarios.
* *(Opcional)*: Añadir `notification Boolean @default(true)` en `Medicine` para permitir al usuario activar/desactivar recordatorios por medicamento.

### 2. Backend (`backend/src/event/event.service.ts`)
* Modificar `findEventsForGuardianOnDate`:
  1. Consultar `prisma.event.findMany` para la fecha.
  2. Consultar `prisma.medicine.findMany` activas en esa fecha y calcular sus tomas horarias.
  3. Consultar `prisma.vaccine.findMany` con `scheduledFor` en esa fecha.
  4. Retornar los tres conjuntos combinados en un único array ordenado por hora.

### 3. Frontend (`frontend/src/screens/FamiliaScreen.tsx`)
* En el formulario de añadir medicamento (`AddMedicineScreen`):
  * Añadir el campo opcional **"Fecha de fin del tratamiento"** (`endDate`). Si no se introduce fecha, se considera tratamiento continuo/crónico.

### 4. Frontend (`frontend/src/screens/CalendarioScreen.tsx`)
* Usar el campo `type` (`MEDICINE`, `VACCINE`, `MEDICAL_APPOINTMENT`, `GENERAL`) para mostrar el icono y color adecuado en la tarjeta del evento.

---

## 6. Conclusión y Ventajas

1. **Base de Datos limpia:** Cero filas redundantes; una medicina o vacuna ocupa exactamente 1 fila.
2. **Edición sin efectos secundarios:** Modificar o suspender un medicamento actualiza 1 sola fila y se refleja al instante en todos los días del calendario.
3. **Escalabilidad:** El sistema funciona igual de rápido con 10 o con 10.000 usuarios sin saturar la base de datos de eventos repetitivos.
