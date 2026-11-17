import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getUser, updateUser, type ProfileUser } from '../api/user';

const BLUE = '#6d83a1';
const BG = '#f7f3ec';
const CARD = '#ece6d9';
const TEXT = '#3a3a3a';
const MUTED = '#8a7f75';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = route.params?.userId as number | undefined;
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [profileRole, setProfileRole] = useState<ProfileUser['profileRole']>('MOTHER');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setErrors({ form: 'No se ha seleccionado ningún usuario.' });
      return;
    }
    getUser(userId).then((value) => {
      setUser(value);
      setName(value.name);
      setSurname(value.surname ?? '');
      setPhone(value.phone ?? '');
      setProfileRole(value.profileRole);
      setAvatarUrl(value.avatarUrl);
    }).catch((error: Error) => setErrors({ form: error.message })).finally(() => setLoading(false));
  }, [userId]);

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Permite acceder a tus fotos para cambiar el avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setAvatarUrl(result.assets[0].uri);
  };

  const openPhotoOptions = () => {
    if (!avatarUrl) {
      choosePhoto();
      return;
    }

    Alert.alert('Foto de perfil', '¿Qué quieres hacer con tu foto actual?', [
      { text: 'Cambiar foto', onPress: choosePhoto },
      { text: 'Eliminar foto', style: 'destructive', onPress: () => setAvatarUrl(null) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const save = async () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'El nombre es obligatorio.';
    if (!surname.trim()) nextErrors.surname = 'El apellido es obligatorio.';
    if (!phone.trim()) nextErrors.phone = 'El teléfono es obligatorio.';
    else if (!/^(?=.*\d)[0-9+()\s-]+$/.test(phone.trim())) nextErrors.phone = 'Introduce un teléfono válido.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !userId) return;

    setSaving(true);
    try {
      await updateUser(userId, { name: name.trim(), surname: surname.trim(), phone: phone.trim(), avatarUrl, profileRole });
      navigation.goBack();
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center' }}><ActivityIndicator color={BLUE} /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 58, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#ded6ca', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={{ color: BLUE, fontSize: 16 }}>‹ Volver</Text>
        </Pressable>
        <Text style={{ color: TEXT, fontSize: 16, fontWeight: '700' }}>Mi perfil</Text>
        <Pressable onPress={save} disabled={saving} accessibilityRole="button">
          <Text style={{ color: '#65a882', fontSize: 16, fontWeight: '700' }}>{saving ? '...' : 'Guardar'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={openPhotoOptions} style={{ alignSelf: 'center', marginBottom: 22 }} accessibilityRole="button" accessibilityLabel={avatarUrl ? 'Gestionar fotografía de perfil' : 'Añadir fotografía de perfil'}>
          <View style={{ width: 108, height: 108, borderRadius: 54, borderWidth: 4, borderColor: BLUE, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={48} color={MUTED} />}
          </View>
          <View style={{ position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG }}>
            <Ionicons name="pencil" size={16} color="white" />
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field label="NOMBRE" value={name} onChangeText={setName} error={errors.name} contact />
          <Field label="APELLIDO" value={surname} onChangeText={setSurname} error={errors.surname} contact />
        </View>
        <Text style={{ color: MUTED, fontSize: 14, fontWeight: '600', marginTop: 6, marginBottom: 8 }}>ROL</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
          {([
            ['MOTHER', 'Madre'],
            ['FATHER', 'Padre'],
            ['GUARDIAN', 'Tutor/a'],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setProfileRole(value)}
              style={{ flex: 1, backgroundColor: profileRole === value ? BLUE : '#eee5d6', borderColor: '#ddd2c4', borderWidth: 1, borderRadius: 14, paddingVertical: 11, alignItems: 'center' }}
            >
              <Text style={{ color: profileRole === value ? 'white' : BLUE, fontSize: 15, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: MUTED, fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 8, letterSpacing: 0.8 }}>INFORMACIÓN DE CONTACTO</Text>
        <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12 }}>
          <Field label="Correo electrónico" value={user?.email ?? ''} onChangeText={() => undefined} editable={false} contact />
          <Field label="Teléfono" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" contact />
        </View>
        {errors.form && <Text style={{ color: '#cc7a66', marginTop: 16 }}>{errors.form}</Text>}
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 24, backgroundColor: '#fff1ec', borderColor: '#ddd2c4', borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center' }}>
          <Text style={{ color: '#cc7a66', fontSize: 15, fontWeight: '600' }}>Cancelar cambios</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, error, editable = true, keyboardType, contact = false }: { label: string; value: string; onChangeText: (value: string) => void; error?: string; editable?: boolean; keyboardType?: 'phone-pad'; contact?: boolean }) {
  return (
    <View style={{ flex: 1, marginBottom: 10 }}>
      <Text style={{ color: MUTED, fontSize: 14, fontWeight: '600', marginBottom: 5 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} editable={editable} keyboardType={keyboardType} style={{ backgroundColor: contact ? '#eee5d6' : CARD, borderRadius: 16, borderWidth: error || contact ? 1 : 0, borderColor: error ? '#cc7a66' : '#ddd2c4', paddingHorizontal: 13, paddingVertical: 11, color: TEXT, fontSize: 15 }} />
      {error && <Text style={{ color: '#cc7a66', fontSize: 11, marginTop: 3 }}>{error}</Text>}
    </View>
  );
}
