import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../api/config';
import { useFamilySelection } from '../context/FamilySelectionContext';

type Child = {
  id: number;
  name: string;
  birthDate: string;
  bloodGroup?: string | null;
};

type ChildPreview = Child & {
  allergies: string | null;
  vaccines: Vaccine[];
  conditions: unknown[];
  diseases: unknown[];
  medicine: { endDate: string | null }[];
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
  background: '#f7f3ec',
  card: '#ece6d9',
  text: '#302e2c',
  muted: '#91877e',
  blue: '#6d83a1',
  green: '#65a882',
  red: '#cc7a66',
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
    <View className="flex-row items-center justify-between border-b border-[#ded5c8] px-6 py-5">
      <TouchableOpacity onPress={onBack} disabled={!onBack} className="min-w-[72px]">
        {onBack && (
          <View className="flex-row items-center">
            <Ionicons name="chevron-back" size={20} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="text-base">Libro</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={{ color: palette.text }} className="text-xl font-bold">{title}</Text>
      <View className="min-w-[72px] items-end">{action}</View>
    </View>
  );
}

function Avatar({ child, size = 72 }: { child: Child; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, borderColor: palette.red }}
      className="items-center justify-center overflow-hidden border-4 bg-[#d9dce2]"
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

function hasAllergy(allergies: string | null | undefined) {
  if (!allergies) return false;
  return !['ninguna conocida', 'sin alergias registradas'].includes(allergies.trim().toLowerCase());
}

function allergyNames(allergies: string | null | undefined) {
  return hasAllergy(allergies)
    ? allergies!.split(',').map((allergy) => allergy.trim()).filter(Boolean)
    : [];
}

function ChildCard({ child, onPress }: { child: ChildPreview; onPress: () => void }) {
  const pendingVaccines = child.vaccines.filter((vaccine) => !vaccine.appliedAt).length;
  const activeMedicines = child.medicine.filter((medicine) => !medicine.endDate || new Date(medicine.endDate) >= new Date()).length;

  return (
    <View className="mb-5 overflow-hidden rounded-3xl border border-[#ddd2c4] bg-[#eee5d6]">
      <TouchableOpacity onPress={onPress} className="flex-row items-center px-5 pb-4 pt-5">
        <Avatar child={child} size={66} />
        <View className="ml-5 flex-1">
          <Text style={{ color: palette.text }} className="text-xl font-bold">{child.name}</Text>
          <Text style={{ color: palette.muted }} className="mt-1 text-sm">
            {getAge(child.birthDate)} años · Sangre {child.bloodGroup || '—'}
          </Text>
          {allergyNames(child.allergies).map((allergy) => (
            <View key={allergy} className="mt-2 self-start rounded-full bg-[#fff1ec] px-3 py-1">
              <Text style={{ color: palette.red }} className="text-xs">⚠ {allergy}</Text>
            </View>
          ))}
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </TouchableOpacity>

      <View className="flex-row border-y border-[#ddd2c4]">
        <PreviewStat value={child.conditions.length + child.diseases.length} label="Condiciones" />
        <PreviewStat value={activeMedicines} label="Med. activos" />
        <PreviewStat value={pendingVaccines} label="Vacunas pend." valueColor={pendingVaccines ? palette.red : palette.text} />
      </View>

      <View className="flex-row items-center px-5 py-3">
        <Text style={{ color: palette.muted }} className="flex-1 text-xs">Sin seguimientos registrados</Text>
      </View>
      <TouchableOpacity
        onPress={() => Alert.alert('Próximamente', 'La opción para compartir o guardar el PDF estará disponible próximamente.')}
        className="items-center border-t border-[#ddd2c4] bg-[#f5eee4] py-3"
        accessibilityRole="button"
        accessibilityLabel={`Compartir o guardar el PDF de ${child.name}`}
      >
        <View className="flex-row items-center">
          <Ionicons name="share-social-outline" size={18} color={palette.blue} />
          <Text style={{ color: palette.blue }} className="ml-2 text-sm font-semibold">Compartir o guardar PDF</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function PreviewStat({ value, label, valueColor = palette.text }: { value: number; label: string; valueColor?: string }) {
  return (
    <View className="flex-1 items-center border-r border-[#ddd2c4] py-3 last:border-r-0">
      <Text style={{ color: valueColor }} className="text-lg font-semibold">{value}</Text>
      <Text style={{ color: palette.muted }} className="mt-1 text-[11px]">{label}</Text>
    </View>
  );
}

function ChildPickerScreen() {
  const navigation = useNavigation<any>();
  const { selectedUserId: userId } = useFamilySelection();
  const [children, setChildren] = useState<ChildPreview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
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

  useFocusEffect(useCallback(() => { loadChildren(); }, [loadChildren]));

  return (
    <Shell>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <View className="mb-6">
          <Text style={{ color: palette.muted }} className="mb-1 text-sm font-medium">
            Libro de familia
          </Text>
          <Text style={{ color: palette.text }} className="text-xl font-semibold italic">
            {userId ? 'Selecciona un niño' : 'Selecciona un usuario'}
          </Text>
          <Text style={{ color: palette.muted }} className="mt-3 text-sm">
            {userId
              ? 'Elige un niño para consultar su información médica.'
              : 'Elige un usuario para cargar sus hijos y sus datos médicos.'}
          </Text>
        </View>
        {loading ? <ActivityIndicator size="large" color={palette.blue} /> : children.map((child) => (
          <ChildCard key={child.id} child={child} onPress={() => navigation.navigate('ChildProfile', { childId: child.id })} />
        ))}
        {/* {!loading && children.length === 0 && (
          <Text className="mt-3 text-sm text-[#8A7F75]">
            {userId === null
              ? 'Elige un usuario para cargar sus hijos y sus datos médicos.'
              : 'Este usuario no tiene hijos registrados.'}
          </Text>
        )} */}
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
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-center justify-between">
        <Text style={{ color: palette.muted }} className="text-base font-bold uppercase tracking-wider">{title}</Text>
        <TouchableOpacity onPress={onAdd}>
          <Text style={{ color: palette.blue }} className="text-base font-semibold">+ Añadir</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function SimpleCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-3 rounded-3xl bg-[#eee5d6] p-5">
      <Text style={{ color: palette.text }} className="text-lg">{title}</Text>
      {subtitle && <Text style={{ color: palette.muted }} className="mt-1 text-base">{subtitle}</Text>}
    </View>
  );
}

function ChildProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchChildDashboard(route.params.childId));
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil del niño.');
    } finally {
      setLoading(false);
    }
  }, [route.params.childId]);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  if (loading || !data) {
    return <Shell><ActivityIndicator size="large" color={palette.blue} style={{ flex: 1 }} /></Shell>;
  }

  const applied = data.vaccines.filter((vaccine) => vaccine.appliedAt).length;
  const openForm = (screen: string) => navigation.navigate(screen, { child: data });

  return (
    <Shell>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="bg-[#eee5d6] px-6 pb-7 pt-4">
          <TouchableOpacity
            onPress={() => navigation.navigate('ChildPicker')}
            className="mb-5 flex-row items-center self-start"
            accessibilityRole="button"
            accessibilityLabel="Volver al libro de familia"
          >
            <Ionicons name="chevron-back" size={18} color={palette.blue} />
            <Text style={{ color: palette.blue }} className="ml-1 text-sm">Libro de familia</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Avatar child={data} size={72} />
            <View className="ml-5 flex-1">
              <Text style={{ color: palette.text }} className="text-2xl font-bold">{data.name}</Text>
              <Text style={{ color: palette.muted }} className="mt-1 text-base">
                {getAge(data.birthDate)} años · {new Date(data.birthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {data.bloodGroup && (
                <Text style={{ color: palette.red }} className="mt-2 self-start rounded-full bg-[#fff1ec] px-3 py-1 text-sm">
                  Sangre {data.bloodGroup}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className="px-6 pt-7">
          <Section title={`Alergias · ${hasAllergy(data.allergies) ? '1' : '0'}`} onAdd={() => openForm('AddAllergy')}>
            {allergyNames(data.allergies).map((allergy) => (
              <View key={allergy} className="mb-3 flex-row items-center rounded-3xl bg-[#eee5d6] p-5">
                <View className="mr-4 rounded-full bg-[#fff1ec] px-3 py-1">
                  <Text style={{ color: palette.red }} className="text-sm font-semibold">Alergia</Text>
                </View>
                <Text style={{ color: palette.text }} className="flex-1 text-lg">{allergy}</Text>
                <Ionicons name="chevron-down" size={18} color={palette.muted} />
              </View>
            ))}
          </Section>

          <Section title={`Vacunas · ${applied}/${data.vaccines.length} aplicadas`} onAdd={() => openForm('AddVaccine')}>
            {data.vaccines.map((vaccine) => (
              <View key={vaccine.id} className="mb-3 flex-row items-center rounded-3xl bg-[#eee5d6] p-5">
                <View className={`mr-4 h-9 w-9 items-center justify-center rounded-full ${vaccine.appliedAt ? 'bg-[#e5f1e9]' : 'bg-[#fff0d8]'}`}>
                  <Ionicons name={vaccine.appliedAt ? 'checkmark' : 'time-outline'} size={18} color={vaccine.appliedAt ? palette.green : '#bd7110'} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: palette.text }} className="text-lg">{vaccine.name}</Text>
                  <Text style={{ color: palette.muted }} className="mt-1 text-base">
                    {vaccine.appliedAt
                      ? new Date(vaccine.appliedAt).toLocaleDateString('es-ES')
                      : `Pendiente${vaccine.scheduledFor ? ` · ${new Date(vaccine.scheduledFor).toLocaleDateString('es-ES')}` : ''}`}
                  </Text>
                </View>
              </View>
            ))}
          </Section>

          <Section title={`Condiciones · ${data.conditions.length + data.diseases.length}`} onAdd={() => openForm('AddCondition')}>
            {data.conditions.map((condition) => (
              <SimpleCard key={condition.id} title={condition.description || condition.desciption || 'Condición registrada'} subtitle={`Registrada: ${new Date(condition.timestamp).toLocaleDateString('es-ES')}`} />
            ))}
            {data.diseases.map((disease) => (
              <SimpleCard key={`disease-${disease.id}`} title={disease.name} subtitle={disease.description || undefined} />
            ))}
          </Section>

          <Section title={`Medicamentos · ${data.medicine.length}`} onAdd={() => openForm('AddMedicine')}>
            {data.medicine.map((medicine) => (
              <SimpleCard key={medicine.id} title={medicine.name} subtitle={`${medicine.dosage}${medicine.intervalHours ? ` · cada ${medicine.intervalHours} h` : ''}`} />
            ))}
          </Section>
        </View>
      </ScrollView>
    </Shell>
  );
}

function ChildBanner({ child }: { child: Child }) {
  return (
    <View className="mx-6 mb-7 flex-row items-center rounded-3xl bg-[#eee5d6] p-6">
      <Avatar child={child} size={66} />
      <View className="ml-5 flex-1">
        <Text style={{ color: palette.text }} className="text-2xl font-bold">{child.name}</Text>
        <Text style={{ color: palette.muted }} className="mt-1 text-base">Esta información se añadirá a su perfil médico.</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="mb-6">
      <Text style={{ color: palette.muted }} className="mb-2 text-base">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9a928b"
        multiline={multiline}
        style={{ color: palette.text, minHeight: multiline ? 140 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
        className="rounded-3xl border border-[#ddd2c4] bg-[#eee5d6] px-6 py-4 text-lg"
      />
    </View>
  );
}

function DateField({ label, value, onChange }: { label: string; value: Date | null; onChange: (value: Date) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-6">
      <Text style={{ color: palette.muted }} className="mb-2 text-base">{label}</Text>
      <TouchableOpacity onPress={() => setOpen(true)} className="flex-row items-center justify-between rounded-3xl border border-[#ddd2c4] bg-[#eee5d6] px-6 py-4">
        <Text style={{ color: value ? palette.text : '#9a928b' }} className="text-lg">{value ? value.toLocaleDateString('es-ES') : 'dd/mm/aaaa'}</Text>
        <Ionicons name="calendar-outline" size={22} color={palette.text} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          onValueChange={(_, selected) => { if (selected) onChange(selected); }}
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
  return (
    <Shell>
      <Header
        title={title}
        onBack={() => navigation.goBack()}
        action={<TouchableOpacity onPress={onSave} disabled={saving}><Text style={{ color: saving ? '#bdb4aa' : palette.blue }} className="text-base font-semibold">Guardar</Text></TouchableOpacity>}
      />
      <KeyboardAvoidingView
        behavior="height"
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: 38, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <ChildBanner child={child} />
          <View className="px-6">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

function AddVaccineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const [name, setName] = useState('');
  const [applied, setApplied] = useState(true);
  const [appliedAt, setAppliedAt] = useState<Date | null>(new Date());
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [lot, setLot] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return Alert.alert('Falta información', 'Introduce el nombre de la vacuna.');
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/vaccine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          childId: child.id,
          appliedAt: applied ? appliedAt?.toISOString() : null,
          scheduledFor: scheduledFor?.toISOString(),
          lot,
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
    <FormLayout title="Nueva vacuna" child={child} onSave={save} saving={saving}>
      <Field label="Nombre *" placeholder="Ej. Triple vírica" value={name} onChangeText={setName} />
      <Text style={{ color: palette.muted }} className="mb-2 text-base">Estado *</Text>
      <View className="mb-6 flex-row gap-3">
        {[true, false].map((value) => (
          <TouchableOpacity
            key={String(value)}
            onPress={() => setApplied(value)}
            style={{ borderColor: applied === value ? palette.blue : '#ddd2c4', backgroundColor: applied === value ? '#dce7f1' : palette.card }}
            className="flex-1 items-center rounded-3xl border p-4"
          >
            <Text style={{ color: applied === value ? palette.blue : palette.muted }} className="text-base font-semibold">{value ? 'Aplicada' : 'Pendiente'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {applied && <DateField label="Fecha de aplicación *" value={appliedAt} onChange={setAppliedAt} />}
      <Field label="Número de lote" placeholder="Ej. A4821X" value={lot} onChangeText={setLot} />
      {!applied && <DateField label="Próxima dosis" value={scheduledFor} onChange={setScheduledFor} />}
    </FormLayout>
  );
}

function AddAllergyScreen() {
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <FormLayout title="Nueva alergia" child={child} onSave={() => Alert.alert('Información', 'El registro de alergias estará disponible próximamente.')} saving={false}>
      <Field label="Nombre *" placeholder="Ej. Frutos secos" value={name} onChangeText={setName} />
      <Field label="Reacción o indicaciones" placeholder="Describe la reacción y qué hacer en caso de exposición" value={notes} onChangeText={setNotes} multiline />
    </FormLayout>
  );
}

function AddConditionScreen() {
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  return (
    <FormLayout title="Nueva condición" child={child} onSave={() => Alert.alert('Información', 'El registro de condiciones estará disponible próximamente.')} saving={false}>
      <Field label="Nombre *" placeholder="Ej. Asma leve" value={name} onChangeText={setName} />
      <DateField label="Fecha de diagnóstico *" value={date} onChange={setDate} />
      <Field label="Notas y seguimiento" placeholder="Tratamiento, especialista o indicaciones relevantes" value={notes} onChangeText={setNotes} multiline />
    </FormLayout>
  );
}

function AddMedicineScreen() {
  const route = useRoute<any>();
  const child = route.params.child as Child;
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [times, setTimes] = useState('');
  return (
    <FormLayout title="Nuevo medicamento" child={child} onSave={() => Alert.alert('Información', 'El registro de medicamentos estará disponible próximamente.')} saving={false}>
      <Field label="Nombre del medicamento *" placeholder="Ej. Loratadina 5 mg" value={name} onChangeText={setName} />
      <View className="flex-row gap-3">
        <View className="flex-1"><Field label="Dosis *" placeholder="Ej. 5 ml" value={dosage} onChangeText={setDosage} /></View>
        <View className="flex-1"><Field label="Frecuencia *" placeholder="Ej. cada 8 h" value={frequency} onChangeText={setFrequency} /></View>
      </View>
      <DateField label="Fecha de inicio *" value={startDate} onChange={setStartDate} />
      <Field label="Horarios de toma" placeholder="Ej. 08:00, 16:00, 00:00" value={times} onChangeText={setTimes} />
      <Text style={{ color: palette.muted }} className="-mt-4 mb-5 text-sm">Separa cada horario con una coma.</Text>
    </FormLayout>
  );
}

export default function FamiliaScreen() {
  const { selectedUserId } = useFamilySelection();
  return (
    <Stack.Navigator key={`familia-${selectedUserId ?? 'none'}`} initialRouteName="ChildPicker" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChildPicker" component={ChildPickerScreen} />
      <Stack.Screen name="ChildProfile" component={ChildProfileScreen} />
      <Stack.Screen name="AddVaccine" component={AddVaccineScreen} />
      <Stack.Screen name="AddAllergy" component={AddAllergyScreen} />
      <Stack.Screen name="AddCondition" component={AddConditionScreen} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
    </Stack.Navigator>
  );
}
