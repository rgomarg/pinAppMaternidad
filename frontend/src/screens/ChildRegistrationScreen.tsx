import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { API_URL } from "../api/config";
import { allergyRecords, type Allergy } from "../utils/allergies";

// Datos del hijo que recibe el modo edición (los devuelve GET /child/:id).
type EditableChild = {
    id: number;
    name: string;
    surname?: string | null;
    birthDate: string;
    sex?: "MALE" | "FEMALE" | null;
    bloodGroup?: string | null;
    allergies?: string | null;
};

type RegistroHijoParams = {
    RegistroHijo: { userId?: number; child?: EditableChild };
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const SEX_OPTIONS = [
    { value: "MALE", label: "Masculino", icon: "male" },
    { value: "FEMALE", label: "Femenino", icon: "female" },
] as const;

type Sex = (typeof SEX_OPTIONS)[number]["value"];

const inputClass =
    "bg-nanny-card border border-[#e0d9c9] rounded-2xl px-4 py-4 text-base text-nanny-text";

function SectionTitle({ children }: { children: string }) {
    return (
        <Text className="text-sm font-bold text-nanny-red uppercase mt-8 mb-3">
            {children}
        </Text>
    );
}

function Label({ children }: { children: string }) {
    return <Text className="text-sm text-nanny-muted mb-2 mt-4">{children}</Text>;
}

// Campo de texto con botón "+" que va acumulando elementos en una lista
function TagListInput({
    placeholder,
    items,
    onChange,
}: {
    placeholder: string;
    items: string[];
    onChange: (items: string[]) => void;
}) {
    const [text, setText] = useState("");

    const add = () => {
        const value = text.trim();
        if (!value) return;
        onChange([...items, value]);
        setText("");
    };

    return (
        <View>
            <View className="flex-row gap-3">
                <TextInput
                    className={`flex-1 ${inputClass}`}
                    placeholder={placeholder}
                    placeholderTextColor="#9a9a8e"
                    value={text}
                    onChangeText={setText}
                    onSubmitEditing={add}
                />
                <TouchableOpacity
                    onPress={add}
                    className="w-14 bg-nanny-blue rounded-2xl items-center justify-center"
                >
                    <Text className="text-white text-xl">+</Text>
                </TouchableOpacity>
            </View>
            {items.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-3">
                    {items.map((item, i) => (
                        <TouchableOpacity
                            key={`${item}-${i}`}
                            onPress={() => onChange(items.filter((_, idx) => idx !== i))}
                            className="bg-nanny-card border border-[#e0d9c9] rounded-full px-3 py-1"
                        >
                            <Text className="text-nanny-text text-sm">{item} ✕</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

type MedicineDraft = { name: string; dosage: string };

// Igual que TagListInput pero cada elemento lleva nombre y dosis (obligatorias en el backend)
function MedicineListInput({
    items,
    onChange,
}: {
    items: MedicineDraft[];
    onChange: (items: MedicineDraft[]) => void;
}) {
    const [name, setName] = useState("");
    const [dosage, setDosage] = useState("");

    const add = () => {
        if (!name.trim() || !dosage.trim()) return;
        onChange([...items, { name: name.trim(), dosage: dosage.trim() }]);
        setName("");
        setDosage("");
    };

    return (
        <View>
            <View className="flex-row gap-3">
                <TextInput
                    className={`flex-1 ${inputClass}`}
                    placeholder="Medicamento"
                    placeholderTextColor="#9a9a8e"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    className={`w-28 ${inputClass}`}
                    placeholder="Dosis"
                    placeholderTextColor="#9a9a8e"
                    value={dosage}
                    onChangeText={setDosage}
                    onSubmitEditing={add}
                />
                <TouchableOpacity
                    onPress={add}
                    className="w-14 bg-nanny-blue rounded-2xl items-center justify-center"
                >
                    <Text className="text-white text-xl">+</Text>
                </TouchableOpacity>
            </View>
            {items.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-3">
                    {items.map((item, i) => (
                        <TouchableOpacity
                            key={`${item.name}-${i}`}
                            onPress={() => onChange(items.filter((_, idx) => idx !== i))}
                            className="bg-nanny-card border border-[#e0d9c9] rounded-full px-3 py-1"
                        >
                            <Text className="text-nanny-text text-sm">
                                {item.name} · {item.dosage} ✕
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

export default function ChildRegistrationScreen() {
    const route = useRoute<RouteProp<RegistroHijoParams, "RegistroHijo">>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const userId = route.params?.userId;
    const editingChild = route.params?.child;
    const isEditing = !!editingChild;
    // Alergias ya guardadas (con su gravedad) para no perderla al editar
    const existingAllergies: Allergy[] = allergyRecords(editingChild?.allergies);

    const [name, setName] = useState(editingChild?.name ?? "");
    const [surname, setSurname] = useState(editingChild?.surname ?? "");
    const [birthDate, setBirthDate] = useState<Date | null>(
        editingChild ? new Date(editingChild.birthDate) : null,
    );
    const [showIosPicker, setShowIosPicker] = useState(false);
    const [sex, setSex] = useState<Sex | null>(editingChild?.sex ?? null);
    const [bloodGroup, setBloodGroup] = useState<string | null>(editingChild?.bloodGroup ?? null);
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [allergies, setAllergies] = useState<string[]>(existingAllergies.map((a) => a.name));
    const [conditions, setConditions] = useState<string[]>([]);
    const [vaccines, setVaccines] = useState<string[]>([]);
    const [medicines, setMedicines] = useState<MedicineDraft[]>([]);
    const [saving, setSaving] = useState(false);

    const formatDate = (d: Date) =>
        d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

    const openDatePicker = () => {
        const current = birthDate ?? new Date();
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: current,
                mode: "date",
                maximumDate: new Date(),
                onChange: (_, selected) => selected && setBirthDate(selected),
            });
        } else {
            setShowIosPicker((v) => !v);
        }
    };

    const isValid = name.trim().length > 0 && birthDate !== null && sex !== null;

    const handleSave = async () => {
        if (saving) return;
        if (!name.trim()) {
            Alert.alert("Campo obligatorio", "El nombre es obligatorio.");
            return;
        }
        if (!isValid) return;
        if (!isEditing && !userId) {
            Alert.alert(
                "Falta el usuario",
                "No se ha indicado a qué usuario pertenece el niño/a.",
            );
            return;
        }

        setSaving(true);
        try {
            const basicData = {
                name: name.trim(),
                surname: surname.trim() || undefined,
                birthDate: birthDate!.toISOString(),
                sex,
                bloodGroup: bloodGroup ?? undefined,
            };

            const response = isEditing
                ? await fetch(`${API_URL}/child/${editingChild!.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...basicData,
                        // Se conserva la gravedad y las notas de las alergias que no se han tocado
                        allergies: JSON.stringify(
                            allergies.map(
                                (allergyName) =>
                                    existingAllergies.find((a) => a.name === allergyName) ?? {
                                        name: allergyName,
                                        severity: "moderada",
                                    },
                            ),
                        ),
                    }),
                })
                : await fetch(`${API_URL}/child`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...basicData,
                        allergies: allergies.length ? allergies.join(", ") : undefined,
                        parentId: userId, // el DTO del backend lo llama parentId
                        weight: weight ? parseFloat(weight) : undefined,
                        height: height ? parseFloat(height) : undefined,
                        diseases: conditions.length ? conditions : undefined,
                        vaccines: vaccines.length ? vaccines.map((v) => ({ name: v })) : undefined,
                        medicines: medicines.length ? medicines : undefined,
                    }),
                });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            navigation.goBack();
        } catch (error) {
            console.error("Error guardando hijo:", error);
            Alert.alert("Error", "No se pudo guardar. Inténtalo de nuevo.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="flex-1 bg-nanny-bg" style={{ paddingTop: insets.top }}>
            {/* Cabecera */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-nanny-card">
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text className="text-base text-nanny-muted">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold text-nanny-text">{isEditing ? "Editar niño/a" : "Añadir niño/a"}</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text
                        className={`text-base font-semibold ${isValid ? "text-nanny-blue" : "text-[#c4c0b6]"}`}
                    >
                        {isEditing ? "Guardar cambios" : "Guardar"}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: 24,
                    paddingBottom: insets.bottom + 48,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <SectionTitle>Datos básicos</SectionTitle>

                <Label>Nombre *</Label>
                <TextInput
                    className={inputClass}
                    placeholder="Nombre"
                    placeholderTextColor="#9a9a8e"
                    value={name}
                    onChangeText={setName}
                />

                <Label>Apellidos</Label>
                <TextInput
                    className={inputClass}
                    placeholder="Apellidos"
                    placeholderTextColor="#9a9a8e"
                    value={surname}
                    onChangeText={setSurname}
                />

                <Label>Fecha de nacimiento *</Label>
                <TouchableOpacity
                    onPress={openDatePicker}
                    className={`flex-row items-center justify-between ${inputClass}`}
                >
                    <Text className={birthDate ? "text-base text-nanny-text" : "text-base text-[#9a9a8e]"}>
                        {birthDate ? formatDate(birthDate) : "dd/mm/aaaa"}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#3a3a3a" />
                </TouchableOpacity>
                {Platform.OS === "ios" && showIosPicker && (
                    <DateTimePicker
                        value={birthDate ?? new Date()}
                        mode="date"
                        display="inline"
                        maximumDate={new Date()}
                        onChange={(_, selected) => selected && setBirthDate(selected)}
                    />
                )}

                <Label>Género *</Label>
                <View className="flex-row gap-3">
                    {SEX_OPTIONS.map((option) => {
                        const selected = sex === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                onPress={() => setSex(option.value)}
                                className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border ${selected
                                        ? "bg-nanny-blue border-nanny-blue"
                                        : "bg-nanny-card border-[#e0d9c9]"
                                    }`}
                            >
                                <Ionicons
                                    name={option.icon}
                                    size={18}
                                    color={selected ? "#ffffff" : "#6b6b60"}
                                />
                                <Text
                                    className={`font-semibold ${selected ? "text-white" : "text-nanny-muted"}`}
                                >
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Label>Grupo sanguíneo</Label>
                <View className="flex-row flex-wrap gap-2">
                    {BLOOD_GROUPS.map((group) => {
                        const selected = bloodGroup === group;
                        return (
                            <TouchableOpacity
                                key={group}
                                onPress={() => setBloodGroup(selected ? null : group)}
                                className={`px-4 py-2 rounded-full border ${selected
                                        ? "bg-nanny-blue border-nanny-blue"
                                        : "bg-nanny-card border-[#e0d9c9]"
                                    }`}
                            >
                                <Text
                                    className={`font-semibold ${selected ? "text-white" : "text-nanny-muted"}`}
                                >
                                    {group}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {!isEditing && (
                    <>
                <SectionTitle>Medidas actuales</SectionTitle>
                <View className="flex-row gap-5">
                    <View className="flex-1">
                        <Text className="text-sm text-nanny-muted mb-2">Peso (kg)</Text>
                        <TextInput
                            className={inputClass}
                            placeholder="ej. 22.5"
                            placeholderTextColor="#9a9a8e"
                            keyboardType="decimal-pad"
                            value={weight}
                            onChangeText={setWeight}
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm text-nanny-muted mb-2">Altura (cm)</Text>
                        <TextInput
                            className={inputClass}
                            placeholder="ej. 118"
                            placeholderTextColor="#9a9a8e"
                            keyboardType="decimal-pad"
                            value={height}
                            onChangeText={setHeight}
                        />
                    </View>
                </View>
                    </>
                )}

                <SectionTitle>Alergias</SectionTitle>
                <TagListInput
                    placeholder="ej. Penicilina"
                    items={allergies}
                    onChange={setAllergies}
                />

                {/* Al editar, vacunas, condiciones y medicamentos se gestionan desde el perfil del hijo */}
                {!isEditing && (
                    <>
                        <SectionTitle>Vacunas</SectionTitle>
                        <TagListInput
                            placeholder="ej. Triple vírica"
                            items={vaccines}
                            onChange={setVaccines}
                        />

                        <SectionTitle>Condiciones crónicas</SectionTitle>
                        <TagListInput
                            placeholder="ej. Asma, Diabetes tipo 1"
                            items={conditions}
                            onChange={setConditions}
                        />

                        <SectionTitle>Medicamentos</SectionTitle>
                        <MedicineListInput items={medicines} onChange={setMedicines} />
                    </>
                )}
            </ScrollView>
        </View>
    );
}
