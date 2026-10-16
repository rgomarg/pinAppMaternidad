import { Injectable } from '@nestjs/common';
import { dirname, join } from 'path';
import pdfmake from 'pdfmake';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { ChildService } from './child.service';

// Paleta de la app (frontend/tailwind.config.js)
const colors = {
    background: '#f7f3ec',
    card: '#ece6d9',
    border: '#ddd2c4',
    text: '#3a3a3a',
    muted: '#808080',
    blue: '#6d83a1',
    green: '#65a882',
    red: '#cc7a66',
};

type ChildExport = Awaited<ReturnType<ChildService['exportData']>>;

@Injectable()
export class ChildExportService {
    constructor(private readonly childService: ChildService) {
        // pdfmake no trae fuentes cargadas en Node: se apuntan a las Roboto que incluye el paquete
        const fontsDir = join(dirname(require.resolve('pdfmake')), '..', 'fonts', 'Roboto');
        pdfmake.setFonts({
            Roboto: {
                normal: join(fontsDir, 'Roboto-Regular.ttf'),
                bold: join(fontsDir, 'Roboto-Medium.ttf'),
                italics: join(fontsDir, 'Roboto-Italic.ttf'),
                bolditalics: join(fontsDir, 'Roboto-MediumItalic.ttf'),
            },
        });
    }

    async generatePdf(id: number): Promise<{ buffer: Buffer; childName: string }> {
        const child = await this.childService.exportData(id);
        const pdf = pdfmake.createPdf(this.buildDocument(child));
        const buffer = await pdf.getBuffer(); 
        return {buffer,childName: child.name};
    }

    private buildDocument(child: ChildExport): TDocumentDefinitions {
        const generatedAt = this.formatDate(new Date());

        return {
            pageSize: 'A4' as const,
            pageMargins: [40, 40, 40, 60] as [number, number, number, number],
            background: () => ({
                canvas: [{ type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: colors.background }],
            }),
            defaultStyle: { font: 'Roboto', fontSize: 10, color: colors.text },
            styles: {
                title: { fontSize: 22, bold: true, color: colors.text },
                subtitle: { fontSize: 11, color: colors.muted },
                sectionTitle: { fontSize: 11, bold: true, color: colors.blue, characterSpacing: 1 },
                tableHeader: { bold: true, color: colors.muted, fontSize: 9 },
                muted: { color: colors.muted },
            },
            footer: (currentPage: number, pageCount: number) => ({
                columns: [
                    { text: `Generado el ${generatedAt}`, style: 'muted', fontSize: 8 },
                    { text: `${currentPage} / ${pageCount}`, style: 'muted', fontSize: 8, alignment: 'right' },
                ],
                margin: [40, 20, 40, 0],
            }),
            content: [
                this.header(child),
                this.section('ALERGIAS', this.allergies(child)),
                this.section('VACUNAS', this.vaccines(child)),
                this.section('CONDICIONES Y ENFERMEDADES', this.conditions(child)),
                this.section('MEDICAMENTOS', this.medicines(child)),
                this.section('MEDICIONES', this.measurements(child)),
            ],
        };
    }

    // ---------- Bloques ----------

    private header(child: ChildExport): Content {
        const sex = child.sex === 'MALE' ? 'Masculino' : child.sex === 'FEMALE' ? 'Femenino' : '—';
        return {
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: child.name, style: 'title' },
                        {
                            text: `${this.age(child.birthDate)} años · Nacimiento: ${this.formatDate(child.birthDate)}`,
                            style: 'subtitle',
                            margin: [0, 4, 0, 0],
                        },
                        {
                            text: `Sexo: ${sex}   ·   Grupo sanguíneo: ${child.bloodGroup ?? '—'}`,
                            style: 'subtitle',
                            margin: [0, 2, 0, 0],
                        },
                    ],
                    margin: [16, 14, 16, 14],
                }]],
            },
            layout: {
                fillColor: () => colors.card,
                hLineWidth: () => 0,
                vLineWidth: (i: number) => (i === 0 ? 4 : 0),
                vLineColor: () => colors.red,
            },
            margin: [0, 0, 0, 8],
        };
    }

    private section(title: string, body: Content): Content {
        return {
            stack: [
                { text: title, style: 'sectionTitle', margin: [0, 18, 0, 6] },
                body,
            ],
        };
    }

    private allergies(child: ChildExport): Content {
        const list = this.parseAllergies(child.allergies);
        if (!list.length) return this.empty('Sin alergias registradas');
        return this.table(
            ['Alergia', 'Gravedad', 'Notas'],
            ['*', 70, '*'],
            list.map((a) => [
                { text: a.name, bold: a.severity === 'severa' },
                { text: a.severity, color: a.severity === 'severa' ? colors.red : colors.text, bold: a.severity === 'severa' },
                { text: a.notes ?? '—', style: 'muted' },
            ]),
        );
    }

    private vaccines(child: ChildExport): Content {
        if (!child.vaccines.length) return this.empty('Sin vacunas registradas');
        const sorted = [...child.vaccines].sort(
            (a, b) => this.time(b.appliedAt ?? b.scheduledFor) - this.time(a.appliedAt ?? a.scheduledFor),
        );
        return this.table(
            ['Vacuna', 'Estado', 'Fecha'],
            ['*', 80, 90],
            sorted.map((v) => [
                v.name,
                { text: v.appliedAt ? 'Aplicada' : 'Pendiente', color: v.appliedAt ? colors.green : colors.red, bold: true },
                this.formatDate(v.appliedAt ?? v.scheduledFor),
            ]),
        );
    }

    private conditions(child: ChildExport): Content {
        const rows: TableCell[][] = [
            ...child.diseases.map((d): TableCell[] => [
                d.name,
                { text: d.description ?? '—', style: 'muted' },
                this.formatDate(d.diagnosticatedAge),
            ]),
            ...child.conditions.map((c): TableCell[] => [
                c.desciption ?? 'Condición registrada',
                { text: c.notes ?? '—', style: 'muted' },
                this.formatDate(c.timestamp),
            ]),
        ];
        if (!rows.length) return this.empty('Sin condiciones registradas');
        return this.table(['Nombre', 'Descripción', 'Fecha'], ['*', '*', 90], rows);
    }

    private medicines(child: ChildExport): Content {
        if (!child.medicine.length) return this.empty('Sin medicamentos registrados');
        return this.table(
            ['Medicamento', 'Dosis', 'Frecuencia', 'Inicio', 'Fin'],
            ['*', 70, 70, 65, 65],
            child.medicine.map((m) => [
                m.name,
                m.dosage,
                m.intervalHours ? `cada ${m.intervalHours} h` : '—',
                this.formatDate(m.startDate),
                m.endDate ? this.formatDate(m.endDate) : 'En curso',
            ]),
        );
    }

    private measurements(child: ChildExport): Content {
        if (!child.measurements.length) return this.empty('Sin mediciones registradas');
        const sorted = [...child.measurements].sort((a, b) => this.time(b.date) - this.time(a.date));
        return this.table(
            ['Fecha', 'Peso', 'Altura'],
            [100, '*', '*'],
            sorted.map((m) => [
                this.formatDate(m.date),
                m.weight != null ? `${m.weight} kg` : '—',
                m.height != null ? `${m.height} cm` : '—',
            ]),
        );
    }

    // ---------- Helpers de estilo ----------

    private table(headers: string[], widths: (number | string)[], rows: TableCell[][]): Content {
        return {
            table: {
                headerRows: 1,
                widths,
                dontBreakRows: true,
                body: [
                    headers.map((h) => ({ text: h.toUpperCase(), style: 'tableHeader' })),
                    ...rows,
                ],
            },
            layout: {
                fillColor: (rowIndex: number) => (rowIndex === 0 ? colors.card : null),
                hLineWidth: (i: number) => (i === 0 ? 0 : 0.5),
                hLineColor: () => colors.border,
                vLineWidth: () => 0,
                paddingTop: () => 6,
                paddingBottom: () => 6,
                paddingLeft: () => 8,
                paddingRight: () => 8,
            },
        };
    }

    private empty(text: string): Content {
        return { text, style: 'muted', italics: true };
    }

    // ---------- Helpers de datos ----------

    private parseAllergies(raw: string | null): { name: string; severity: string; notes?: string }[] {
        if (!raw) return [];
        if (['ninguna conocida', 'sin alergias registradas'].includes(raw.trim().toLowerCase())) return [];
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.every((a) => a && typeof a.name === 'string')) {
                return parsed.map((a) => ({
                    name: a.name.trim(),
                    severity: ['leve', 'moderada', 'severa'].includes(a.severity) ? a.severity : 'moderada',
                    notes: typeof a.notes === 'string' ? a.notes : undefined,
                }));
            }
        } catch {
            // Registros antiguos: texto separado por comas
        }
        return raw.split(',').map((n) => ({ name: n.trim(), severity: 'moderada' })).filter((a) => a.name);
    }

    private age(birthDate: Date): number {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const hadBirthday =
            today.getMonth() > birthDate.getMonth() ||
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
        return hadBirthday ? age : age - 1;
    }

    private formatDate(date: Date | null | undefined): string {
        return date ? date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
    }

    private time(date: Date | null | undefined): number {
        return date ? date.getTime() : 0;
    }
}
