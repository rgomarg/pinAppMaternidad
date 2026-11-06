export interface VaccineRule {
  vacuna: string;
  dosis: number;
  mesesOffset: number;
}

export const DEFAULT_VACCINE_SCHEDULE: VaccineRule[] = [
  // 2 Meses
  { vacuna: 'Hexavalente', dosis: 1, mesesOffset: 2 },
  { vacuna: 'Hepatitis B', dosis: 1, mesesOffset: 2 },
  { vacuna: 'Neumococo', dosis: 1, mesesOffset: 2 },
  { vacuna: 'Meningococo B', dosis: 1, mesesOffset: 2 },
  { vacuna: 'Rotavirus', dosis: 1, mesesOffset: 2 },

  // 4 Meses
  { vacuna: 'Hexavalente', dosis: 2, mesesOffset: 4 },
  { vacuna: 'Hepatitis B', dosis: 2, mesesOffset: 4 },
  { vacuna: 'Neumococo', dosis: 2, mesesOffset: 4 },
  { vacuna: 'Meningococo B', dosis: 2, mesesOffset: 4 },
  { vacuna: 'Meningococo ACWY', dosis: 1, mesesOffset: 4 },
  { vacuna: 'Rotavirus', dosis: 2, mesesOffset: 4 },

  // 6 Meses
  { vacuna: 'Gripe', dosis: 1, mesesOffset: 6 },
  { vacuna: 'Neumococo', dosis: 3, mesesOffset: 6 },
  { vacuna: 'Rotavirus', dosis: 3, mesesOffset: 6 },

  // 11 Meses
  { vacuna: 'Hexavalente', dosis: 3, mesesOffset: 11 },
  { vacuna: 'Hepatitis B', dosis: 3, mesesOffset: 11 },
  { vacuna: 'Neumococo', dosis: 4, mesesOffset: 11 },

  // 12 Meses
  { vacuna: 'Meningococo B', dosis: 3, mesesOffset: 12 },
  { vacuna: 'Meningococo ACWY', dosis: 2, mesesOffset: 12 },
  { vacuna: 'Triple vírica', dosis: 1, mesesOffset: 12 },

  // 15 Meses
  { vacuna: 'Varicela', dosis: 1, mesesOffset: 15 },

  // 24 Meses (2 años)
  { vacuna: 'Tetravírica', dosis: 1, mesesOffset: 24 },
];