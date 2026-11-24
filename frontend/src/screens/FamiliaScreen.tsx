import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  type ScrollViewInstance,
  Text,
  TextInput,
  type TextInputInstance,
  TouchableOpacity,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView } from 'expo-camera';
import { API_URL } from '../api/config';
import { useFamilySelection } from '../context/FamilySelectionContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { allergyRecords, type Allergy, type AllergySeverity } from '../utils/allergies';
import {
  buildShareInviteLink,
  CAMERA_PERMISSION_REQUIRED_MESSAGE,
  CAMERA_PERMISSION_REQUIRED_TITLE,
  checkCameraPermissions,
  checkMediaLibraryPermissions,
  copyInviteLink,
  decodeChildShareCode,
  getChildSlug,
  getRemainingShareMinutes,
  loadSharedChildren,
  MEDIA_PERMISSION_REQUIRED_MESSAGE,
  MEDIA_PERMISSION_REQUIRED_TITLE,
  pickAndDecodeQrFromGallery,
  QRCodeSvg,
  removeSharedChild,
  saveSharedChild,
  type SharedChildProfile,
} from '../utils/qrShare';
import HealthHistory, { HealthHistoryLocked } from '../components/HealthHistory';
import { COLORS, SHADOWS } from '../theme';
import ScreenBackground from '../components/ScreenBackground';

type Child = {
  id: number;
  name: string;
  surname?: string | null;
  sex?: 'MALE' | 'FEMALE' | null;
  birthDate: string;
  bloodGroup?: string | null;
  allergies?: string | null;
  avatarUrl?: string | null;
  isShared?: boolean;
  expiresAt?: string;
  slug?: string;
};

type ChildPreview = Child & {
  allergies: string | null;
  vaccines: Vaccine[];
  conditions: { id: number; desciption?: string | null; description?: string | null; timestamp: string }[];
  diseases: { id: number; name: string; description: string | null; diagnosticatedAge: string | null }[];
  medicine: {
    id: number;
    name: string;
    dosage: string;
    intervalHours: number | null;
    startDate?: string | null;
    instructions?: string | null;
    endDate: string | null;
  }[];
};

type Dashboard = Child & {
  allergies: string | null;
  vaccines: Vaccine[];
  conditions: { id: number; desciption?: string | null; description?: string | null; timestamp: string }[];
  diseases: { id: number; name: string; description: string | null; diagnosticatedAge: string | null }[];
  medicine: {
    id: number;
    name: string;
    dosage: string;
    intervalHours: number | null;
    startDate?: string | null;
    instructions?: string | null;
    endDate: string | null;
  }[];
};

type Vaccine = {
  id: number;
  name: string;
  appliedAt: string | null;
  scheduledFor: string | null;
  lot?: string | null; // el backend aún no guarda el lote: si llega, se muestra
};


const palette = {
  background: COLORS.background,
  card: COLORS.surface,
  text: COLORS.text,
  muted: COLORS.muted,
  blue: COLORS.primary,
  green: COLORS.green,
  red: COLORS.red,
};

const Stack = createNativeStackNavigator();

async function fetchChildDashboard(childId: number): Promise<Dashboard> {
  const dashboardResponse = await fetch(`${API_URL}/child/${childId}/dashboard`);
  if (dashboardResponse.ok) {
    return dashboardResponse.json();
  }

  if (dashboardResponse.status !== 404) {
    throw new Error(`No se pudo cargar el perfil del niño (${dashboardResponse.status})`);
  }

  const childResponse = await fetch(`${API_URL}/child/${childId}`);
  if (!childResponse.ok) {
    throw new Error(`No se pudo cargar el niño (${childResponse.status})`);
  }

  const child = await childResponse.json();
  return {
    ...child,
    vaccines: [],
    conditions: [],
    medicine: [],
    diseases: [],
  };
}

// whiteTop: la zona de la barra de estado se pinta de blanco para que continúe la cabecera blanca
function Shell({ children, whiteTop = false }: { children: React.ReactNode; whiteTop?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top }}>
      <ScreenBackground />
      {whiteTop && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: COLORS.surface }} />
      )}
      {children}
    </View>
  );
}

// Cabecera blanca: "< Volver" a la izquierda, título centrado y una acción a la derecha
function Header({
  title,
  onBack,
  backLabel = 'Atrás',
  action,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between bg-nanny-card px-5 pb-4 pt-3">
      <TouchableOpacity onPress={onBack} disabled={!onBack} className="min-w-[96px]" accessibilityRole="button">
        {onBack && (
          <View className="flex-row items-center">
            <Ionicons name="chevron-back" size={20} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-1 font-figtree-medium text-[16px]">{backLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={{ color: palette.text }} className="flex-1 text-center font-figtree-semibold text-[17px]" numberOfLines={1}>
        {title}
      </Text>
      <View className="min-w-[96px] items-end">{action}</View>
    </View>
  );
}

// Foto del menor (Child.avatarUrl) con anillo de color; sin foto, la inicial
function Avatar({ child, size = 72, ringColor = COLORS.primarySoft }: { child: Child; size?: number; ringColor?: string }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, borderColor: ringColor, borderWidth: 3 }}
      className="items-center justify-center overflow-hidden bg-nanny-soft"
    >
      {child.avatarUrl ? (
        <Image source={{ uri: child.avatarUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ color: palette.blue, fontSize: size * 0.35 }} className="font-figtree-semibold">
          {child.name?.charAt(0) || '?'}
        </Text>
      )}
    </View>
  );
}

// ------------------------------
// Formato de fechas y textos (solo presentación)
// ------------------------------
const MONTHS_SHORT_LOWER = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const MONTHS_SHORT_CAP = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_LONG_LOWER = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "15 may 2019"
function formatDayShort(value: string | Date) {
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS_SHORT_LOWER[d.getMonth()]} ${d.getFullYear()}`;
}

// "12 de marzo de 2019"
function formatDayLong(value: string | Date) {
  const d = new Date(value);
  return `${d.getDate()} de ${MONTHS_LONG_LOWER[d.getMonth()]} de ${d.getFullYear()}`;
}

// "Mar 2024"
function formatMonthYearCap(value: string | Date) {
  const d = new Date(value);
  return `${MONTHS_SHORT_CAP[d.getMonth()]} ${d.getFullYear()}`;
}

// "02 Sep 2025"
function formatDayCap(value: string | Date) {
  const d = new Date(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT_CAP[d.getMonth()]} ${d.getFullYear()}`;
}

// 12 -> "2 veces al día", 24 -> "1 vez al día", 8 -> "cada 8h"
function frequencyLabel(intervalHours: number | null) {
  if (!intervalHours) return null;
  if (intervalHours >= 12 && 24 % intervalHours === 0) {
    const times = 24 / intervalHours;
    return `${times} ${times === 1 ? 'vez' : 'veces'} al día`;
  }
  return `cada ${intervalHours}h`;
}

// "Horarios: 08:00, 20:00" -> "08:00 · 20:00"; otras instrucciones se muestran tal cual
function scheduleLabel(instructions?: string | null) {
  if (!instructions) return null;
  if (/^Horarios:/i.test(instructions)) {
    return instructions.replace(/^Horarios:\s*/i, '').split(',').map((t) => t.trim()).filter(Boolean).join(' · ');
  }
  return instructions;
}

function isMedicineActive(medicine: { endDate: string | null }) {
  return !medicine.endDate || new Date(medicine.endDate) >= new Date();
}

const SEVERITY_STYLES: Record<AllergySeverity, { label: string; bg: string; color: string }> = {
  severa: { label: 'Severa', bg: '#F9E1E1', color: '#B23B3B' },
  moderada: { label: 'Moderada', bg: '#FBF0CF', color: '#8A6A12' },
  leve: { label: 'Leve', bg: '#E3F1E6', color: '#3F7A52' },
};

const VACCINE_DONE = '#E2566B';
const VACCINE_PENDING = '#D94F8A';

function getAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
}





// Confirma y elimina un hijo; onDeleted se llama cuando el backend ya lo ha borrado.
function confirmDeleteChild(child: { id: number; name: string }, onDeleted: () => void) {
  Alert.alert(
    'Eliminar hijo/a',
    `Se eliminará a ${child.name} y todos sus datos (vacunas, medicamentos, condiciones y mediciones). Esta acción no se puede deshacer.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/child/${child.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error();
            onDeleted();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar al niño/a.');
          }
        },
      },
    ],
  );
}

function ChildCard({
  child,
  userId,
  onPress,
  onEdit,
  onShareQr,
  onDeleted,
}: {
  child: ChildPreview;
  userId: number | null;
  onPress: () => void;
  onEdit: () => void;
  onShareQr: () => void;
  onDeleted: () => void;
}) {
  const pendingVaccines = child.vaccines.filter((vaccine) => !vaccine.appliedAt).length;
  const activeMedicines = child.medicine.filter(isMedicineActive).length;

  const [exporting, setExporting] = useState(false);
  const fullName = [child.name, child.surname].filter(Boolean).join(' ');
  const remainingMinutes = child.isShared && child.expiresAt ? getRemainingShareMinutes(child.expiresAt) : null;


  async function exportData(childId: number) {
    if (child.isShared) {
      Alert.alert('Vista compartida', 'La exportación en PDF solo está disponible en el dispositivo del tutor propietario.');
      return;
    }
    setExporting(true);
    try {
      if (!FileSystem.cacheDirectory) {
        throw new Error('No hay un directorio de caché disponible.');
      }
      const destination = `${FileSystem.cacheDirectory}pdfs/`;
      await FileSystem.makeDirectoryAsync(destination, { intermediates: true });
      const url = `${API_URL}/child/${childId}/export`;
      const file = await FileSystem.downloadAsync(url, `${destination}child-${childId}.pdf`);

      if (!await Sharing.isAvailableAsync()) {
        Alert.alert('Error', 'No se puede compartir el PDF en este dispositivo.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error('Error exportando PDF:', error);
      Alert.alert('Error', 'No se pudo exportar el PDF.');
    } finally {
      setExporting(false);
    }
  }


  const openMenu = () => {
    if (child.isShared) {
      Alert.alert(fullName, `Acceso temporal activo (${remainingMinutes ?? 5} min restantes).`, [
        {
          text: 'Dejar de ver ficha',
          style: 'destructive',
          onPress: async () => {
            await removeSharedChild(child.id, userId);
            onDeleted();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert(fullName, undefined, [
      { text: 'Editar hijo', onPress: onEdit },
      { text: 'Eliminar hijo', style: 'destructive', onPress: () => confirmDeleteChild(child, onDeleted) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View className="mb-4 rounded-[28px] bg-nanny-card" style={SHADOWS.card}>
      <View className="overflow-hidden rounded-[28px]">
        <TouchableOpacity
          onPress={openMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Más opciones de ${fullName}`}
          className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-nanny-soft"
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={palette.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="flex-row items-center px-5 pb-2 pt-5">
          <Avatar child={child} size={72} />
          <View className="ml-4 flex-1 pr-8">
            <Text style={{ color: palette.text }} className="font-figtree-medium text-[19px]">{fullName}</Text>
            <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[14px]">
              {getAge(child.birthDate)} años · Sangre {child.bloodGroup || '—'}
            </Text>
            {child.isShared && remainingMinutes !== null && (
              <View className="mt-2 self-start rounded-full bg-nanny-soft px-2.5 py-0.5">
                <Text style={{ color: palette.blue }} className="font-figtree-medium text-[11px]">
                  Acceso temporal · {remainingMinutes} {remainingMinutes === 1 ? 'min restante' : 'min restantes'}
                </Text>
              </View>
            )}
            {allergyRecords(child.allergies).length > 0 && (
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                {allergyRecords(child.allergies).map((allergy) => (
                  <View key={allergy.name} className="rounded-full bg-[#F9E1E6] px-2.5 py-0.5">
                    <Text className="font-figtree-medium text-[11px] text-[#8A3A55]">{allergy.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="flex-row py-3">
          <PreviewStat value={child.conditions.length + child.diseases.length} label="Condiciones" />
          <PreviewStat value={activeMedicines} label="Medicación" divider />
          <PreviewStat value={pendingVaccines} label="Vacunas pend." divider />
        </TouchableOpacity>

        {child.isShared ? (
          <View className="border-t border-nanny-border px-5 py-3">
            <Text style={{ color: palette.muted }} className="font-figtree text-caption">
              Ficha compartida mediante QR (solo lectura)
            </Text>
          </View>
        ) : (
          <View className="flex-row border-t border-nanny-border">
            <TouchableOpacity
              onPress={onShareQr}
              className="flex-1 flex-row items-center justify-center border-r border-nanny-border py-4"
              accessibilityRole="button"
              accessibilityLabel={`Compartir QR de ${fullName}`}
            >
              <Ionicons name="qr-code-outline" size={17} color={COLORS.primaryDark} />
              <Text style={{ color: COLORS.primaryDark }} className="ml-2.5 font-figtree text-[16px]">Compartir QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => exportData(child.id)}
              disabled={exporting}
              className="flex-1 flex-row items-center justify-center py-4"
              accessibilityRole="button"
              accessibilityLabel={`Guardar PDF de ${fullName}`}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={COLORS.primaryDark} />
              ) : (
                <Ionicons name="download-outline" size={17} color={COLORS.primaryDark} />
              )}
              <Text style={{ color: COLORS.primaryDark }} className="ml-2.5 font-figtree text-[16px]">Guardar PDF</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function PreviewStat({ value, label, divider = false }: { value: number; label: string; divider?: boolean }) {
  return (
    <View className={`flex-1 items-center py-2 ${divider ? 'border-l border-nanny-border' : ''}`}>
      <Text style={{ color: palette.text }} className="font-figtree-medium text-[18px]">{value}</Text>
      <Text style={{ color: palette.muted }} className="mt-1 font-figtree text-[11px]">{label}</Text>
    </View>
  );
}

function ChildPickerScreen() {
  const navigation = useNavigation<any>();
  const { selectedUserId: userId } = useFamilySelection();
  const [children, setChildren] = useState<ChildPreview[]>([]);
  const [sharedChildren, setSharedChildren] = useState<SharedChildProfile[]>([]);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const localShared = await loadSharedChildren(userId);
      setSharedChildren(localShared);

      if (userId === null) {
        setChildren([]);
        setUserAvatarUrl(null);
        return;
      }
      const response = await fetch(`${API_URL}/user/${userId}`);
      if (!response.ok) throw new Error();
      const profile = await response.json();
      setUserAvatarUrl(profile.avatarUrl ?? null);
      const profiles = Array.isArray(profile.children)
        ? await Promise.all(profile.children.map(async (child: Child) => {
          return fetchChildDashboard(child.id) as Promise<ChildPreview>;
        }))
        : [];
      setChildren(profiles);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los niños.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadChildren();
      const interval = setInterval(async () => {
        const localShared = await loadSharedChildren(userId);
        setSharedChildren(localShared);
      }, 15000);
      return () => clearInterval(interval);
    }, [loadChildren, userId]),
  );
  useFocusEffect(useCallback(() => { loadChildren(); }, [loadChildren]));

  const combinedChildren: ChildPreview[] = [
    ...children,
    ...sharedChildren.filter(
      (shared) => !children.some((own) => Math.abs(own.id) === Math.abs(shared.id)),
    ),
  ];

  const handleOpenScanQr = () => {
    if (userId === null) {
      Alert.alert(
        'Selecciona un usuario',
        'Debes seleccionar primero un usuario en la pestaña Inicio para vincular el menor a su perfil.',
      );
      return;
    }
    navigation.navigate('ScanQrAccess', { ownChildIds: children.map((c) => c.id) });
  };

  return (
    <Shell>
      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <View className="flex-1 pr-3">
          <Text style={{ color: palette.text }} className="font-figtree-medium text-display">
            Libro de familia
          </Text>
          <Text style={{ color: palette.muted }} className="mt-1 font-figtree text-[14px]">
            Pulsa para ver su información médica
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={handleOpenScanQr}
            accessibilityRole="button"
            accessibilityLabel="Leer QR"
            className="h-11 w-11 items-center justify-center rounded-full bg-nanny-card"
            style={SHADOWS.card}
          >
            <Ionicons name="scan-outline" size={20} color={palette.blue} />
          </TouchableOpacity>
          {/* Igual que en Inicio: abre el selector de usuarios (con "Editar mi perfil") */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Datos', { openUserPicker: Date.now() })}
            accessibilityRole="button"
            accessibilityLabel="Cambiar de usuario o editar mi perfil"
            className="relative"
          >
            <View className="h-11 w-11 rounded-full border-2 border-nanny-blue p-0.5">
              <View className="flex-1 items-center justify-center overflow-hidden rounded-full bg-nanny-blue">
                {userAvatarUrl ? (
                  <Image source={{ uri: userAvatarUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text className="font-figtree-semibold text-body text-white">{userId ? String(userId) : '?'}</Text>
                )}
              </View>
            </View>
            <View className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-nanny-blue">
              <Ionicons name="person" size={8} color="#ffffff" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 48 }}>
        {userId === null && combinedChildren.length === 0 && (
          <View className="mb-6 px-1">
            <Text style={{ color: palette.text }} className="font-figtree-semibold text-subtitle">
              Selecciona un usuario
            </Text>
            <Text style={{ color: palette.muted }} className="mt-2 font-figtree text-body">
              Elige un usuario en la pestaña Inicio para cargar sus hijos o vincular temporalmente un menor mediante QR.
            </Text>
          </View>
        )}
        {loading ? <ActivityIndicator size="large" color={palette.blue} /> : combinedChildren.map((child) => (
          <ChildCard
            key={`${child.isShared ? 'shared' : 'own'}-${child.id}`}
            child={child}
            userId={userId}
            onPress={() => navigation.navigate('ChildProfile', { childId: child.id, sharedChild: child.isShared ? child : undefined })}
            onEdit={() => navigation.navigate('RegistroHijo', { child })}
            onShareQr={() => navigation.navigate('ShareQrAccess', { child })}
            onDeleted={loadChildren}
          />
        ))}
        {userId !== null && (
          <TouchableOpacity
            onPress={() => navigation.navigate('RegistroHijo', { userId })}
            className="flex-row items-center justify-center rounded-full border-[1.5px] border-dashed border-[#BFAFCB] bg-white/30 py-4"
            accessibilityRole="button"
            accessibilityLabel="Añadir niño o niña"
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primaryDark} />
            <Text style={{ color: COLORS.primaryDark }} className="ml-2 font-figtree-medium text-[16px]">Añadir niño/a</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Shell>
  );
}

// Cabecera de sección: "Alergias · 3" y "+ Añadir"
function Section({
  title,
  count,
  onAdd,
  children,
}: {
  title: string;
  count?: string | number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-baseline">
          <Text style={{ color: palette.text }} className="font-figtree-medium text-[20px]">{title}</Text>
          {count !== undefined && (
            <Text style={{ color: palette.text }} className="ml-1.5 font-figtree text-[14px]">· {count}</Text>
          )}
        </View>
        {onAdd && (
          <TouchableOpacity onPress={onAdd} hitSlop={8}>
            <Text style={{ color: palette.text }} className="font-figtree text-[18px]">+ Añadir</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// Fila blanca de la ficha (alergia, vacuna, condición, medicamento)
function RowCard({
  onPress,
  disabled,
  accessibilityLabel,
  children,
  align = 'center',
}: {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
  align?: 'center' | 'start';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      className={`mb-2.5 flex-row rounded-[22px] bg-nanny-card px-4 py-4 ${align === 'center' ? 'items-center' : 'items-start'}`}
      style={[SHADOWS.card, { minHeight: 70 }]}
    >
      <View className="flex-1 flex-row items-center">{children}</View>
      {onPress && !disabled && (
        <Ionicons name="chevron-forward" size={16} color={palette.muted} style={{ marginLeft: 8, alignSelf: 'center' }} />
      )}
    </TouchableOpacity>
  );
}

function ShareQrScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as ChildPreview;
  const [copied, setCopied] = useState(false);

  const childSlug = getChildSlug(child.name, child.id);
  const inviteCode = buildShareInviteLink(child);

  const handleCopyInvite = async () => {
    try {
      const mode = await copyInviteLink(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (mode === 'copied') {
        Alert.alert('Enlace copiado', 'El código de invitación se ha copiado al portapapeles.');
      }
    } catch {
      Alert.alert('Código de invitación', inviteCode);
    }
  };

  return (
    <Shell whiteTop>
      <View className="flex-row items-center justify-between border-b border-nanny-border bg-nanny-card px-6 py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="min-w-[72px]"
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Text style={{ color: palette.muted }} className="text-body font-figtree-medium">
            Cerrar
          </Text>
        </TouchableOpacity>
        <Text style={{ color: palette.text }} className="text-subtitle font-figtree-semibold">
          Compartir acceso
        </Text>
        <View className="min-w-[72px]" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 }}>
        <View className="items-center">
          <View className="items-center justify-center rounded-3xl border border-nanny-border bg-white p-6" style={SHADOWS.card}>
            <QRCodeSvg value={inviteCode} size={230} color="#2D1E36" backgroundColor="#ffffff" />
          </View>
        </View>

        <View className="mt-7 rounded-2xl border border-nanny-border bg-nanny-surface px-5 py-4">
          <Text style={{ color: palette.muted }} className="text-caption font-figtree-semibold uppercase tracking-wider">
            ID DEL MENOR
          </Text>
          <Text style={{ color: palette.text }} className="mt-1 text-subtitle font-figtree-semibold">
            {childSlug}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCopyInvite}
          accessibilityRole="button"
          accessibilityLabel="Copiar enlace de invitación"
          style={{ backgroundColor: palette.blue }}
          className="mt-4 flex-row items-center justify-center rounded-2xl py-4"
        >
          <Ionicons name={copied ? 'checkmark-outline' : 'copy-outline'} size={20} color="#ffffff" />
          <Text className="ml-2.5 text-body font-figtree-semibold text-white">
            {copied ? 'Enlace copiado' : 'Copiar enlace de invitación'}
          </Text>
        </TouchableOpacity>

        <View className="mt-5 flex-row items-start rounded-2xl border border-[#ead9bc] bg-[#fdf5e6] p-4">
          <Ionicons name="information-circle-outline" size={22} color="#8c6229" style={{ marginTop: 1 }} />
          <Text style={{ color: '#7d5a2b' }} className="font-figtree ml-3 flex-1 text-body leading-5">
            Demostración local: el QR comparte solo identidad básica. No sincroniza cambios médicos entre dispositivos.
          </Text>
        </View>
      </ScrollView>
    </Shell>
  );
}

function ScanQrScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { selectedUserId: userId } = useFamilySelection();
  const ownChildIds: number[] = Array.isArray(route.params?.ownChildIds) ? route.params.ownChildIds : [];
  const [codeInput, setCodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [hasScannedInModal, setHasScannedInModal] = useState(false);

  const linkProfileFromRawCode = async (raw: string) => {
    if (userId === null) {
      throw new Error('Debes seleccionar primero un usuario activo para vincular el menor.');
    }
    const profile = decodeChildShareCode(raw);
    if (ownChildIds.some((id) => Math.abs(id) === Math.abs(profile.id))) {
      throw new Error('Este menor ya pertenece a tu Libro de familia.');
    }
    await saveSharedChild(profile, userId);
    Alert.alert(
      'Menor vinculado',
      `Se ha añadido a ${[profile.name, profile.surname].filter(Boolean).join(' ')} con acceso temporal durante 5 minutos.`,
      [
        {
          text: 'Ver en Libro de familia',
          onPress: () => navigation.navigate('ChildPicker'),
        },
      ],
    );
  };

  const handleSelectCamera = async () => {
    const hasPermission = await checkCameraPermissions();
    if (!hasPermission) {
      Alert.alert(
        CAMERA_PERMISSION_REQUIRED_TITLE,
        CAMERA_PERMISSION_REQUIRED_MESSAGE,
        [{ text: 'Entendido' }],
      );
      return;
    }
    setHasScannedInModal(false);
    setCameraModalVisible(true);
  };

  const handleSelectGallery = async () => {
    setScanning(true);
    try {
      const hasPermission = await checkMediaLibraryPermissions();
      if (!hasPermission) {
        Alert.alert(
          MEDIA_PERMISSION_REQUIRED_TITLE,
          MEDIA_PERMISSION_REQUIRED_MESSAGE,
          [{ text: 'Entendido' }],
        );
        return;
      }

      const { decodedText, cancelled } = await pickAndDecodeQrFromGallery();
      if (cancelled) return;

      if (!decodedText) {
        Alert.alert(
          'No se detectó un QR',
          'No se pudo encontrar un código QR nítido en la imagen seleccionada. Prueba con otra foto o pega el código HC1... manualmente abajo.',
        );
        return;
      }

      setCodeInput(decodedText);
      try {
        await linkProfileFromRawCode(decodedText);
      } catch (err: any) {
        Alert.alert('Código leído no válido', err?.message || 'El QR de la imagen no corresponde a una ficha válida.');
      }
    } finally {
      setScanning(false);
    }
  };

  const handleOpenCameraOrImage = () => {
    if (Platform.OS === 'web') {
      void handleSelectGallery();
      return;
    }

    Alert.alert(
      'Añadir mediante QR',
      '¿Cómo quieres escanear el código QR compartido por el otro tutor?',
      [
        {
          text: 'Abrir cámara',
          onPress: () => { void handleSelectCamera(); },
        },
        {
          text: 'Elegir imagen de la galería',
          onPress: () => { void handleSelectGallery(); },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
    );
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (hasScannedInModal || !data) return;
    setHasScannedInModal(true);
    setCameraModalVisible(false);
    setCodeInput(data);
    try {
      await linkProfileFromRawCode(data);
    } catch (err: any) {
      Alert.alert('Código QR no válido', err?.message || 'El código escaneado no corresponde a una ficha válida.');
    }
  };

  const handleLinkChild = async () => {
    try {
      await linkProfileFromRawCode(codeInput);
    } catch (err: any) {
      Alert.alert('No se pudo vincular', err?.message || 'El código introducido no es válido.');
    }
  };

  const canSubmit = codeInput.trim().length > 0;

  return (
    <Shell whiteTop>
      <Modal
        visible={cameraModalVisible}
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between bg-nanny-text px-6 py-4">
            <TouchableOpacity
              onPress={() => setCameraModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar cámara"
            >
              <Text className="text-body font-figtree-semibold text-white">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-subtitle font-figtree-semibold text-white">Escanear código QR</Text>
            <View className="w-16" />
          </View>

          <View className="flex-1">
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={hasScannedInModal ? undefined : handleBarcodeScanned}
            />
            <View
              pointerEvents="none"
              className="absolute inset-0 items-center justify-center"
            >
              <View className="h-64 w-64 rounded-3xl border-2 border-white/80 bg-transparent" />
              <Text className="mt-5 rounded-full bg-black/60 px-4 py-2 text-center text-body font-figtree-medium text-white">
                Apunta al código QR compartido por el otro tutor
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between border-b border-nanny-border bg-nanny-card px-6 py-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="min-w-[72px]"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text style={{ color: palette.muted }} className="text-body font-figtree-medium">
            Cancelar
          </Text>
        </TouchableOpacity>
        <Text style={{ color: palette.text }} className="text-subtitle font-figtree-semibold">
          Añadir mediante QR
        </Text>
        <View className="min-w-[72px]" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={handleOpenCameraOrImage}
            disabled={scanning}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Abrir cámara o elegir imagen"
            className="items-center rounded-3xl border-2 border-dashed border-nanny-border-strong bg-white/40 px-6 py-10"
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nanny-soft">
              <Ionicons name="qr-code-outline" size={30} color="#654875" />
            </View>
            <Text style={{ color: palette.text }} className="text-center text-subtitle font-figtree-semibold">
              Abrir cámara o elegir imagen
            </Text>
            <Text style={{ color: palette.muted }} className="font-figtree mt-2 text-center text-body leading-5">
              Haz una foto clara del código QR compartido por el otro tutor.
            </Text>
          </TouchableOpacity>

          <View className="my-7 flex-row items-center">
            <View className="h-[1px] flex-1 bg-nanny-border" />
            <Text style={{ color: palette.muted }} className="font-figtree mx-4 text-body">
              o pega el código
            </Text>
            <View className="h-[1px] flex-1 bg-nanny-border" />
          </View>

          <TextInput
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder="HC1... o enlace de invitación"
            placeholderTextColor="#6E5D78"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            style={{ color: palette.text, minHeight: 130, textAlignVertical: 'top' }}
            className="font-figtree rounded-3xl border border-nanny-border-strong bg-nanny-card px-5 py-4 text-body"
          />

          <TouchableOpacity
            onPress={handleLinkChild}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Vincular menor"
            style={{ backgroundColor: canSubmit ? palette.blue : '#D5C3DD' }}
            className="mt-5 items-center justify-center rounded-2xl py-4"
          >
            <Text className="text-body font-figtree-semibold text-white">
              Vincular menor
            </Text>
          </TouchableOpacity>

          <Text style={{ color: palette.muted }} className="font-figtree mt-4 px-2 text-center text-caption leading-5">
            Prototipo local: la ficha importada no recibirá futuras actualizaciones del otro dispositivo.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function ChildProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { selectedUserId: userId } = useFamilySelection();
  const [data, setData] = useState<(Dashboard & { isShared?: boolean; expiresAt?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  // El historial médico completo lo ven PRO y ADMIN (igual que ProGuard en el backend);
  // el resto ve una vista previa bloqueada. Se recarga cada vez que se recarga el perfil.
  const { selectedUserRole } = useFamilySelection();
  const canSeeHistory = selectedUserRole === 'PRO' || selectedUserRole === 'ADMIN';
  const [historyKey, setHistoryKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setHistoryKey((key) => key + 1);
    try {
      if (route.params?.sharedChild) {
        setData(route.params.sharedChild);
        return;
      }
      if (route.params?.childId < 0) {
        const sharedList = await loadSharedChildren(userId);
        const found = sharedList.find((c) => c.id === route.params.childId);
        if (found) {
          setData(found);
          return;
        }
      }
      setData(await fetchChildDashboard(route.params.childId));
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil del niño.');
    } finally {
      setLoading(false);
    }
  }, [route.params?.childId, route.params?.sharedChild, userId]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      const interval = setInterval(async () => {
        if (route.params?.sharedChild?.expiresAt || route.params?.childId < 0) {
          const sharedList = await loadSharedChildren(userId);
          const targetId = route.params?.sharedChild?.id ?? route.params?.childId;
          const found = sharedList.find((c) => c.id === targetId);
          if (!found) {
            Alert.alert('Permiso caducado', 'El permiso temporal de 5 minutos para ver este perfil ha finalizado.');
            navigation.navigate('ChildPicker');
          } else {
            setData(found);
          }
        }
      }, 15000);
      return () => clearInterval(interval);
    }, [loadDashboard, navigation, route.params?.childId, route.params?.sharedChild, userId]),
  );
  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  if (loading || !data) {
    return <Shell><ActivityIndicator size="large" color={palette.blue} style={{ flex: 1 }} /></Shell>;
  }

  const isShared = !!data.isShared;
  const remainingMinutes = isShared && data.expiresAt ? getRemainingShareMinutes(data.expiresAt) : null;
  const fullName = [data.name, data.surname].filter(Boolean).join(' ');
  const applied = data.vaccines.filter((vaccine) => vaccine.appliedAt).length;
  const openForm = (screen: string) => navigation.navigate(screen, { child: data });

  // Menú con las acciones de un elemento (alergia, vacuna, condición o medicamento)
  const itemMenu = (title: string, onEdit: () => void, onDelete: () => Promise<void>) => {
    if (isShared) return;
    Alert.alert(title, undefined, [
      { text: 'Editar', onPress: onEdit },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Eliminar', `¿Seguro que quieres eliminar "${title}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                try {
                  await onDelete();
                  await loadDashboard();
                } catch {
                  Alert.alert('Error', 'No se pudo eliminar.');
                }
              },
            },
          ]);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const deleteRecord = (path: string, id: number) => async () => {
    const response = await fetch(`${API_URL}/${path}/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error();
  };

  const deleteAllergy = (name: string) => async () => {
    const remaining = allergyRecords(data.allergies).filter((item) => item.name !== name);
    const response = await fetch(`${API_URL}/child/${data.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allergies: JSON.stringify(remaining) }),
    });
    if (!response.ok) throw new Error();
  };

  const editItem = (screen: string, item: unknown) => navigation.navigate(screen, { child: data, item });

  const editChild = () => navigation.navigate('RegistroHijo', { child: data });


  const allergies = allergyRecords(data.allergies);
  // Vacunas en orden cronológico: primero las aplicadas y al final las pendientes
  const vaccinesInOrder = [
    ...data.vaccines.filter((v) => v.appliedAt).sort((a, b) => new Date(a.appliedAt!).getTime() - new Date(b.appliedAt!).getTime()),
    ...data.vaccines.filter((v) => !v.appliedAt).sort((a, b) => new Date(a.scheduledFor || 0).getTime() - new Date(b.scheduledFor || 0).getTime()),
  ];

  return (
    <Shell whiteTop>
      <Header
        title={data.name}
        backLabel="Familia"
        onBack={() => navigation.navigate('ChildPicker')}
        action={isShared ? (
          <TouchableOpacity
            onPress={async () => {
              await removeSharedChild(data.id, userId);
              navigation.navigate('ChildPicker');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Dejar de ver a ${fullName}`}
            className="flex-row items-center"
          >
            <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
            <Text style={{ color: COLORS.danger }} className="ml-1 font-figtree-medium text-[16px]">Quitar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={editChild}
            accessibilityRole="button"
            accessibilityLabel={`Editar a ${fullName}`}
            className="flex-row items-center"
          >
            <Ionicons name="create-outline" size={19} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-1.5 font-figtree-medium text-[16px]">Editar</Text>
          </TouchableOpacity>
        )}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48 }}>
        {/* Tarjeta del menor */}
        <View className="mb-8 flex-row items-center rounded-[28px] bg-nanny-card px-5 py-5" style={SHADOWS.card}>
          <Avatar child={data} size={72} ringColor="#E58AA8" />
          <View className="ml-4 flex-1">
            <Text style={{ color: palette.text }} className="font-figtree-medium text-[24px]">{fullName}</Text>
            <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[14px]">
              {getAge(data.birthDate)} años · {formatDayLong(data.birthDate)}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {data.bloodGroup && (
                <View className="rounded-full bg-nanny-soft px-3 py-0.5">
                  <Text style={{ color: COLORS.primaryDark }} className="font-figtree-medium text-[12px] uppercase tracking-wide">
                    Sangre {data.bloodGroup}
                  </Text>
                </View>
              )}
              {isShared && remainingMinutes !== null && (
                <View className="rounded-full bg-nanny-soft px-3 py-0.5">
                  <Text style={{ color: palette.blue }} className="font-figtree-medium text-[12px]">
                    Solo lectura · {remainingMinutes} min
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <Section title="Alergias" count={allergies.length} onAdd={isShared ? undefined : () => openForm('AddAllergy')}>
          {allergies.map((allergy) => {
            const severity = SEVERITY_STYLES[allergy.severity];
            return (
              <RowCard
                key={allergy.name}
                disabled={isShared}
                onPress={() => itemMenu(allergy.name, () => editItem('AddAllergy', allergy), deleteAllergy(allergy.name))}
                accessibilityLabel={`Alergia ${allergy.name}, gravedad ${allergy.severity}`}
              >
                <View style={{ backgroundColor: severity.bg }} className="mr-4 rounded-full px-2.5 py-1">
                  <Text style={{ color: severity.color }} className="font-figtree-medium text-[13px]">{severity.label}</Text>
                </View>
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="font-figtree-medium text-[16px]">{allergy.name}</Text>
                  {allergy.notes ? (
                    <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[12px]" numberOfLines={2}>
                      {allergy.notes}
                    </Text>
                  ) : null}
                </View>
              </RowCard>
            );
          })}
        </Section>

        <Section
          title="Vacunas"
          count={`${applied}/${data.vaccines.length} aplicadas`}
          onAdd={isShared ? undefined : () => openForm('AddVaccine')}
        >
          {vaccinesInOrder.map((vaccine) => {
            const done = !!vaccine.appliedAt;
            const showNext = !!vaccine.scheduledFor && (!done || new Date(vaccine.scheduledFor) > new Date());
            const details = [done ? formatDayShort(vaccine.appliedAt!) : null, vaccine.lot ? `Lote ${vaccine.lot}` : null]
              .filter(Boolean)
              .join(' · ');
            return (
              <RowCard
                key={vaccine.id}
                disabled={isShared}
                onPress={() => itemMenu(vaccine.name, () => editItem('AddVaccine', vaccine), deleteRecord('vaccine', vaccine.id))}
              >
                <View
                  style={{ backgroundColor: done ? VACCINE_DONE : VACCINE_PENDING }}
                  className="mr-4 h-6 w-6 items-center justify-center rounded-full"
                >
                  <Ionicons name={done ? 'checkmark' : 'time-outline'} size={done ? 15 : 14} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="font-figtree-medium text-[16px]">{vaccine.name}</Text>
                  {done ? (
                    details ? <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[12px]">{details}</Text> : null
                  ) : (
                    <Text style={{ color: '#C2577A' }} className="mt-0.5 font-figtree text-[12px]">Pendiente</Text>
                  )}
                  {showNext && (
                    <Text style={{ color: palette.blue }} className="mt-1 font-figtree-medium text-[12px]">
                      Próxima: {formatDayShort(vaccine.scheduledFor!)}
                    </Text>
                  )}
                </View>
              </RowCard>
            );
          })}
        </Section>

        <Section
          title="Condiciones"
          count={data.conditions.length + data.diseases.length}
          onAdd={isShared ? undefined : () => openForm('AddCondition')}
        >
          {data.diseases.map((disease) => (
            <RowCard
              key={`disease-${disease.id}`}
              disabled={isShared}
              onPress={() => itemMenu(disease.name, () => editItem('AddCondition', disease), deleteRecord('disease', disease.id))}
            >
              <View className="flex-1">
                <Text style={{ color: palette.text }} className="font-figtree-medium text-[16px]">{disease.name}</Text>
                {disease.diagnosticatedAge && (
                  <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[12px]">
                    Diagnosticada: {formatMonthYearCap(disease.diagnosticatedAge)}
                  </Text>
                )}
                {disease.description ? (
                  <Text style={{ color: palette.muted }} className="mt-1 font-figtree text-[12px]">{disease.description}</Text>
                ) : null}
              </View>
            </RowCard>
          ))}
          {data.conditions.map((condition) => (
            <RowCard key={condition.id}>
              <View className="flex-1">
                <Text style={{ color: palette.text }} className="font-figtree-medium text-[16px]">
                  {condition.description || condition.desciption || 'Condición registrada'}
                </Text>
                <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[12px]">
                  Registrada: {formatMonthYearCap(condition.timestamp)}
                </Text>
              </View>
            </RowCard>
          ))}
        </Section>

        <Section title="Medicamentos" count={data.medicine.length} onAdd={isShared ? undefined : () => openForm('AddMedicine')}>
          {data.medicine.map((medicine) => {
            const active = isMedicineActive(medicine);
            const doseLine = [medicine.dosage, frequencyLabel(medicine.intervalHours)].filter(Boolean).join(' · ');
            const schedule = scheduleLabel(medicine.instructions);
            return (
              <TouchableOpacity
                key={medicine.id}
                disabled={isShared}
                activeOpacity={0.7}
                onPress={() => itemMenu(medicine.name, () => editItem('AddMedicine', medicine), deleteRecord('medicine', medicine.id))}
                className="mb-2.5 flex-row rounded-[22px] bg-nanny-card px-4 py-4"
                style={SHADOWS.card}
              >
                <View
                  style={{ backgroundColor: active ? VACCINE_PENDING : '#B9AEC2' }}
                  className="mr-3.5 mt-2 h-2 w-2 rounded-full"
                />
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="font-figtree-medium text-[16px]">{medicine.name}</Text>
                  {doseLine ? <Text style={{ color: palette.muted }} className="mt-1 font-figtree text-[14px]">{doseLine}</Text> : null}
                  {schedule ? <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[14px]">{schedule}</Text> : null}
                  {medicine.startDate ? (
                    <Text style={{ color: palette.muted }} className="mt-0.5 font-figtree text-[14px]">
                      Desde: {formatDayCap(medicine.startDate)}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-start">
                  <View className={`rounded-full px-2.5 py-0.5 ${active ? 'bg-nanny-soft' : 'bg-[#EDE7F0]'}`}>
                    <Text style={{ color: active ? COLORS.primaryDark : palette.muted }} className="font-figtree-medium text-[13px]">
                      {active ? 'Activo' : 'Finalizado'}
                    </Text>
                  </View>
                  {!isShared && (
                    <Ionicons name="chevron-forward" size={16} color={palette.muted} style={{ marginLeft: 8, marginTop: 3 }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Section>

        {canSeeHistory ? (
          <HealthHistory key={historyKey} childId={data.id} />
        ) : (
          <HealthHistoryLocked
            onUpgrade={() => Alert.alert('Plan PRO', 'La mejora de plan estará disponible próximamente.')}
          />
        )}
      </ScrollView>
    </Shell>
  );
}

function ChildBanner({ child }: { child: Child }) {
  return (
    <View className="mx-6 mb-7 flex-row items-center rounded-3xl bg-nanny-card p-6" style={SHADOWS.card}>
      <Avatar child={child} size={66} />
      <View className="ml-5 flex-1">
        <Text style={{ color: palette.text }} className="text-title font-figtree-bold">{child.name}</Text>
        <Text style={{ color: palette.muted }} className="font-figtree mt-1 text-body">Esta información se añadirá a su perfil médico.</Text>
      </View>
    </View>
  );
}

const FormScrollContext = createContext<((input: TextInputInstance) => void) | null>(null);

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  scrollIntoViewOnFocus = false,
  tooltip,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  scrollIntoViewOnFocus?: boolean;
  tooltip?: string;
}) {
  const scrollToInput = useContext(FormScrollContext);
  const inputRef = useRef<TextInputInstance | null>(null);
  const [showTip, setShowTip] = useState(false);
  return (
    <View className="mb-6">
      <View className="mb-2 flex-row items-center">
        <Text style={{ color: palette.muted }} className="font-figtree text-body">{label}</Text>
        {tooltip && (
          <TouchableOpacity
            onPress={() => setShowTip((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-1.5"
          >
            <Ionicons name="information-circle-outline" size={20} color={palette.muted} />
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setShowTip(false);
        }}
        placeholder={placeholder}
        placeholderTextColor="#8F8296"
        multiline={multiline}
        onFocus={() => {
          if (scrollIntoViewOnFocus && scrollToInput && inputRef.current) {
            setTimeout(() => scrollToInput(inputRef.current!), 300);
          }
        }}
        style={{ color: palette.text, minHeight: multiline ? 140 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        className="rounded-3xl border border-nanny-border bg-nanny-card px-6 py-4 text-body"
      />
      {tooltip && showTip && (
        <View className="mt-2 rounded-xl bg-nanny-text px-3 py-2">
          <Text className="font-figtree text-caption text-white">{tooltip}</Text>
        </View>
      )}
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  maximumDate,
}: {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  maximumDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-6">
      <Text style={{ color: palette.muted }} className="font-figtree mb-2 text-body">{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} className="flex-row items-center justify-between rounded-3xl border border-nanny-border bg-nanny-card px-6 py-4">
        <Text style={{ color: value ? palette.text : '#8F8296' }} className="font-figtree text-body">{value ? value.toLocaleDateString('es-ES') : 'dd/mm/aaaa'}</Text>
        <Ionicons name="calendar-outline" size={22} color={palette.text} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          maximumDate={maximumDate}
          onValueChange={(_, selected) => {
            if (selected) {
              const max = maximumDate ? new Date(maximumDate) : null;
              if (max && selected.getTime() > max.getTime()) {
                Alert.alert('Fecha no válida', 'La fecha de una vacuna aplicada no puede ser posterior a la actual.');
                onChange(new Date());
              } else {
                onChange(selected);
              }
            }
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </View>
  );
}

function FormLayout({
  title,
  child,
  children,
  onSave,
  saving,
}: {
  title: string;
  child: Child;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
}) {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);
  return (
    <Shell whiteTop>
      <Header
        title={title}
        onBack={() => navigation.goBack()}
        action={<TouchableOpacity onPress={onSave} disabled={saving}><Text style={{ color: saving ? '#D5C3DD' : palette.blue }} className="font-figtree-semibold text-[16px]">Guardar</Text></TouchableOpacity>}
      />
      <KeyboardAvoidingView
        behavior="height"
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <FormScrollContext.Provider value={(input) => {
          scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(input, 180, true);
        }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ paddingTop: 38, paddingBottom: 260 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            <ChildBanner child={child} />
            <View className="px-6">{children}</View>
          </ScrollView>
        </FormScrollContext.Provider>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function AddVaccineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const item = route.params.item as Vaccine | undefined; // si existe, se edita esa vacuna
  const [name, setName] = useState(item?.name ?? '');
  const [applied, setApplied] = useState(item ? !!item.appliedAt : true);
  const [appliedAt, setAppliedAt] = useState<Date | null>(item ? (item.appliedAt ? new Date(item.appliedAt) : null) : new Date());
  const [scheduledFor, setScheduledFor] = useState<Date | null>(item?.scheduledFor ? new Date(item.scheduledFor) : null);
  const [lot, setLot] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSetApplied = (value: boolean) => {
    setApplied(value);
    if (value) {
      const now = new Date();
      if (appliedAt && appliedAt.getTime() > now.getTime()) {
        setAppliedAt(now);
      }
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Falta información', 'Introduce el nombre de la vacuna.');
    if (applied && appliedAt) {
      const now = new Date();
      if (appliedAt.getTime() > now.getTime()) {
        return Alert.alert('Fecha no válida', 'La fecha de una vacuna aplicada no puede ser posterior a la actual.');
      }
    }
    setSaving(true);
    try {
      const response = await fetch(item ? `${API_URL}/vaccine/${item.id}` : `${API_URL}/vaccine`, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          childId: child.id,
          appliedAt: applied ? appliedAt?.toISOString() : null,
          scheduledFor: applied ? undefined : scheduledFor?.toISOString(),
        }),
      });
      if (!response.ok) throw new Error();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la vacuna.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormLayout title={item ? 'Editar vacuna' : 'Nueva vacuna'} child={child} onSave={save} saving={saving}>
      <Field label="Nombre *" placeholder="Ej. Triple vírica" value={name} onChangeText={setName} />
      <Text style={{ color: palette.muted }} className="font-figtree mb-2 text-body">Estado *</Text>
      <View className="mb-6 flex-row gap-3">
        {[true, false].map((value) => (
          <TouchableOpacity
            key={String(value)}
            onPress={() => handleSetApplied(value)}
            style={{ borderColor: applied === value ? palette.blue : '#E7DAEA', backgroundColor: applied === value ? '#EAE0F2' : palette.card }}
            className="flex-1 items-center rounded-3xl border p-4"
          >
            <Text style={{ color: applied === value ? palette.blue : palette.muted }} className="text-body font-figtree-semibold">{value ? 'Aplicada' : 'Pendiente'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {applied && (
        <DateField
          label="Fecha de aplicación *"
          value={appliedAt}
          onChange={setAppliedAt}
          maximumDate={new Date()}
        />
      )}
      <Field label="Número de lote" placeholder="Ej. A4821X" value={lot} onChangeText={setLot} />
      {!applied && <DateField label="Próxima dosis" value={scheduledFor} onChange={setScheduledFor} />}
    </FormLayout>
  );
}

function AddAllergyScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const item = route.params.item as Allergy | undefined; // si existe, se edita esa alergia
  const [name, setName] = useState(item?.name ?? '');
  const [severity, setSeverity] = useState<AllergySeverity>(item?.severity ?? 'moderada');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const allergy = name.trim();
    if (!allergy) return Alert.alert('Falta información', 'Introduce el nombre de la alergia.');
    setSaving(true);
    try {
      const existing = allergyRecords(child.allergies);
      const withoutDuplicate = existing.filter((record) => {
        const lower = record.name.toLocaleLowerCase();
        return lower !== allergy.toLocaleLowerCase() && lower !== item?.name.toLocaleLowerCase();
      });
      const allergies = JSON.stringify([...withoutDuplicate, {
        name: allergy,
        severity,
        notes: notes.trim() || undefined,
      }]);
      const response = await fetch(`${API_URL}/child/${child.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies }),
      });
      if (!response.ok) throw new Error();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la alergia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormLayout title={item ? 'Editar alergia' : 'Nueva alergia'} child={child} onSave={save} saving={saving}>
      <Field label="Nombre *" placeholder="Ej. Frutos secos" value={name} onChangeText={setName} />
      <Text style={{ color: palette.muted }} className="font-figtree mb-2 text-body">Gravedad *</Text>
      <View className="mb-6 flex-row gap-2">
        {(['leve', 'moderada', 'severa'] as AllergySeverity[]).map((option) => {
          const selected = severity === option;
          const optionColor = option === 'severa' ? '#a33327' : option === 'moderada' ? '#a3651d' : '#3f805c';
          return (
            <TouchableOpacity
              key={option}
              onPress={() => setSeverity(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{ borderColor: selected ? optionColor : '#E7DAEA', backgroundColor: selected ? '#fff7ed' : palette.card }}
              className="flex-1 items-center rounded-3xl border p-4"
            >
              <Text style={{ color: selected ? optionColor : palette.muted }} className="text-body font-figtree-semibold">
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Field label="Reacción o indicaciones" placeholder="Describe la reacción y qué hacer en caso de exposición" value={notes} onChangeText={setNotes} multiline scrollIntoViewOnFocus />
    </FormLayout>
  );
}

function AddConditionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const item = route.params.item as Dashboard['diseases'][number] | undefined; // si existe, se edita esa condición
  const [name, setName] = useState(item?.name ?? '');
  const [date, setDate] = useState<Date | null>(item?.diagnosticatedAge ? new Date(item.diagnosticatedAge) : null);
  const [notes, setNotes] = useState(item?.description ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Falta información', 'Introduce el nombre de la condición.');
    if (!date) return Alert.alert('Falta información', 'Selecciona la fecha de diagnóstico.');
    setSaving(true);
    try {
      const response = await fetch(item ? `${API_URL}/disease/${item.id}` : `${API_URL}/disease`, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: notes.trim() || undefined,
          diagnosticatedAge: date.toISOString(),
          childId: child.id,
        }),
      });
      if (!response.ok) throw new Error();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la condición.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormLayout title={item ? 'Editar condición' : 'Nueva condición'} child={child} onSave={save} saving={saving}>
      <Field label="Nombre *" placeholder="Ej. Asma leve" value={name} onChangeText={setName} />
      <DateField label="Fecha de diagnóstico *" value={date} onChange={setDate} />
      <Field label="Notas y seguimiento" placeholder="Tratamiento, especialista o indicaciones relevantes" value={notes} onChangeText={setNotes} multiline scrollIntoViewOnFocus />
    </FormLayout>
  );
}

function AddMedicineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const item = route.params.item as Dashboard['medicine'][number] | undefined; // si existe, se edita ese medicamento
  const [name, setName] = useState(item?.name ?? '');
  const [dosage, setDosage] = useState(item?.dosage ?? '');
  const [frequency, setFrequency] = useState(item?.intervalHours ? `cada ${item.intervalHours} h` : '');
  const [startDate, setStartDate] = useState<Date | null>(item?.startDate ? new Date(item.startDate) : null);
  const [times, setTimes] = useState(item?.instructions?.replace(/^Horarios:\s*/, '') ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedDosage = dosage.trim();
    const intervalHours = Number.parseInt(frequency.match(/\d+/)?.[0] || '', 10);
    if (!trimmedName || !trimmedDosage || !frequency.trim()) {
      return Alert.alert('Falta información', 'Completa nombre, dosis y frecuencia.');
    }
    if (!Number.isInteger(intervalHours) || intervalHours <= 0) {
      return Alert.alert('Frecuencia no válida', 'Introduce una frecuencia como "cada 8 h".');
    }
    if (!startDate) return Alert.alert('Falta información', 'Selecciona la fecha de inicio.');
    setSaving(true);
    try {
      const response = await fetch(item ? `${API_URL}/medicine/${item.id}` : `${API_URL}/medicine`, {
        method: item ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          dosage: trimmedDosage,
          intervalHours,
          startDate: startDate.toISOString(),
          instructions: times.trim() ? `Horarios: ${times.trim()}` : undefined,
          childId: child.id,
        }),
      });
      if (!response.ok) throw new Error();
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el medicamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormLayout title={item ? 'Editar medicamento' : 'Nuevo medicamento'} child={child} onSave={save} saving={saving}>
      <Field label="Nombre del medicamento *" placeholder="Ej. Loratadina 5 mg" value={name} onChangeText={setName} />
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label="Dosis *" placeholder="Ej. 5 ml" value={dosage} onChangeText={setDosage} tooltip="Indica la cantidad por toma, con su unidad. Ej: 2.5 ml, 1 comprimido, 5 gotas." /></View>
        <View className="flex-1"><Field label="Frecuencia *" placeholder="Ej. cada 8 h" value={frequency} onChangeText={setFrequency} /></View>
      </View>
      <DateField label="Fecha de inicio *" value={startDate} onChange={setStartDate} />
      <Field label="Horarios de toma" placeholder="Ej. 08:00, 16:00, 00:00" value={times} onChangeText={setTimes} />
      <Text style={{ color: palette.muted }} className="font-figtree -mt-4 mb-5 text-body">Separa cada horario con una coma.</Text>
    </FormLayout>
  );
}

export default function FamiliaScreen() {
  const { selectedUserId } = useFamilySelection();
  return (
    <Stack.Navigator key={`familia-${selectedUserId ?? 'none'}`} initialRouteName="ChildPicker" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChildPicker" component={ChildPickerScreen} />
      <Stack.Screen name="ChildProfile" component={ChildProfileScreen} />
      <Stack.Screen name="ShareQrAccess" component={ShareQrScreen} />
      <Stack.Screen name="ScanQrAccess" component={ScanQrScreen} />
      <Stack.Screen name="AddVaccine" component={AddVaccineScreen} />
      <Stack.Screen name="AddAllergy" component={AddAllergyScreen} />
      <Stack.Screen name="AddCondition" component={AddConditionScreen} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
    </Stack.Navigator>
  );
}
