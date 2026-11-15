// Utilidades compartidas entre el libro de familia y el formulario del hijo.

export type AllergySeverity = 'leve' | 'moderada' | 'severa';

export type Allergy = {
  name: string;
  severity: AllergySeverity;
  notes?: string;
};

export function hasAllergy(allergies: string | null | undefined) {
  if (!allergies) return false;
  return !['ninguna conocida', 'sin alergias registradas'].includes(allergies.trim().toLowerCase());
}

export function allergyRecords(allergies: string | null | undefined): Allergy[] {
  if (!hasAllergy(allergies)) return [];
  try {
    const parsed = JSON.parse(allergies!);
    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item.name === 'string')) {
      return parsed.map((item) => ({
        name: item.name.trim(),
        severity: ['leve', 'moderada', 'severa'].includes(item.severity) ? item.severity : 'moderada',
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      })).filter((item) => item.name);
    }
  } catch {
    // Older records use a comma-separated string.
  }
  return allergies!.split(',').map((name) => ({
    name: name.trim(),
    severity: 'moderada' as AllergySeverity,
  })).filter((item) => item.name);
}
