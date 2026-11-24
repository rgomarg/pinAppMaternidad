import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUser, updateUser, type ProfileUpdate, type ProfileUser } from '../api/user';
import { applyNotificationPreferences } from '../services/notificationService';
import { COLORS, TYPOGRAPHY } from '../theme';

const BLUE = COLORS.primary;
const MUTED = COLORS.muted;
const RED = COLORS.red;
const BORDER = COLORS.border;

// Solo números y símbolos telefónicos (+ ( ) - espacios), con entre 9 y 15 dígitos (máximo del estándar E.164)
const PHONE_PATTERN = /^[0-9+()\s-]+$/;
const countDigits = (value: string) => (value.match(/\d/g) ?? []).length;

const ROLES = [
  ['MOTHER', 'Madre'],
  ['FATHER', 'Padre'],
  ['GUARDIAN', 'Tutor/a'],
] as const;

const NOTIFICATION_OPTIONS = [
  { key: 'notifyMedicine', title: 'Recordatorios de medicación', subtitle: 'Aviso en cada toma' },
  { key: 'notifyAppointments', title: 'Citas médicas', subtitle: 'Recordatorio de citas y vacunas' },
  { key: 'notifyForum', title: 'Actividad en el foro', subtitle: 'Respuestas a tus hilos' },
] as const;

type Form = ProfileUpdate;
type Errors = Partial<Record<'name' | 'surname' | 'phone' | 'form', string>>;

function toForm(user: ProfileUser): Form {
  return {
    name: user.name,
    surname: user.surname ?? '',
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl,
    profileRole: user.profileRole,
    notifyMedicine: user.notifyMedicine ?? true,
    notifyAppointments: user.notifyAppointments ?? true,
    notifyForum: user.notifyForum ?? false,
  };
}

function validate(form: Form): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio.';
  else if (form.name.trim().length < 2) errors.name = 'Mínimo 2 caracteres.';
  if (!form.surname?.trim()) errors.surname = 'El apellido es obligatorio.';
  else if (form.surname.trim().length < 2) errors.surname = 'Mínimo 2 caracteres.';
  if (!form.phone?.trim()) errors.phone = 'El teléfono es obligatorio.';
  else if (!PHONE_PATTERN.test(form.phone.trim())) errors.phone = 'Introduce un teléfono válido (solo números, espacios y + ( ) -).';
  else if (countDigits(form.phone) < 9) errors.phone = 'El teléfono debe tener al menos 9 dígitos.';
  else if (countDigits(form.phone) > 15) errors.phone = 'El teléfono no puede tener más de 15 dígitos.';
  return errors;
}

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const userId = route.params?.userId as number | undefined;

  const [user, setUser] = useState<ProfileUser | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setErrors({ form: 'No se ha seleccionado ningún usuario.' });
      return;
    }
    getUser(userId)
      .then((value) => {
        setUser(value);
        setForm(toForm(value));
      })
      .catch((error: Error) => setErrors({ form: error.message }))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!savedMessage) return;
    const timer = setTimeout(() => setSavedMessage(false), 3000);
    return () => clearTimeout(timer);
  }, [savedMessage]);

  // Los cambios solo viven en este estado local hasta pulsar "Guardar"
  const setField = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Permite acceder a tus fotos para cambiar el avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      // Se guarda como data URI para que el resto de usuarios del foro también vea la foto
      // (una ruta file:// solo existe en este móvil)
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setField('avatarUrl', asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri);
  };

  const openPhotoOptions = () => {
    if (!form?.avatarUrl) {
      choosePhoto();
      return;
    }
    Alert.alert('Foto de perfil', '¿Qué quieres hacer con tu foto actual?', [
      { text: 'Cambiar foto', onPress: choosePhoto },
      { text: 'Eliminar foto', style: 'destructive', onPress: () => setField('avatarUrl', null) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (!form || !userId) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setSavedMessage(false);
    if (Object.keys(nextErrors).length > 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUser(userId, {
        ...form,
        name: form.name.trim(),
        surname: form.surname?.trim() ?? null,
        phone: form.phone?.trim() ?? null,
      });
      // La pantalla se "recarga" con lo que ha quedado guardado en el servidor
      setUser(updated);
      setForm(toForm(updated));
      setSavedMessage(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      await applyNotificationPreferences({
        notifyMedicine: updated.notifyMedicine,
        notifyAppointments: updated.notifyAppointments,
        notifyForum: updated.notifyForum,
      });
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' });
    } finally {
      setSaving(false);
    }
  };

  // Descarta los cambios no guardados y vuelve atrás
  const cancel = () => {
    if (user) setForm(toForm(user));
    setErrors({});
    navigation.goBack();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center bg-nanny-bg">
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-nanny-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Cabecera */}
      <View
        style={{ paddingTop: insets.top + 12 }}
        className="flex-row items-center justify-between border-b border-nanny-border px-6 pb-4"
      >
        <Pressable onPress={cancel} className="w-20 flex-row items-center" accessibilityRole="button" accessibilityLabel="Volver sin guardar">
          <Ionicons name="chevron-back" size={20} color={BLUE} />
          <Text className="ml-1 text-body text-nanny-blue">Volver</Text>
        </Pressable>
        <Text className="text-subtitle font-semibold text-nanny-text">Mi perfil</Text>
        <Pressable onPress={save} disabled={saving || !form} className="w-20 items-end" accessibilityRole="button">
          {saving ? <ActivityIndicator size="small" color="#65a882" /> : <Text className="text-body font-semibold text-nanny-green">Guardar</Text>}
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {savedMessage && (
          <View className="mb-4 flex-row items-center rounded-2xl bg-nanny-green/15 px-4 py-3">
            <Ionicons name="checkmark-circle" size={18} color="#65a882" />
            <Text className="ml-2 text-body font-semibold text-nanny-green">Perfil actualizado correctamente</Text>
          </View>
        )}
        {errors.form && (
          <View className="mb-4 rounded-2xl bg-nanny-red/15 px-4 py-3">
            <Text className="text-body text-nanny-red">{errors.form}</Text>
          </View>
        )}

        {form && (
          <>
            {/* Foto de perfil */}
            <Pressable
              onPress={openPhotoOptions}
              className="mb-6 self-center"
              accessibilityRole="button"
              accessibilityLabel={form.avatarUrl ? 'Gestionar fotografía de perfil' : 'Añadir fotografía de perfil'}
            >
              <View
                style={{ width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: BLUE }}
                className="items-center justify-center overflow-hidden bg-nanny-card"
              >
                {form.avatarUrl ? (
                  <Image source={{ uri: form.avatarUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="person" size={48} color={MUTED} />
                )}
              </View>
              <View
                style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2 }}
                className="absolute bottom-0 right-0 items-center justify-center border-nanny-bg bg-nanny-blue"
              >
                <Ionicons name="pencil" size={15} color="white" />
              </View>
            </Pressable>

            {/* Datos personales */}
            <View className="flex-row" style={{ gap: 12 }}>
              <TextField label="Nombre" value={form.name} onChangeText={(v) => setField('name', v)} error={errors.name} />
              <TextField label="Apellido" value={form.surname ?? ''} onChangeText={(v) => setField('surname', v)} error={errors.surname} />
            </View>

            <SectionLabel>Rol</SectionLabel>
            <View className="flex-row" style={{ gap: 10 }}>
              {ROLES.map(([value, label]) => {
                const selected = form.profileRole === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setField('profileRole', value)}
                    style={{ borderColor: BORDER }}
                    className={`flex-1 items-center rounded-2xl border py-3 ${selected ? 'bg-nanny-blue' : 'bg-nanny-card'}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Text className={`text-body font-semibold ${selected ? 'text-white' : 'text-nanny-blue'}`}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Información de contacto */}
            <SectionLabel spaced>Información de contacto</SectionLabel>
            <Card>
              <ContactRow icon="mail-outline" label="Correo electrónico" value={user?.email ?? ''} editable={false} />
              <Divider />
              <ContactRow
                icon="call-outline"
                label="Teléfono"
                value={form.phone ?? ''}
                onChangeText={(v) => setField('phone', v)}
                error={errors.phone}
                keyboardType="phone-pad"
              />
            </Card>

            {/* Notificaciones */}
            <SectionLabel spaced>Notificaciones</SectionLabel>
            <Card>
              {NOTIFICATION_OPTIONS.map((option, index) => (
                <View key={option.key}>
                  {index > 0 && <Divider />}
                  <View className="flex-row items-center px-5 py-4">
                    <View className="flex-1 pr-3">
                      <Text className="text-body font-medium text-nanny-text">{option.title}</Text>
                      <Text style={{ color: MUTED }} className="mt-0.5 text-caption">{option.subtitle}</Text>
                    </View>
                    <Switch
                      value={form[option.key]}
                      onValueChange={(v) => setField(option.key, v)}
                      trackColor={{ false: '#E7DAEA', true: BLUE }}
                      accessibilityLabel={option.title}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <Pressable
          onPress={cancel}
          style={{ borderColor: BORDER }}
          className="mt-8 items-center rounded-2xl border bg-nanny-card py-4"
          accessibilityRole="button"
        >
          <Text style={{ color: MUTED }} className="text-body font-medium">Cancelar cambios</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Mismo estilo para todas las cabeceras de sección del formulario
function SectionLabel({ children, spaced = false }: { children: string; spaced?: boolean }) {
  return (
    <Text
      style={{ color: MUTED, fontSize: TYPOGRAPHY.caption.fontSize, fontWeight: '600', letterSpacing: 0.8 }}
      className={`mb-2 uppercase ${spaced ? 'mt-6' : 'mt-2'}`}
    >
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderColor: BORDER }} className="overflow-hidden rounded-3xl border bg-nanny-card">
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: BORDER }} />;
}

function TextField({ label, value, onChangeText, error }: { label: string; value: string; onChangeText: (value: string) => void; error?: string }) {
  return (
    <View className="mb-2 flex-1">
      <SectionLabel>{label}</SectionLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={{ borderColor: error ? RED : BORDER }}
        className="rounded-2xl border bg-nanny-card px-4 py-3 text-body text-nanny-text"
        accessibilityLabel={label}
      />
      {error && <Text className="mt-1 text-caption text-nanny-red">{error}</Text>}
    </View>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onChangeText,
  error,
  editable = true,
  keyboardType,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  error?: string;
  editable?: boolean;
  keyboardType?: 'phone-pad';
}) {
  return (
    <View className="flex-row items-center px-5 py-4">
      <Ionicons name={icon} size={22} color={editable ? BLUE : MUTED} />
      <View className="ml-4 flex-1">
        <Text style={{ color: MUTED }} className="text-caption">{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          keyboardType={keyboardType}
          style={{ borderBottomWidth: 1, borderBottomColor: error ? RED : editable ? BLUE : BORDER, paddingVertical: 4 }}
          className={`text-body ${editable ? 'text-nanny-text' : 'text-nanny-muted'}`}
          accessibilityLabel={label}
        />
        {error && <Text className="mt-1 text-caption text-nanny-red">{error}</Text>}
      </View>
    </View>
  );
}
