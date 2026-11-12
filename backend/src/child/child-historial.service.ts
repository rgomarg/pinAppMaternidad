import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ChildService } from './child.service';
import { HistoryKind } from './dto/historial-child.dto';

type HistoryItem = {
    id: number;
    kinds: 'DISEASE' | 'MEDICINE' | 'APPOINTMENT' | 'VACCINE' | 'SYMPTOM' | 'MEASUREMENT' | 'OTHER';
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

        let wants: (kind: HistoryKind) => boolean;
        const child = await this.childService.findOne(childId);
        if (!child) {
            throw new Error(`Child with ID ${childId} not found`);
        }
        
        // 1. wants(kind): true si kinds viene vacío o incluye ese tipo.
        if (!kinds || kinds.length === 0) {
            wants = (kind: HistoryKind) => true;
        }
        else{
            wants = (kind: HistoryKind) => kinds.includes(kind);
        }
        // 2. Decodifica el cursor (si viene): saca la fecha y el id del último item.
        //    Calcula el límite superior efectivo = el menor entre `to` y la fecha del cursor.
        cursor = cursor ? decodeURIComponent(cursor) : undefined;
        // 3. Construye UN objeto de filtro de fecha {gte: from, lte: upper}
        //    con solo las claves que existan. Reutilízalo en las consultas puntuales.
        {gte: from, lte: upper} = {gte:from, lte:to};

        // 4. Promise.all con 5 findMany (cada uno con where childId, su filtro de fecha,
        //    orderBy fecha desc y take: limit). Si !wants(kind) devuelve [].
        //    - medicine y disease: filtro de SOLAPAMIENTO (inicio <= upper y
        //      endDate null o >= from), no el filtro simple.
        //    - disease: excluye diagnosticatedAge null.
        //    - vaccine: OR entre appliedAt y scheduledFor, o solo scheduledFor.
        //    - event: type: EventType.MEDICAL_APPOINTMENT (excluye "otro").
        //    - condition: filtro simple por timestamp.

        // 5. Mapea cada resultado a HistoryItem {id con prefijo, kind, title,
        //    subtitle, date, endDate, refId}.

        // 6. Junta los 5 arrays, descarta los items sin date, ordena por date desc.

        // 7. Recorta a `limit`.

        // 8. Si el resultado llegó a `limit` elementos, nextCursor = codificar
        //    (fecha + id) del último item; si no, null.

        // 9. return { items, nextCursor }.

    }
}

