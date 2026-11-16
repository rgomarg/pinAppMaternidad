import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { toQR } from 'toqr';
import * as FileSystem from 'expo-file-system/legacy';
import { Camera, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Share } from 'react-native';

/**
 * Copia texto al portapapeles en web o abre la hoja nativa para copiarlo en móvil.
 */
export async function copyInviteLink(text: string): Promise<'copied' | 'shared'> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return 'copied';
  }
  await Share.share({ message: text });
  return 'shared';
}

export const QR_PREFIX = 'HC1:';
export const SHARE_DURATION_MINUTES = 5;
export const SHARE_DURATION_MS = SHARE_DURATION_MINUTES * 60 * 1000;

export const CAMERA_PERMISSION_REQUIRED_TITLE = 'Permisos de cámara requeridos';
export const CAMERA_PERMISSION_REQUIRED_MESSAGE =
  'No es posible abrir la cámara ni escanear el código QR sin conceder los permisos necesarios en el dispositivo.';

export const MEDIA_PERMISSION_REQUIRED_TITLE = 'Permisos de galería requeridos';
export const MEDIA_PERMISSION_REQUIRED_MESSAGE =
  'No es posible seleccionar una imagen del código QR sin conceder los permisos de acceso a tus fotos.';

/**
 * Comprueba y solicita permisos de cámara siguiendo el mismo patrón de concesión
 * de permisos que utiliza la aplicación (ver notificationService.ts).
 */
export async function checkCameraPermissions(): Promise<boolean> {
  try {
    const existing = await Camera.getCameraPermissionsAsync();
    if (existing.status === 'granted' || existing.granted) {
      return true;
    }

    const requested = await Camera.requestCameraPermissionsAsync();
    return requested.status === 'granted' || (requested.granted ?? false);
  } catch (error) {
    console.warn('Error al verificar permisos de cámara del dispositivo:', error);
    return false;
  }
}

/**
 * Comprueba y solicita permisos de galería de imágenes siguiendo el mismo patrón
 * de concesión de permisos que utiliza la aplicación.
 */
export async function checkMediaLibraryPermissions(): Promise<boolean> {
  try {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existing.status === 'granted' || existing.granted) {
      return true;
    }

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return requested.status === 'granted' || (requested.granted ?? false);
  } catch (error) {
    console.warn('Error al verificar permisos de galería del dispositivo:', error);
    return false;
  }
}

/**
 * Abre la galería del dispositivo, permite elegir una imagen y escanea el código QR contenido en ella.
 */
export async function pickAndDecodeQrFromGallery(): Promise<{ decodedText: string | null; cancelled: boolean }> {
  if (Platform.OS === 'web') {
    const webResult = await pickAndDecodeQrImageWeb();
    if (!webResult) return { decodedText: null, cancelled: true };
    return { decodedText: webResult.decodedText, cancelled: false };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return { decodedText: null, cancelled: true };
  }

  const imageUri = result.assets[0].uri;
  try {
    const scanned = await scanFromURLAsync(imageUri, ['qr']);
    if (Array.isArray(scanned) && scanned.length > 0 && scanned[0]?.data) {
      return { decodedText: scanned[0].data, cancelled: false };
    }
  } catch (error) {
    console.warn('Error al escanear QR desde imagen de galería:', error);
  }

  return { decodedText: null, cancelled: false };
}

/**
 * En entorno web, permite seleccionar una imagen o capturar desde la cámara e intenta
 * decodificar el código QR usando BarcodeDetector si está soportado por el navegador.
 */
export function pickAndDecodeQrImageWeb(): Promise<{ decodedText: string | null; fileName: string } | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        if (BarcodeDetectorClass && typeof createImageBitmap === 'function') {
          const detector = new BarcodeDetectorClass({ formats: ['qr_code'] });
          const bitmap = await createImageBitmap(file);
          const barcodes = await detector.detect(bitmap);
          if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0]?.rawValue) {
            resolve({ decodedText: barcodes[0].rawValue, fileName: file.name });
            return;
          }
        }
      } catch (err) {
        console.warn('No se pudo decodificar el QR automáticamente desde la imagen:', err);
      }

      resolve({ decodedText: null, fileName: file.name });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

export type SharedChildVaccine = {
  id: number;
  name: string;
  appliedAt: string | null;
  scheduledFor: string | null;
};

export type SharedChildCondition = {
  id: number;
  desciption?: string | null;
  description?: string | null;
  timestamp: string;
};

export type SharedChildDisease = {
  id: number;
  name: string;
  description: string | null;
  diagnosticatedAge: string | null;
};

export type SharedChildMedicine = {
  id: number;
  name: string;
  dosage: string;
  intervalHours: number | null;
  startDate?: string | null;
  instructions?: string | null;
  endDate: string | null;
};

export type SharedChildProfile = {
  id: number;
  slug: string;
  name: string;
  surname?: string | null;
  sex?: 'MALE' | 'FEMALE' | null;
  birthDate: string;
  bloodGroup?: string | null;
  allergies: string | null;
  vaccines: SharedChildVaccine[];
  conditions: SharedChildCondition[];
  diseases: SharedChildDisease[];
  medicine: SharedChildMedicine[];
  sharedAt: string;
  expiresAt: string;
  isShared?: boolean;
  recipientUserId?: number;
};

/**
 * Genera el identificador legible del menor (ej. "sofia" para "Sofía Ramírez")
 */
export function getChildSlug(name: string, id?: number): string {
  const firstWord = (name || '').trim().split(/\s+/)[0] || '';
  const normalized = firstWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return normalized || (id != null ? `menor-${id}` : 'menor');
}

function utf8ToBytes(str: string): number[] {
  const utf8 = unescape(encodeURIComponent(str));
  const bytes: number[] = [];
  for (let i = 0; i < utf8.length; i++) {
    bytes.push(utf8.charCodeAt(i));
  }
  return bytes;
}

function bytesToUtf8(bytes: number[]): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  try {
    return decodeURIComponent(escape(bin));
  } catch {
    return bin;
  }
}

function utf8ToBase64Url(str: string): string {
  const bytes = utf8ToBytes(str);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : 0;
    const b3 = i + 2 < len ? bytes[i + 2] : 0;

    result += chars[b1 >> 2];
    result += chars[((b1 & 3) << 4) | (b2 >> 4)];
    if (i + 1 < len) {
      result += chars[((b2 & 15) << 2) | (b3 >> 6)];
    }
    if (i + 2 < len) {
      result += chars[b3 & 63];
    }
  }
  return result;
}

function base64UrlToUtf8(b64url: string): string {
  const clean = b64url.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const lookup = new Uint8Array(256);
  lookup.fill(255);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const val = lookup[clean.charCodeAt(i)];
    if (val === 255 || val === undefined) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return bytesToUtf8(out);
}

/**
 * Codifica los datos del menor en una cadena autocontenida con prefijo "HC1:"
 * e incluye la caducidad de 30 días desde el momento de generación/vinculación.
 */
export function encodeChildShareCode(child: {
  id: number;
  name: string;
  surname?: string | null;
  sex?: 'MALE' | 'FEMALE' | null;
  birthDate: string;
  bloodGroup?: string | null;
  allergies?: string | null;
  vaccines?: SharedChildVaccine[];
  conditions?: SharedChildCondition[];
  diseases?: SharedChildDisease[];
  medicine?: SharedChildMedicine[];
}): string {
  const now = Date.now();
  const expiresAt = new Date(now + SHARE_DURATION_MS).toISOString();
  const compact = {
    v: 1,
    i: child.id,
    s: getChildSlug(child.name, child.id),
    n: child.name,
    sn: child.surname ?? null,
    sx: child.sex ?? null,
    b: child.birthDate,
    bg: child.bloodGroup ?? null,
    al: child.allergies ?? null,
    vc: (child.vaccines ?? []).map((v) => ({
      i: v.id,
      n: v.name,
      a: v.appliedAt,
      s: v.scheduledFor,
    })),
    cd: (child.conditions ?? []).map((c) => ({
      i: c.id,
      d: c.description || c.desciption || null,
      t: c.timestamp,
    })),
    ds: (child.diseases ?? []).map((d) => ({
      i: d.id,
      n: d.name,
      d: d.description,
      da: d.diagnosticatedAge,
    })),
    md: (child.medicine ?? []).map((m) => ({
      i: m.id,
      n: m.name,
      d: m.dosage,
      ih: m.intervalHours,
      sd: m.startDate ?? null,
      in: m.instructions ?? null,
      ed: m.endDate,
    })),
    iat: new Date(now).toISOString(),
    exp: expiresAt,
  };

  return `${QR_PREFIX}${utf8ToBase64Url(JSON.stringify(compact))}`;
}

/**
 * Construye un enlace de invitación que incluye el código HC1:...
 */
export function buildShareInviteLink(child: Parameters<typeof encodeChildShareCode>[0]): string {
  return encodeChildShareCode(child);
}

/**
 * Decodifica un código "HC1:..." o un enlace que lo contenga y valida su caducidad (30 días).
 */
export function decodeChildShareCode(rawInput: string): SharedChildProfile {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Introduce un código o enlace de invitación válido.');
  }

  let token = trimmed;
  const hcIndex = trimmed.indexOf(QR_PREFIX);
  if (hcIndex !== -1) {
    token = trimmed.slice(hcIndex + QR_PREFIX.length).split(/[\s&#?]/)[0];
  } else if (trimmed.startsWith('HC1')) {
    token = trimmed.slice(3).replace(/^[:\-]/, '').split(/[\s&#?]/)[0];
  } else {
    throw new Error('El código no tiene un formato válido (debe comenzar por HC1...).');
  }

  let parsed: any;
  try {
    const jsonStr = base64UrlToUtf8(token);
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('El código QR o enlace de invitación está incompleto o es inválido.');
  }

  if (!parsed || typeof parsed.n !== 'string' || !parsed.b) {
    throw new Error('El código no contiene una ficha de menor válida.');
  }

  const now = Date.now();
  const expiresAtIso = parsed.exp
    ? new Date(parsed.exp).toISOString()
    : new Date(now + SHARE_DURATION_MS).toISOString();

  if (new Date(expiresAtIso).getTime() <= now) {
    throw new Error('El permiso temporal de este código QR ha caducado (5 minutos).');
  }

  // Aseguramos caducidad de 5 minutos desde la vinculación o la fecha indicada en el token
  const effectiveExpiresAt = new Date(
    Math.min(new Date(expiresAtIso).getTime(), now + SHARE_DURATION_MS),
  ).toISOString();

  const syntheticId = typeof parsed.i === 'number' ? -Math.abs(parsed.i) : -(Math.floor(Math.random() * 900000) + 100000);

  return {
    id: syntheticId,
    slug: parsed.s || getChildSlug(parsed.n, Math.abs(syntheticId)),
    name: parsed.n,
    surname: parsed.sn ?? null,
    sex: parsed.sx ?? null,
    birthDate: parsed.b,
    bloodGroup: parsed.bg ?? null,
    allergies: parsed.al ?? null,
    vaccines: Array.isArray(parsed.vc)
      ? parsed.vc.map((v: any, idx: number) => ({
          id: v.i ?? idx + 1,
          name: v.n ?? 'Vacuna',
          appliedAt: v.a ?? null,
          scheduledFor: v.s ?? null,
        }))
      : [],
    conditions: Array.isArray(parsed.cd)
      ? parsed.cd.map((c: any, idx: number) => ({
          id: c.i ?? idx + 1,
          description: c.d ?? null,
          timestamp: c.t ?? new Date().toISOString(),
        }))
      : [],
    diseases: Array.isArray(parsed.ds)
      ? parsed.ds.map((d: any, idx: number) => ({
          id: d.i ?? idx + 1,
          name: d.n ?? 'Condición',
          description: d.d ?? null,
          diagnosticatedAge: d.da ?? null,
        }))
      : [],
    medicine: Array.isArray(parsed.md)
      ? parsed.md.map((m: any, idx: number) => ({
          id: m.i ?? idx + 1,
          name: m.n ?? 'Medicamento',
          dosage: m.d ?? '',
          intervalHours: m.ih ?? null,
          startDate: m.sd ?? null,
          instructions: m.in ?? null,
          endDate: m.ed ?? null,
        }))
      : [],
    sharedAt: parsed.iat ?? new Date(now).toISOString(),
    expiresAt: effectiveExpiresAt,
    isShared: true,
  };
}

/**
 * Calcula los minutos restantes antes de que caduque el permiso temporal (5 minutos).
 */
export function getRemainingShareMinutes(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (60 * 1000));
}

// Persistencia local de perfiles compartidos por usuario (con limpieza automática de caducados > 5 minutos)
let memorySharedChildren: SharedChildProfile[] = [];
const STORAGE_KEY = 'pinapp_shared_children_v2';

const getStorageFilePath = () =>
  FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${STORAGE_KEY}.json` : null;

async function loadAllValidSharedChildren(): Promise<SharedChildProfile[]> {
  try {
    let raw: string | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } else {
      const fileUri = getStorageFilePath();
      if (fileUri) {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          raw = await FileSystem.readAsStringAsync(fileUri);
        }
      }
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memorySharedChildren = parsed;
      }
    }
  } catch {
    // Fallback a memoria
  }

  // Ajustar permisos ya existentes que tuvieran más de 5 minutos (p. ej. 30 días) para que duren como máximo 5 minutos
  // y filtrar los que ya hayan caducado.
  const now = Date.now();
  let modified = false;
  const normalized = memorySharedChildren.map((child) => {
    if (!child || !child.expiresAt) return child;
    const baseTime = child.sharedAt ? new Date(child.sharedAt).getTime() : now;
    const maxAllowedExp = Math.max(baseTime + SHARE_DURATION_MS, Math.min(new Date(child.expiresAt).getTime(), now + SHARE_DURATION_MS));
    if (new Date(child.expiresAt).getTime() > now + SHARE_DURATION_MS) {
      modified = true;
      return { ...child, expiresAt: new Date(maxAllowedExp).toISOString() };
    }
    return child;
  });

  const valid = normalized.filter(
    (child) =>
      child &&
      child.recipientUserId != null &&
      child.expiresAt &&
      new Date(child.expiresAt).getTime() > now,
  );

  if (modified || valid.length !== memorySharedChildren.length) {
    memorySharedChildren = valid;
    await persistSharedChildren(valid);
  }

  return valid;
}

export async function loadSharedChildren(userId: number | null): Promise<SharedChildProfile[]> {
  if (userId == null) {
    return [];
  }
  const allValid = await loadAllValidSharedChildren();
  return allValid.filter((child) => child.recipientUserId === userId);
}

async function persistSharedChildren(list: SharedChildProfile[]): Promise<void> {
  memorySharedChildren = list;
  try {
    const serialized = JSON.stringify(list);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
      return;
    }
    const fileUri = getStorageFilePath();
    if (fileUri) {
      await FileSystem.writeAsStringAsync(fileUri, serialized);
    }
  } catch {
    // Ignorar errores de escritura en caché
  }
}

export async function saveSharedChild(
  profile: SharedChildProfile,
  recipientUserId: number,
): Promise<SharedChildProfile[]> {
  const allCurrent = await loadAllValidSharedChildren();
  const withoutExistingForUser = allCurrent.filter(
    (item) =>
      !(
        item.recipientUserId === recipientUserId &&
        (item.id === profile.id || item.slug === profile.slug)
      ),
  );
  const updated = [
    ...withoutExistingForUser,
    { ...profile, isShared: true, recipientUserId },
  ];
  await persistSharedChildren(updated);
  return updated.filter((item) => item.recipientUserId === recipientUserId);
}

export async function removeSharedChild(
  childId: number,
  recipientUserId?: number | null,
): Promise<SharedChildProfile[]> {
  const allCurrent = await loadAllValidSharedChildren();
  const updated = allCurrent.filter(
    (item) =>
      !(
        item.id === childId &&
        (recipientUserId == null || item.recipientUserId === recipientUserId)
      ),
  );
  await persistSharedChildren(updated);
  return recipientUserId != null
    ? updated.filter((item) => item.recipientUserId === recipientUserId)
    : updated;
}

/**
 * Componente SVG que renderiza un código QR localmente usando `toqr` y `react-native-svg`
 * sin llamar a ninguna API externa.
 */
export function QRCodeSvg({
  value,
  size = 240,
  color = '#232323',
  backgroundColor = '#ffffff',
}: {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}) {
  const { path, matrixSize } = useMemo(() => {
    const inputBytes = new Uint8Array(utf8ToBytes(value || 'HC1:'));
    const bytes = toQR(inputBytes);
    const side = Math.round(Math.sqrt(bytes.length));
    let d = '';
    for (let y = 0; y < side; y++) {
      let x = 0;
      while (x < side) {
        if (bytes[y * side + x]) {
          let run = 1;
          while (x + run < side && bytes[y * side + x + run]) {
            run++;
          }
          d += `M${x},${y}h${run}v1h-${run}z`;
          x += run;
        } else {
          x++;
        }
      }
    }
    return { path: d, matrixSize: side };
  }, [value]);

  return (
    <View style={{ width: size, height: size, backgroundColor }} className="items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${matrixSize} ${matrixSize}`}>
        <Rect x={0} y={0} width={matrixSize} height={matrixSize} fill={backgroundColor} />
        <Path d={path} fill={color} />
      </Svg>
    </View>
  );
}
