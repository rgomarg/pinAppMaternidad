import { Injectable } from "@nestjs/common";
import { PrismaService } from "prisma/prisma.service";
import { DEFAULT_VACCINE_SCHEDULE } from "./constants/vaccine-schedule.constant";

@Injectable()
export class VaccineScheduleService {
    constructor(private readonly prisma: PrismaService) {}
    
    private calculateDate(birth: Date, monthsToAdd: number): Date {    
        const date = new Date(birth);        
        date.setMonth(date.getMonth() + monthsToAdd);
        date.setHours(9, 0, 0, 0); //Poner la notificacion a las 9.00 am
        return date; 
    }
    
    async generateScheduleForChild(childId: number, birthDate: Date) {
        // Se transforma del "diccionario" a un objeto que poder meter en prisma
        const vaccinesToCreate = DEFAULT_VACCINE_SCHEDULE.map((rule) => {
            const scheduledDate = this.calculateDate(birthDate, rule.mesesOffset);

            return {
                name: `${rule.vacuna} (Dosis ${rule.dosis})`,
                scheduledFor: scheduledDate,
                appliedAt: null,
                childId: childId,
                notification: true,
            };
        });

        
        return await this.prisma.vaccine.createMany({
            data: vaccinesToCreate,
        });
    }
    
    //Se eliminan las vacunas que esten como pendientes.
    //NO USAR ESTO PARA cambio de birthDate, porque borrará TODAS, incluso las que haya puesto el padre/madre.
    async deletePendingScheduledVaccines(childId: number) {
        return await this.prisma.vaccine.deleteMany({
            where: {
            childId: childId,
            appliedAt: null, //Solo borra las pendientes, respeta las ya puestas (aunque se queden con la fecha mal)
            },
        });
    }

    async rescheduleForChild(childId: number, newBirthDate: Date) {
        // SE busca las vacunas ya puestas al hijo = no duplicados
        const appliedVaccines = await this.prisma.vaccine.findMany({
            where: {
                childId,
                appliedAt: { not: null },
            },
            select: { name: true },
        });

        const appliedNames = new Set(appliedVaccines.map((v) => v.name));

        // Filtrar el catálogo: solo se recalcula las que NO estén puestas aún
        const pendingRules = DEFAULT_VACCINE_SCHEDULE.filter((rule) => {
            const fullName = `${rule.vacuna} (Dosis ${rule.dosis})`;
            return !appliedNames.has(fullName);
        });

        //Calculas las nuevas fechas
        const newVaccinesToCreate = pendingRules.map((rule) => {
            const scheduledDate = this.calculateDate(newBirthDate, rule.mesesOffset);            
            return {
                name: `${rule.vacuna} (Dosis ${rule.dosis})`,
                scheduledFor: scheduledDate,
                appliedAt: null,
                childId: childId,
                notification: true,
            };
        });

        //Transacción atómica: borra las pendientes antiguas y guarda las nuevas de golpe
        //USAR ESTO para próxima UT de modificar el birthdate
        return await this.prisma.$transaction([
            this.prisma.vaccine.deleteMany({
            where: {
                childId,
                appliedAt: null,
            },
            }),
            this.prisma.vaccine.createMany({
            data: newVaccinesToCreate,
            }),
        ]);
    }


}