/**
 * Validación automática de latencia de notificaciones (RNF-01, escenarios PR-01 a PR-09).
 *
 * Uso:
 *   npm run validacion:rnf01
 *
 * Variables de entorno opcionales:
 *   RNF01_REPS=N         Sobrescribe el número de repeticiones de todos los escenarios (útil para pruebas rápidas).
 *   RNF01_SCENARIOS=PR-01,PR-03  Ejecuta solo los escenarios indicados.
 *   RNF01_WAIT_TIMEOUT=75000     Tiempo máximo (ms) esperando al scheduler en cada repetición (por defecto 75000).
 *
 * Requisitos previos: base de datos en marcha, seed cargado y `npm run build` (lo lanza `validacion:rnf01`).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const backendDir = path.join(__dirname, '..', '..');
const baseUrl = 'http://localhost:3000';
const stopFile = path.join(backendDir, 'coverage', '.stop-backend-rnf01');
const outDir = path.join(backendDir, 'coverage', 'latency');
const waitTimeoutMs = Number(process.env.RNF01_WAIT_TIMEOUT ?? 75000);
const overrideReps = process.env.RNF01_REPS ? Number(process.env.RNF01_REPS) : null;
const onlyScenarios = process.env.RNF01_SCENARIOS
  ? new Set(process.env.RNF01_SCENARIOS.split(',').map((s) => s.trim()))
  : null;

const prisma = new PrismaClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENARIOS = [
  { id: 'PR-01', name: 'Línea base (1 recordatorio)', reps: 20 },
  { id: 'PR-02', name: 'Valor límite (ahora + 5s)', reps: 20 },
  { id: 'PR-03', name: 'Ráfaga pequeña (10 simultáneos)', reps: 10 },
  { id: 'PR-04', name: 'Ráfaga media (50 simultáneos)', reps: 10 },
  { id: 'PR-05', name: 'Ráfaga grande (150 simultáneos)', reps: 10 },
  { id: 'PR-06', name: 'Carga sostenida (1/s durante 60s)', reps: 5 },
  { id: 'PR-07', name: 'Solapamiento (50 en T y 50 en T+1s)', reps: 10 },
  { id: 'PR-08', name: 'Tráfico concurrente API + 10 recordatorios', reps: 10 },
  { id: 'PR-09', name: 'Recordatorio desactivado antes de vencer', reps: 10 },
];

async function backendResponde() {
  try {
    await fetch(`${baseUrl}/event/0`);
    return true;
  } catch {
    return false;
  }
}

async function apiJson(method, endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${endpoint} -> ${res.status}: ${text}`);
  }
  return res.json();
}

async function createEventWithNotification({ userId, childId, title, scheduledAt, notification = true }) {
  const event = await apiJson('POST', '/event', {
    title,
    date: scheduledAt.toISOString(),
    notification,
    childId,
  });
  let notif = null;
  if (notification) {
    notif = await apiJson('POST', '/notifications', {
      title: `Recordatorio: ${title}`,
      body: 'Prueba de latencia RNF-01',
      scheduledAt: scheduledAt.toISOString(),
      userId,
      type: 'EVENT',
      eventId: event.id,
    });
  }
  return { eventId: event.id, notificationId: notif ? notif.id : null };
}

async function waitUntilAllSent(notificationIds, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await prisma.notification.findMany({
      where: { id: { in: notificationIds } },
      select: { id: true, status: true, scheduledAt: true, sentAt: true },
    });
    const pendingCount = rows.filter((r) => r.status === 'PENDING').length;
    if (pendingCount === 0) {
      return rows;
    }
    await sleep(250);
  }
  throw new Error(`Timeout (${timeoutMs} ms) esperando a que se procesen ${notificationIds.length} notificaciones.`);
}

async function cleanupEvents(eventIds) {
  if (!eventIds.length) return;
  await prisma.notification.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function summarize(id, name, latenciesMs, discardedReps, extra = {}) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = n ? Math.round(sorted.reduce((s, v) => s + v, 0) / n) : 0;
  const median = n ? Math.round(percentile(sorted, 50)) : 0;
  const p95 = n ? Math.round(percentile(sorted, 95)) : 0;
  const p99 = n ? Math.round(percentile(sorted, 99)) : 0;
  const max = n ? Math.round(sorted[n - 1]) : 0;
  const within2sPct = n ? Number(((sorted.filter((v) => v <= 2000).length / n) * 100).toFixed(2)) : 0;
  const passes = n > 0 && p95 <= 2000;
  return {
    id,
    name,
    n,
    discardedReps,
    meanMs: mean,
    medianMs: median,
    p95Ms: p95,
    p99Ms: p99,
    maxMs: max,
    within2sPct,
    passes,
    ...extra,
  };
}

async function runBurst({ userId, childId, count, offsetMs, tag }) {
  const scheduledAt = new Date(Date.now() + offsetMs);
  const created = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      createEventWithNotification({
        userId,
        childId,
        title: `[RNF01-${tag}] Evento ${i + 1}`,
        scheduledAt,
      }),
    ),
  );
  const eventIds = created.map((c) => c.eventId);
  const notifIds = created.map((c) => c.notificationId);
  try {
    const rows = await waitUntilAllSent(notifIds, waitTimeoutMs);
    const failed = rows.filter((r) => r.status !== 'SENT' || !r.sentAt);
    if (failed.length > 0) {
      throw new Error(`${failed.length} notificaciones quedaron en estado distinto de SENT`);
    }
    return rows.map((r) => r.sentAt.getTime() - r.scheduledAt.getTime());
  } finally {
    await cleanupEvents(eventIds);
  }
}

async function executeScenario(scenario, ctx) {
  const reps = overrideReps ?? scenario.reps;
  const allLatencies = [];
  let discardedReps = 0;

  if (scenario.id === 'PR-09') {
    let cancelledCorrectly = 0;
    for (let r = 1; r <= reps; r++) {
      process.stdout.write(`  [${scenario.id}] Repetición ${r}/${reps}...\r`);
      const pendingBefore = await prisma.notification.count({ where: { status: 'PENDING' } });
      if (pendingBefore > 0) {
        discardedReps++;
        await prisma.notification.deleteMany({ where: { status: 'PENDING' } });
      }
      const scheduledAt = new Date(Date.now() + 4000);
      const { eventId, notificationId } = await createEventWithNotification({
        userId: ctx.userId,
        childId: ctx.childId,
        title: `[RNF01-PR09] Cancelación ${r}`,
        scheduledAt,
      });
      await apiJson('PATCH', `/event/${eventId}`, { notification: false });
      await sleep(5000);
      const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
      if (notif && notif.status === 'CANCELLED' && !notif.sentAt) {
        cancelledCorrectly++;
      }
      await cleanupEvents([eventId]);
    }
    console.log(`\n  [${scenario.id}] Completado: ${cancelledCorrectly}/${reps} cancelados sin envío.`);
    return {
      id: scenario.id,
      name: scenario.name,
      n: reps,
      discardedReps,
      cancelledCorrectly,
      passes: cancelledCorrectly === reps,
    };
  }

  for (let r = 1; r <= reps; r++) {
    process.stdout.write(`  [${scenario.id}] Repetición ${r}/${reps}...\r`);
    // 3.2.1.4: descartar/limpiar si quedaron restos pendientes de ejecuciones previas
    const leftover = await prisma.notification.count({ where: { status: 'PENDING' } });
    if (leftover > 0) {
      discardedReps++;
      await prisma.notification.deleteMany({ where: { status: 'PENDING' } });
    }

    let latencies = [];
    if (scenario.id === 'PR-01') {
      latencies = await runBurst({ ...ctx, count: 1, offsetMs: 3000, tag: 'PR01' });
    } else if (scenario.id === 'PR-02') {
      latencies = await runBurst({ ...ctx, count: 1, offsetMs: 5000, tag: 'PR02' });
    } else if (scenario.id === 'PR-03') {
      latencies = await runBurst({ ...ctx, count: 10, offsetMs: 4000, tag: 'PR03' });
    } else if (scenario.id === 'PR-04') {
      latencies = await runBurst({ ...ctx, count: 50, offsetMs: 5000, tag: 'PR04' });
    } else if (scenario.id === 'PR-05') {
      latencies = await runBurst({ ...ctx, count: 150, offsetMs: 7000, tag: 'PR05' });
    } else if (scenario.id === 'PR-06') {
      const eventIds = [];
      const notifIds = [];
      try {
        for (let s = 0; s < 60; s++) {
          const scheduledAt = new Date(Date.now() + 2000);
          const created = await createEventWithNotification({
            userId: ctx.userId,
            childId: ctx.childId,
            title: `[RNF01-PR06] Sostenido ${s + 1}`,
            scheduledAt,
          });
          eventIds.push(created.eventId);
          notifIds.push(created.notificationId);
          await sleep(1000);
        }
        const rows = await waitUntilAllSent(notifIds, waitTimeoutMs);
        latencies = rows.map((row) => row.sentAt.getTime() - row.scheduledAt.getTime());
      } finally {
        await cleanupEvents(eventIds);
      }
    } else if (scenario.id === 'PR-07') {
      const t0 = Date.now() + 5000;
      const t1 = t0 + 1000;
      const batchA = Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          createEventWithNotification({
            userId: ctx.userId,
            childId: ctx.childId,
            title: `[RNF01-PR07-A] ${i + 1}`,
            scheduledAt: new Date(t0),
          }),
        ),
      );
      const batchB = Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          createEventWithNotification({
            userId: ctx.userId,
            childId: ctx.childId,
            title: `[RNF01-PR07-B] ${i + 1}`,
            scheduledAt: new Date(t1),
          }),
        ),
      );
      const created = [...(await batchA), ...(await batchB)];
      const eventIds = created.map((c) => c.eventId);
      const notifIds = created.map((c) => c.notificationId);
      try {
        const rows = await waitUntilAllSent(notifIds, waitTimeoutMs);
        latencies = rows.map((row) => row.sentAt.getTime() - row.scheduledAt.getTime());
      } finally {
        await cleanupEvents(eventIds);
      }
    } else if (scenario.id === 'PR-08') {
      let running = true;
      const trafficLoop = (async () => {
        while (running) {
          await Promise.all([
            fetch(`${baseUrl}/user/${ctx.userId}`).catch(() => {}),
            fetch(`${baseUrl}/event`).catch(() => {}),
          ]);
          await sleep(100);
        }
      })();
      try {
        latencies = await runBurst({ ...ctx, count: 10, offsetMs: 4000, tag: 'PR08' });
      } finally {
        running = false;
        await trafficLoop;
      }
    }

    allLatencies.push(...latencies);
  }

  const summary = summarize(scenario.id, scenario.name, allLatencies, discardedReps);
  console.log(
    `\n  [${scenario.id}] n=${summary.n} | media=${summary.meanMs}ms | med=${summary.medianMs}ms | p95=${summary.p95Ms}ms | p99=${summary.p99Ms}ms | max=${summary.maxMs}ms | <=2s=${summary.within2sPct}% | cumple=${summary.passes ? 'SI' : 'NO'}`,
  );
  return summary;
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

  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(stopFile, { force: true });

  console.log('\n[1/4] Arrancando el backend con MOCK_EXPO=true...');
  const backend = spawn('node test/postman/coverage-server.js', {
    cwd: backendDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, MOCK_EXPO: 'true', STOP_FILE: stopFile },
  });
  const backendTerminado = new Promise((r) => backend.on('exit', r));

  const logStream = fs.createWriteStream(path.join(outDir, 'scheduler-logs.txt'));
  backend.stdout.pipe(logStream);
  backend.stderr.pipe(logStream);

  let listo = false;
  for (let i = 0; i < 60 && !listo; i++) {
    await sleep(1000);
    listo = await backendResponde();
  }
  if (!listo) {
    console.error('El backend no ha arrancado en 60 s.');
    fs.writeFileSync(stopFile, '');
    await backendTerminado;
    process.exit(1);
  }

  // 2. Preparación dinámica: buscar un usuario con al menos 1 hijo y asegurar token Expo válido
  console.log('[2/4] Preparando usuario y menor de prueba...');
  let userWithChild = null;
  let previousToken = null;
  const results = [];

  try {
    userWithChild = await prisma.user.findFirst({
      where: { children: { some: {} } },
      include: { children: true },
    });
    if (!userWithChild) {
      throw new Error('No hay usuarios con hijos en la BD. Ejecuta antes: npx prisma db seed');
    }
    previousToken = userWithChild.pushToken;
    await apiJson('POST', '/notifications/token', {
      userId: userWithChild.id,
      pushToken: 'ExponentPushToken[rnf01-latency-test]',
    });

    // Limpiar notificaciones PENDING previas para partir de estado limpio
    await prisma.notification.deleteMany({ where: { status: 'PENDING' } });

    const ctx = { userId: userWithChild.id, childId: userWithChild.children[0].id };

    console.log('[3/4] Ejecutando escenarios de latencia...');
    for (const scenario of SCENARIOS) {
      if (onlyScenarios && !onlyScenarios.has(scenario.id)) continue;
      results.push(await executeScenario(scenario, ctx));
    }
  } finally {
    // Restaurar token original del usuario
    if (userWithChild) {
      await prisma.user.update({
        where: { id: userWithChild.id },
        data: { pushToken: previousToken },
      });
    }
    console.log('[4/4] Parando el backend y guardando resultados...');
    fs.writeFileSync(stopFile, '');
    await backendTerminado;
    fs.rmSync(stopFile, { force: true });
    logStream.end();
    await prisma.$disconnect();
  }

  const jsonPath = path.join(outDir, 'resultados-rnf01.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2));

  const csvLines = [
    'ID,Escenario,n,Descartadas,Media_ms,Mediana_ms,p95_ms,p99_ms,Max_ms,Pct_le_2s,Cumple',
    ...results.map((r) =>
      [
        r.id,
        `"${r.name}"`,
        r.n,
        r.discardedReps ?? 0,
        r.meanMs ?? '-',
        r.medianMs ?? '-',
        r.p95Ms ?? '-',
        r.p99Ms ?? '-',
        r.maxMs ?? '-',
        r.within2sPct ?? '-',
        r.passes ? 'SI' : 'NO',
      ].join(','),
    ),
  ];
  const csvPath = path.join(outDir, 'resultados-rnf01.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));

  console.log('\nResumen guardado en:');
  console.log(`  - JSON: ${jsonPath}`);
  console.log(`  - CSV:  ${csvPath}`);
  console.log(`  - Logs: ${path.join(outDir, 'scheduler-logs.txt')}`);
}

main().catch(async (err) => {
  console.error(err);
  try {
    fs.writeFileSync(stopFile, '');
  } catch {}
  await prisma.$disconnect();
  process.exit(1);
});
