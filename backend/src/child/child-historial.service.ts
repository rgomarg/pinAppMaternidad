import { BadRequestException, Injectable } from '@nestjs/common';
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
            throw new Error(`Child with ID ${childId} not found`);
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
            if (! cursorId) {
                throw new BadRequestException (`Invalid cursor`);
            }
            if (to) {
                if(to > cursorDate ) to = cursorDate ;
            }   
            else {
                to = cursorDate;
            }


        }
        // 3. Construye UN objeto de filtro de fecha {gte: from, lte: upper}
        //    con solo las claves que existan. Reutilízalo en las consultas puntuales.
        const dateFilter = { gte: from, lte: to };

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
                    ]
                },
                orderBy: [{ diagnosticatedAge: 'desc' }, { id: 'desc' }],
                take: limit
            }) : [],
            wants(HistoryKind.MEDICINE) ? this.prisma.medicine.findMany({
                where: {
                    childId,
                    startDate: { lte: to },
                    OR: [
                        { endDate: null },
                        { endDate: { gte: from } }
                    ]
                },
                orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
                take: limit
            }) : [],
            // Solo vacunas aplicadas: las pendientes no forman parte del historial.
            wants(HistoryKind.VACCINE) ? this.prisma.vaccine.findMany({
                where: {
                    childId,
                    appliedAt: { not: null, ...dateFilter }
                },
                orderBy: [{ appliedAt: 'desc' }, { id: 'desc' }],
                take: limit
            }) : [],
            wants(HistoryKind.APPOINTMENT) ? this.prisma.event.findMany({
                where: {
                    childId,
                    type: EventType.MEDICAL_APPOINTMENT,
                    date: dateFilter
                },
                orderBy: [{ date: 'desc' }, { id: 'desc' }],
                take: limit
            }) : [],
            wants(HistoryKind.SYMPTOM) ? this.prisma.condition.findMany({
                where: {
                    childId,
                    timestamp: dateFilter
                },
                orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
                take: limit
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

        const items = [
            ...diseases.map(mapDisease),
            ...medicines.map(mapMedicine),
            ...vaccines.map(mapVaccine),
            ...appointments.map(mapAppointment),
            ...conditions.map(mapCondition)
        ];  
        

        // 6. Junta los 5 arrays, descarta los items sin date, ordena por date desc.

        // 7. Recorta a `limit`.

        // 8. Si el resultado llegó a `limit` elementos, nextCursor = codificar
        //    (fecha + id) del último item; si no, null.

        // 9. return { items, nextCursor }.

    }
}

