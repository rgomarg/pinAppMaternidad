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

type RegistroHijoParams = {
    RegistroHijo: { userId?: number };
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

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

export default function ChildRegistrationScreen() {
    const route = useRoute<RouteProp<RegistroHijoParams, "RegistroHijo">>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const userId = route.params?.userId;

    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [birthDate, setBirthDate] = useState<Date | null>(null);
    const [showIosPicker, setShowIosPicker] = useState(false);
    const [bloodGroup, setBloodGroup] = useState<string | null>(null);
    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [allergies, setAllergies] = useState<string[]>([]);
    const [conditions, setConditions] = useState<string[]>([]);
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

    const isValid = name.trim().length > 0 && birthDate !== null;

    const handleSave = async () => {
        if (!isValid || saving) return;
        if (!userId) {
            Alert.alert(
                "Falta el usuario",
                "No se ha indicado a qué usuario pertenece el niño/a.",
            );
            return;
        }

        setSaving(true);
        try {
            // El backend (CreateChildDto) por ahora solo admite estos campos.
            const response = await fetch(`${API_URL}/child`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: `${name.trim()} ${surname.trim()}`.trim(),
                    birthDate: birthDate!.toISOString(),
                    bloodGroup: bloodGroup ?? undefined,
                    allergies: allergies.length ? allergies.join(", ") : undefined,
                    parentId: userId, // el DTO del backend lo llama parentId
                    weight: weight ? parseFloat(weight) : undefined,
                    height: height ? parseFloat(height) : undefined,
                    //diseases: conditions.length ? conditions : undefined,
                }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            navigation.goBack();
        } catch (error) {
            console.error("Error creando hijo:", error);
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
                <Text className="text-lg font-bold text-nanny-text">Añadir niño/a</Text>
                <TouchableOpacity onPress={handleSave} disabled={!isValid || saving}>
                    <Text
                        className={`text-base font-semibold ${isValid ? "text-nanny-blue" : "text-[#c4c0b6]"}`}
                    >
                        Guardar
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

                <SectionTitle>Alergias</SectionTitle>
                <TagListInput
                    placeholder="ej. Penicilina"
                    items={allergies}
                    onChange={setAllergies}
                />

                <SectionTitle>Condiciones crónicas</SectionTitle>
                <TagListInput
                    placeholder="ej. Asma, Diabetes tipo 1"
                    items={conditions}
                    onChange={setConditions}
                />
            </ScrollView>
        </View>
    );
}
