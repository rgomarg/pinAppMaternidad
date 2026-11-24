import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { COLORS } from '../theme';

type Child = {
  id: number;
  name: string;
  surname?: string | null;
  sex?: 'MALE' | 'FEMALE' | null;
  birthDate: string;
  bloodGroup?: string | null;
  allergies?: string | null;
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

function Shell({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top }}>
      {children}
    </View>
  );
}

function Header({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between border-b border-nanny-border px-6 py-5">
      <TouchableOpacity onPress={onBack} disabled={!onBack} className="min-w-[72px]">
        {onBack && (
          <View className="flex-row items-center">
            <Ionicons name="chevron-back" size={20} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="text-body">Libro</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={{ color: palette.text }} className="text-subtitle font-semibold">{title}</Text>
      <View className="min-w-[72px] items-end">{action}</View>
    </View>
  );
}

function Avatar({ child, size = 72 }: { child: Child; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, borderColor: palette.red }}
      className="items-center justify-center overflow-hidden border-4 bg-nanny-soft"
    >
      <Text style={{ color: palette.blue, fontSize: size * 0.35 }} className="font-bold">
        {child.name?.charAt(0) || '?'}
      </Text>
    </View>
  );
}

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
  const activeMedicines = child.medicine.filter((medicine) => !medicine.endDate || new Date(medicine.endDate) >= new Date()).length;
  
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
    <View className="mb-5 overflow-hidden rounded-3xl border border-nanny-border bg-nanny-surface">
      <TouchableOpacity
        onPress={openMenu}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Más opciones de ${fullName}`}
        className="absolute right-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full"
      >
        <Ionicons name="ellipsis-horizontal" size={22} color={palette.muted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onPress} className="flex-row items-center px-5 pb-4 pt-5">
        <Avatar child={child} size={66} />
        <View className="ml-5 flex-1">
          <Text style={{ color: palette.text }} className="text-subtitle font-semibold">{fullName}</Text>
          <Text style={{ color: palette.muted }} className="mt-1 text-body">
            {getAge(child.birthDate)} años · Sangre {child.bloodGroup || '—'}
          </Text>
          {child.isShared && remainingMinutes !== null && (
            <View className="mt-2 self-start rounded-full bg-nanny-soft px-3 py-1">
              <Text style={{ color: palette.blue }} className="text-caption font-semibold">
                Acceso temporal · {remainingMinutes} {remainingMinutes === 1 ? 'min restante' : 'min restantes'}
              </Text>
            </View>
          )}
          {allergyRecords(child.allergies).map((allergy) => (
            <View key={allergy.name} className={`mt-2 self-start rounded-full px-3 py-1 ${allergy.severity === 'severa' ? 'bg-[#ffe1dc]' : 'bg-[#fff1ec]'}`}>
              <Text style={{ color: palette.red }} className="text-caption">
                {allergy.severity === 'severa' ? '⚠ Alergia severa: ' : '⚠ '}{allergy.name}
              </Text>
            </View>
          ))}
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </TouchableOpacity>

      <View className="flex-row border-y border-nanny-border">
        <PreviewStat value={child.conditions.length + child.diseases.length} label="Condiciones" />
        <PreviewStat value={activeMedicines} label="Med. activos" />
        <PreviewStat value={pendingVaccines} label="Vacunas pend." valueColor={pendingVaccines ? palette.red : palette.text} />
      </View>

      <View className="flex-row items-center px-5 py-3">
        <Text style={{ color: palette.muted }} className="flex-1 text-caption">
          {child.isShared ? 'Ficha compartida mediante QR (solo lectura)' : 'Sin seguimientos registrados'}
        </Text>
      </View>
      {!child.isShared && (
        <View className="flex-row border-t border-nanny-border bg-nanny-bg">
          <TouchableOpacity
            onPress={onShareQr}
            className="flex-1 flex-row items-center justify-center border-r border-nanny-border py-3.5"
            accessibilityRole="button"
            accessibilityLabel={`Compartir QR de ${fullName}`}
          >
            <Ionicons name="qr-code-outline" size={18} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-2 text-body font-semibold">Compartir QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => exportData(child.id)}
            disabled={exporting}
            className="flex-1 flex-row items-center justify-center py-3.5"
            accessibilityRole="button"
            accessibilityLabel={`Guardar PDF de ${fullName}`}
          >
            <Ionicons name="download-outline" size={18} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-2 text-body font-semibold">Guardar PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PreviewStat({ value, label, valueColor = palette.text }: { value: number; label: string; valueColor?: string }) {
  return (
    <View className="flex-1 items-center border-r border-nanny-border py-3 last:border-r-0">
      <Text style={{ color: valueColor }} className="text-subtitle font-semibold">{value}</Text>
      <Text style={{ color: palette.muted }} className="mt-1 text-[11px]">{label}</Text>
    </View>
  );
}

function ChildPickerScreen() {
  const navigation = useNavigation<any>();
  const { selectedUserId: userId } = useFamilySelection();
  const [children, setChildren] = useState<ChildPreview[]>([]);
  const [sharedChildren, setSharedChildren] = useState<SharedChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const localShared = await loadSharedChildren(userId);
      setSharedChildren(localShared);

      if (userId === null) {
        setChildren([]);
        return;
      }
      const response = await fetch(`${API_URL}/user/${userId}`);
      if (!response.ok) throw new Error();
      const profile = await response.json();
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
        'Debes seleccionar primero un usuario en la pestaña Datos para vincular el menor a su perfil.',
      );
      return;
    }
    navigation.navigate('ScanQrAccess', { ownChildIds: children.map((c) => c.id) });
  };

  return (
    <Shell>
      <View className="flex-row items-center justify-between border-b border-nanny-border px-6 pb-4 pt-3">
        <View className="flex-1 pr-3">
          <Text style={{ color: palette.muted }} className="mb-0.5 text-body font-medium">
            Registro médico
          </Text>
          <Text style={{ color: palette.text }} className="text-title font-bold">
            Libro de familia
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={handleOpenScanQr}
            accessibilityRole="button"
            accessibilityLabel="Leer QR"
            className="flex-row items-center rounded-full bg-nanny-soft px-4 py-2.5"
          >
            <Ionicons name="scan-outline" size={18} color="#654875" />
            <Text style={{ color: '#654875' }} className="ml-2 text-body font-semibold">
              Leer QR
            </Text>
          </TouchableOpacity>
          <View className="relative h-11 w-11 items-center justify-center rounded-full bg-nanny-blue">
            <Text className="text-body font-semibold text-white">
              {userId ? String(userId) : '?'}
            </Text>
            <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
              <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-nanny-blue">
                <Ionicons name="person" size={8} color="#ffffff" />
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        {userId === null && combinedChildren.length === 0 && (
          <View className="mb-6">
            <Text style={{ color: palette.text }} className="text-subtitle font-semibold italic">
              Selecciona un usuario
            </Text>
            <Text style={{ color: palette.muted }} className="mt-2 text-body">
              Elige un usuario en la pestaña Datos para cargar sus hijos o vincular temporalmente un menor mediante QR.
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
            className="flex-row items-center justify-center rounded-3xl border border-dashed border-nanny-blue py-4"
            accessibilityRole="button"
            accessibilityLabel="Añadir hijo"
          >
            <Ionicons name="add" size={20} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-2 text-body font-semibold">Añadir hijo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Shell>
  );
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-center justify-between">
        <Text style={{ color: palette.muted }} className="text-body font-semibold uppercase tracking-wider">{title}</Text>
        {onAdd && (
          <TouchableOpacity onPress={onAdd}>
            <Text style={{ color: palette.blue }} className="text-body font-semibold">+ Añadir</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function SimpleCard({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${title}. Toca para editar o eliminar` : undefined}
      className="mb-3 flex-row items-center rounded-3xl bg-nanny-surface p-5"
    >
      <View className="flex-1">
        <Text style={{ color: palette.text }} className="text-body">{title}</Text>
        {subtitle && <Text style={{ color: palette.muted }} className="mt-1 text-body">{subtitle}</Text>}
      </View>
      {onPress && <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} />}
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
    <Shell>
      <View className="flex-row items-center justify-between border-b border-nanny-border px-6 py-5">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="min-w-[72px]"
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Text style={{ color: palette.muted }} className="text-body font-medium">
            Cerrar
          </Text>
        </TouchableOpacity>
        <Text style={{ color: palette.text }} className="text-subtitle font-semibold">
          Compartir acceso
        </Text>
        <View className="min-w-[72px]" />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48 }}>
        <View className="items-center">
          <View className="items-center justify-center rounded-3xl border border-nanny-border bg-white p-6 shadow-sm">
            <QRCodeSvg value={inviteCode} size={230} color="#2D1E36" backgroundColor="#ffffff" />
          </View>
        </View>

        <View className="mt-7 rounded-2xl border border-nanny-border bg-nanny-surface px-5 py-4">
          <Text style={{ color: palette.muted }} className="text-caption font-semibold uppercase tracking-wider">
            ID DEL MENOR
          </Text>
          <Text style={{ color: palette.text }} className="mt-1 text-subtitle font-semibold">
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
          <Text className="ml-2.5 text-body font-semibold text-white">
            {copied ? 'Enlace copiado' : 'Copiar enlace de invitación'}
          </Text>
        </TouchableOpacity>

        <View className="mt-5 flex-row items-start rounded-2xl border border-[#ead9bc] bg-[#fdf5e6] p-4">
          <Ionicons name="information-circle-outline" size={22} color="#8c6229" style={{ marginTop: 1 }} />
          <Text style={{ color: '#7d5a2b' }} className="ml-3 flex-1 text-body leading-5">
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
    <Shell>
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
              <Text className="text-body font-semibold text-white">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-subtitle font-semibold text-white">Escanear código QR</Text>
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
              <Text className="mt-5 rounded-full bg-black/60 px-4 py-2 text-center text-body font-medium text-white">
                Apunta al código QR compartido por el otro tutor
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between border-b border-nanny-border px-6 py-5">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="min-w-[72px]"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text style={{ color: palette.muted }} className="text-body font-medium">
            Cancelar
          </Text>
        </TouchableOpacity>
        <Text style={{ color: palette.text }} className="text-subtitle font-semibold">
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
            className="items-center rounded-3xl border-2 border-dashed border-nanny-border-strong bg-nanny-surface px-6 py-10"
          >
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-nanny-soft">
              <Ionicons name="qr-code-outline" size={30} color="#654875" />
            </View>
            <Text style={{ color: palette.text }} className="text-center text-subtitle font-semibold">
              Abrir cámara o elegir imagen
            </Text>
            <Text style={{ color: palette.muted }} className="mt-2 text-center text-body leading-5">
              Haz una foto clara del código QR compartido por el otro tutor.
            </Text>
          </TouchableOpacity>

          <View className="my-7 flex-row items-center">
            <View className="h-[1px] flex-1 bg-nanny-border" />
            <Text style={{ color: palette.muted }} className="mx-4 text-body">
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
            className="rounded-3xl border border-nanny-border-strong bg-nanny-surface px-5 py-4 text-body"
          />

          <TouchableOpacity
            onPress={handleLinkChild}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Vincular menor"
            style={{ backgroundColor: canSubmit ? palette.blue : '#D5C3DD' }}
            className="mt-5 items-center justify-center rounded-2xl py-4"
          >
            <Text className="text-body font-semibold text-white">
              Vincular menor
            </Text>
          </TouchableOpacity>

          <Text style={{ color: palette.muted }} className="mt-4 px-2 text-center text-caption leading-5">
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
  const vaccinesByRecent = [...data.vaccines].sort((a, b) => {
    const dateA = new Date(a.appliedAt || a.scheduledFor || 0).getTime();
    const dateB = new Date(b.appliedAt || b.scheduledFor || 0).getTime();
    return dateB - dateA || b.id - a.id;
  });
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

  const deleteChild = () => confirmDeleteChild(data, () => navigation.navigate('ChildPicker'));

  return (
    <Shell>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="bg-nanny-surface px-6 pb-7 pt-4">
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildPicker')}
            className="mb-5 flex-row items-center self-start"
            accessibilityRole="button"
            accessibilityLabel="Volver al libro de familia"
          >
            <Ionicons name="chevron-back" size={18} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-1 text-body">Libro de familia</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Avatar child={data} size={72} />
            <View className="ml-5 flex-1">
              <Text style={{ color: palette.text }} className="text-title font-bold">{fullName}</Text>
              <Text style={{ color: palette.muted }} className="mt-1 text-body">
                {getAge(data.birthDate)} años · {new Date(data.birthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {data.bloodGroup && (
                <Text style={{ color: palette.red }} className="mt-2 self-start rounded-full bg-[#fff1ec] px-3 py-1 text-body">
                  Sangre {data.bloodGroup}
                </Text>
              )}
              {isShared && remainingMinutes !== null && (
                <View className="mt-2 self-start rounded-full bg-nanny-soft px-3 py-1">
                  <Text style={{ color: palette.blue }} className="text-caption font-semibold">
                    Vista compartida (solo lectura · {remainingMinutes} min restantes)
                  </Text>
                </View>
              )}
            </View>
          </View>
          {!isShared ? (
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={editChild}
                accessibilityRole="button"
                accessibilityLabel={`Editar a ${fullName}`}
                className="flex-1 flex-row items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg py-3"
              >
                <Ionicons name="create-outline" size={18} color={palette.blue} />
                <Text style={{ color: palette.blue }} className="ml-2 text-body font-semibold">Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('ShareQrAccess', { child: data })}
                accessibilityRole="button"
                accessibilityLabel={`Compartir QR de ${fullName}`}
                className="flex-1 flex-row items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg py-3"
              >
                <Ionicons name="qr-code-outline" size={18} color={palette.blue} />
                <Text style={{ color: palette.blue }} className="ml-2 text-body font-semibold">Compartir QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteChild}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar a ${fullName}`}
                className="flex-1 flex-row items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg py-3"
              >
                <Ionicons name="trash-outline" size={18} color={palette.red} />
                <Text style={{ color: palette.red }} className="ml-2 text-body font-semibold">Eliminar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={async () => {
                  await removeSharedChild(data.id, userId);
                  navigation.navigate('ChildPicker');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Dejar de ver a ${fullName}`}
                className="flex-1 flex-row items-center justify-center rounded-2xl border border-nanny-border bg-nanny-bg py-3"
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.red} />
                <Text style={{ color: palette.red }} className="ml-2 text-body font-semibold">Quitar acceso temporal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="px-6 pt-7">
          <Section title={`Alergias · ${allergyRecords(data.allergies).length}`} onAdd={isShared ? undefined : () => openForm('AddAllergy')}>
            {allergyRecords(data.allergies).map((allergy) => {
              const isSevere = allergy.severity === 'severa';
              return (
              <TouchableOpacity
                key={allergy.name}
                activeOpacity={0.7}
                disabled={isShared}
                onPress={() => itemMenu(allergy.name, () => editItem('AddAllergy', allergy), deleteAllergy(allergy.name))}
                className={`mb-3 flex-row items-center rounded-3xl border p-5 ${isSevere ? 'border-[#c64b3b] bg-[#fff0ec]' : 'border-transparent bg-nanny-surface'}`}
                accessibilityLabel={`${isSevere ? 'Alerta: ' : ''}Alergia ${allergy.name}, gravedad ${allergy.severity}`}
              >
                <View className={`mr-4 h-10 w-10 items-center justify-center rounded-full ${isSevere ? 'bg-[#c64b3b]' : 'bg-[#fff1ec]'}`}>
                  <Ionicons name={isSevere ? 'warning' : 'alert-circle-outline'} size={20} color={isSevere ? '#ffffff' : palette.red} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="text-body">{allergy.name}</Text>
                  <Text style={{ color: isSevere ? '#a33327' : palette.muted }} className="mt-1 text-body font-semibold">
                    {isSevere ? 'ALERTA · Alergia severa' : `Gravedad: ${allergy.severity}`}
                  </Text>
                </View>
                {!isShared && <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} />}
              </TouchableOpacity>
              );
            })}
          </Section>

          <Section title={`Vacunas · ${applied}/${data.vaccines.length} aplicadas`} onAdd={isShared ? undefined : () => openForm('AddVaccine')}>
            {vaccinesByRecent.map((vaccine) => (
              <TouchableOpacity
                key={vaccine.id}
                activeOpacity={0.7}
                disabled={isShared}
                onPress={() => itemMenu(vaccine.name, () => editItem('AddVaccine', vaccine), deleteRecord('vaccine', vaccine.id))}
                className="mb-3 flex-row items-center rounded-3xl bg-nanny-surface p-5"
              >
                <View className={`mr-4 h-9 w-9 items-center justify-center rounded-full ${vaccine.appliedAt ? 'bg-[#e5f1e9]' : 'bg-[#fff0d8]'}`}>
                  <Ionicons name={vaccine.appliedAt ? 'checkmark' : 'time-outline'} size={18} color={vaccine.appliedAt ? palette.green : '#bd7110'} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="text-body">{vaccine.name}</Text>
                  <Text style={{ color: palette.muted }} className="mt-1 text-body">
                    {vaccine.appliedAt
                      ? new Date(vaccine.appliedAt).toLocaleDateString('es-ES')
                      : `Pendiente${vaccine.scheduledFor ? ` · ${new Date(vaccine.scheduledFor).toLocaleDateString('es-ES')}` : ''}`}
                  </Text>
                </View>
                {!isShared && <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} />}
              </TouchableOpacity>
            ))}
          </Section>

          <Section title={`Condiciones · ${data.conditions.length + data.diseases.length}`} onAdd={isShared ? undefined : () => openForm('AddCondition')}>
            {data.conditions.map((condition) => (
              <SimpleCard key={condition.id} title={condition.description || condition.desciption || 'Condición registrada'} subtitle={`Registrada: ${new Date(condition.timestamp).toLocaleDateString('es-ES')}`} />
            ))}
            {data.diseases.map((disease) => (
              <SimpleCard
                key={`disease-${disease.id}`}
                title={disease.name}
                subtitle={disease.description || undefined}
                onPress={isShared ? undefined : () => itemMenu(disease.name, () => editItem('AddCondition', disease), deleteRecord('disease', disease.id))}
              />
            ))}
          </Section>

          <Section title={`Medicamentos · ${data.medicine.length}`} onAdd={isShared ? undefined : () => openForm('AddMedicine')}>
            {data.medicine.map((medicine) => (
              <SimpleCard
                key={medicine.id}
                title={medicine.name}
                subtitle={`${medicine.dosage}${medicine.intervalHours ? ` · cada ${medicine.intervalHours} h` : ''}`}
                onPress={isShared ? undefined : () => itemMenu(medicine.name, () => editItem('AddMedicine', medicine), deleteRecord('medicine', medicine.id))}
              />
            ))}
          </Section>

          {canSeeHistory ? (
            <HealthHistory key={historyKey} childId={data.id} />
          ) : (
            <HealthHistoryLocked
              onUpgrade={() => Alert.alert('Plan PRO', 'La mejora de plan estará disponible próximamente.')}
            />
          )}
        </View>
      </ScrollView>
    </Shell>
  );
}

function ChildBanner({ child }: { child: Child }) {
  return (
    <View className="mx-6 mb-7 flex-row items-center rounded-3xl bg-nanny-surface p-6">
      <Avatar child={child} size={66} />
      <View className="ml-5 flex-1">
        <Text style={{ color: palette.text }} className="text-title font-bold">{child.name}</Text>
        <Text style={{ color: palette.muted }} className="mt-1 text-body">Esta información se añadirá a su perfil médico.</Text>
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
        <Text style={{ color: palette.muted }} className="text-body">{label}</Text>
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
        className="rounded-3xl border border-nanny-border bg-nanny-surface px-6 py-4 text-body"
      />
      {tooltip && showTip && (
        <View className="mt-2 rounded-xl bg-nanny-text px-3 py-2">
          <Text className="text-caption text-white">{tooltip}</Text>
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
      <Text style={{ color: palette.muted }} className="mb-2 text-body">{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} className="flex-row items-center justify-between rounded-3xl border border-nanny-border bg-nanny-surface px-6 py-4">
        <Text style={{ color: value ? palette.text : '#8F8296' }} className="text-body">{value ? value.toLocaleDateString('es-ES') : 'dd/mm/aaaa'}</Text>
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
    <Shell>
      <Header
        title={title}
        onBack={() => navigation.goBack()}
        action={<TouchableOpacity onPress={onSave} disabled={saving}><Text style={{ color: saving ? '#D5C3DD' : palette.blue }} className="text-body font-semibold">Guardar</Text></TouchableOpacity>}
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
      <Text style={{ color: palette.muted }} className="mb-2 text-body">Estado *</Text>
      <View className="mb-6 flex-row gap-3">
        {[true, false].map((value) => (
          <TouchableOpacity
            key={String(value)}
            onPress={() => handleSetApplied(value)}
            style={{ borderColor: applied === value ? palette.blue : '#E7DAEA', backgroundColor: applied === value ? '#EAE0F2' : palette.card }}
            className="flex-1 items-center rounded-3xl border p-4"
          >
            <Text style={{ color: applied === value ? palette.blue : palette.muted }} className="text-body font-semibold">{value ? 'Aplicada' : 'Pendiente'}</Text>
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
      <Text style={{ color: palette.muted }} className="mb-2 text-body">Gravedad *</Text>
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
              <Text style={{ color: selected ? optionColor : palette.muted }} className="text-body font-semibold">
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
      <Text style={{ color: palette.muted }} className="-mt-4 mb-5 text-body">Separa cada horario con una coma.</Text>
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
