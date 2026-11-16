import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Condition, Disease, Event, EventType, Medicine, Vaccine } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { ChildService } from './child.service';
import { HistoryKind } from './dto/historial-child.dto';

type HistoryItem = {
    id: string;
    kind: HistoryKind;
    title: string;        
    subtitle?: string;     
    date: string;         
    endDate?: string;     
    status?: 'ACTIVE' | 'FINISHED' | 'PENDING' | 'APPLIED';
    refId: number;

};

@Injectable()
export class ChildHistorialService {

    constructor(private readonly prisma: PrismaService, private readonly childService: ChildService) { }

    async getChildHistorial(childId: number, kinds?: HistoryKind[], from?: Date, to?: Date, limit: number = 20, cursor?: string) {

        
        const child = await this.childService.findOne(childId);
        if (!child) {
            throw new NotFoundException(`Child with ID ${childId} not found`);
        }
        
        // 1. wants(kind): true si kinds viene vacío o incluye ese tipo.
        const wants = (kind: HistoryKind) => !kinds || kinds.length === 0 || kinds.includes(kind);

        // 2. Decodifica el cursor (si viene): saca la fecha y el id del último item.
        //    Calcula el límite superior efectivo = el menor entre `to` y la fecha del cursor.
        let cursorDate: Date | undefined;
        let cursorId: string | undefined;
        if(cursor) {
            const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf-8').split('|');

            cursorDate = new Date(iso);
            cursorId = id;

            if (isNaN(cursorDate.getTime())) {
                throw new BadRequestException (`Invalid cursor`);
            } 
            // El id tiene la forma `<prefijo>-<número>` (p. ej. `medicine-5`).
            if (! cursorId || !/^[a-z]+-\d+$/.test(cursorId)) {
                throw new BadRequestException (`Invalid cursor`);
            }
            if (to) {
                if(to > cursorDate ) to = cursorDate ;
            }   
            else {
                to = cursorDate;
            }


        }
        // El historial no muestra nada futuro: el límite superior nunca pasa del final de hoy
        // (hora del servidor). Así `to` siempre tiene valor y todas las consultas lo respetan.
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        if (!to || to > endOfToday) {
            to = endOfToday;
        }
        // 3. Construye UN objeto de filtro de fecha {gte: from, lte: to}
        //    con solo las claves que existan. Reutilízalo en las consultas puntuales.
        const dateFilter = { gte: from, lte: to };

        // Orden total del historial: fecha desc → prefijo desc → número desc.
        // Dentro de una tabla coincide con el orderBy de Prisma (fecha desc, id desc).
        const parseId = (id: string) => {
            const sep = id.lastIndexOf('-');
            return { prefix: id.slice(0, sep), num: Number(id.slice(sep + 1)) };
        };
        const compare = (a: { date: string; id: string }, b: { date: string; id: string }) => {
            if (a.date !== b.date) return a.date > b.date ? -1 : 1;   // ISO en UTC: se compara como texto
            const pa = parseId(a.id);
            const pb = parseId(b.id);
            if (pa.prefix !== pb.prefix) return pa.prefix > pb.prefix ? -1 : 1;
            return pb.num - pa.num;
        };

        // Condición de Prisma "va detrás del cursor" para una tabla, usando el mismo orden que `compare`:
        // fecha anterior, o misma fecha y (prefijo menor, o mismo prefijo e id menor).
        // Se aplica en la BD para que `take: limit + 1` no se gaste en registros ya vistos.
        const cursorPos = cursorDate && cursorId ? parseId(cursorId) : undefined;
        const afterCursor = (field: string, prefix: string): Record<string, unknown> => {
            if (!cursorDate || !cursorPos) return {};
            const earlier = { [field]: { lt: cursorDate } };
            if (prefix > cursorPos.prefix) return earlier;                  // en la misma fecha va antes: ya se vio
            const sameDate = prefix < cursorPos.prefix
                ? { [field]: cursorDate }                                   // en la misma fecha va después
                : { [field]: cursorDate, id: { lt: cursorPos.num } };       // misma tabla: desempate por id
            return { OR: [earlier, sameDate] };
        };

        // 4. Promise.all con 5 findMany (cada uno con where childId, su filtro de fecha,
        //    orderBy fecha desc y take: limit). Si !wants(kind) devuelve [].
        //    - medicine y disease: filtro de SOLAPAMIENTO (inicio <= upper y
        //      endDate null o >= from), no el filtro simple.
        //    - disease: excluye diagnosticatedAge null.
        //    - vaccine: OR entre appliedAt y scheduledFor, o solo scheduledFor.
        //    - event: type: EventType.MEDICAL_APPOINTMENT (excluye "otro").
        //    - condition: filtro simple por timestamp.

        const [diseases, medicines, vaccines, appointments, conditions] = await Promise.all([
            // Solapamiento: empieza antes del fin de la ventana Y (sigue abierta o acaba después del inicio)
            wants(HistoryKind.DISEASE) ? this.prisma.disease.findMany({
                where: {
                    childId,
                    diagnosticatedAge: { not: null, lte: to },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: from } }
                    ],
                    AND: [afterCursor('diagnosticatedAge', 'disease')]
                },
                orderBy: [{ diagnosticatedAge: 'desc' }, { id: 'desc' }],
                take: limit+1
            }) : [],
            wants(HistoryKind.MEDICINE) ? this.prisma.medicine.findMany({
                where: {
                    childId,
                    startDate: { lte: to },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: from } }
                    ],
                    AND: [afterCursor('startDate', 'medicine')]
                },
                orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
                take: limit+1 
            }) : [],
            // Solo vacunas aplicadas: las pendientes no forman parte del historial.
            wants(HistoryKind.VACCINE) ? this.prisma.vaccine.findMany({
                where: {
                    childId,
                    appliedAt: { not: null, ...dateFilter },
                    AND: [afterCursor('appliedAt', 'vaccine')]
                },
                orderBy: [{ appliedAt: 'desc' }, { id: 'desc' }],
                take: limit +1 
            }) : [],
            wants(HistoryKind.APPOINTMENT) ? this.prisma.event.findMany({
                where: {
                    childId,
                    type: EventType.MEDICAL_APPOINTMENT,
                    date: dateFilter,
                    AND: [afterCursor('date', 'appointment')]
                },
                orderBy: [{ date: 'desc' }, { id: 'desc' }],
                take: limit + 1 
            }) : [],
            wants(HistoryKind.SYMPTOM) ? this.prisma.condition.findMany({
                where: {
                    childId,
                    timestamp: dateFilter,
                    AND: [afterCursor('timestamp', 'condition')]
                },
                orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
                take: limit + 1
            }) : []
        ]);

        // 5. Mapea cada resultado a HistoryItem {id con prefijo, kind, title,
        //    subtitle, date, endDate, refId}.
        const now = new Date();
        // Activo si no tiene fin o el fin todavía no ha llegado.
        const isActive = (endDate: Date | null) => !endDate || endDate > now;

        const mapDisease = (disease: Disease): HistoryItem => ({
            id: `disease-${disease.id}`,
            kind: HistoryKind.DISEASE,
            title: disease.name,
            subtitle: disease.description ?? undefined,
            date: disease.diagnosticatedAge!.toISOString(), // la query excluye los null
            endDate: disease.endDate?.toISOString(),
            status: isActive(disease.endDate) ? 'ACTIVE' : 'FINISHED',
            refId: disease.id
        });
        const mapMedicine = (medicine: Medicine): HistoryItem => ({
            id: `medicine-${medicine.id}`,
            kind: HistoryKind.MEDICINE,
            title: medicine.name,
            subtitle: medicine.dosage,
            date: medicine.startDate.toISOString(),
            endDate: medicine.endDate?.toISOString(),
            status: isActive(medicine.endDate) ? 'ACTIVE' : 'FINISHED',
            refId: medicine.id
        });
        const mapVaccine = (vaccine: Vaccine): HistoryItem => ({
            id: `vaccine-${vaccine.id}`,
            kind: HistoryKind.VACCINE,
            title: vaccine.name,
            date: vaccine.appliedAt!.toISOString(), // la query excluye las no aplicadas
            status: 'APPLIED',
            refId: vaccine.id
        });
        const mapAppointment = (appointment: Event): HistoryItem => ({
            id: `appointment-${appointment.id}`,
            kind: HistoryKind.APPOINTMENT,
            title: appointment.title,
            subtitle: appointment.description ?? undefined,
            date: appointment.date.toISOString(),
            status: appointment.date > now ? 'PENDING' : 'FINISHED',
            refId: appointment.id
        });
        // Un síntoma es un registro puntual: sin endDate ni status.
        const mapCondition = (condition: Condition): HistoryItem => ({
            id: `condition-${condition.id}`,
            kind: HistoryKind.SYMPTOM,
            title: condition.tag.length > 0 ? condition.tag.join(', ') : 'Síntoma',
            subtitle: condition.desciption ?? condition.notes ?? undefined, // `desciption` es como se llama en el schema
            date: condition.timestamp.toISOString(),
            refId: condition.id
        });

        // 6. Junta los 5 arrays y ordena con el mismo criterio que el cursor.
        //    Lo ya visto se descartó en la BD con `afterCursor`.
        const items = [
            ...diseases.map(mapDisease),
            ...medicines.map(mapMedicine),
            ...vaccines.map(mapVaccine),
            ...appointments.map(mapAppointment),
            ...conditions.map(mapCondition)
        ].sort(compare);

        // 7. Recorta a `limit`.
        const limitedItems = items.slice(0, limit);

        // 8. Hay página siguiente si sobró algo (cada query pide `limit + 1`).
        let nextCursor: string | null = null;
        if (items.length > limit) {
            const last = limitedItems[limitedItems.length - 1];
            nextCursor = Buffer.from(`${last.date}|${last.id}`).toString('base64url');
        }

        // 9. return { items, nextCursor }.
        return { items: limitedItems, nextCursor };

    }
}

