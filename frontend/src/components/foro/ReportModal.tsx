import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { forumApi } from "../../api/forum";

type Props = {
    visible: boolean;
    targetType: "THREAD" | "MESSAGE";
    targetId: number;
    reporterId: number | null;
    onClose: () => void;
    onReported?: () => void;
};

export default function ReportModal({
    visible,
    targetType,
    targetId,
    reporterId,
    onClose,
    onReported,
}: Props) {
    const [comment, setComment] = useState("");
    const [sending, setSending] = useState(false);
    const canSend = comment.trim().length > 0 && !sending;

    const close = () => {
        setComment("");
        onClose();
    };

    const submit = async () => {
        if (!reporterId) {
            Alert.alert(
                "Selecciona un usuario",
                "Elige un usuario en la pestaña Datos para reportar.",
            );
            return;
        }
        setSending(true);
        try {
            await forumApi.createReport({
                targetType,
                targetId,
                reporterId,
                comment: comment.trim(),
            });
            close();
            onReported?.();
            Alert.alert("Reporte enviado", "El equipo de moderación lo revisará.");
        } catch (e) {
            Alert.alert(
                "No se pudo enviar",
                e instanceof Error ? e.message : "Inténtalo de nuevo.",
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={close}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    justifyContent: "center",
                    padding: 24,
                }}
            >
                <View className="rounded-3xl bg-nanny-bg p-5">
                    <View className="mb-4 flex-row items-center">
                        <Ionicons name="flag-outline" size={22} color="#cc7a66" />
                        <View className="ml-3 flex-1">
                            <Text className="text-lg font-semibold text-nanny-text">
                                Reportar contenido
                            </Text>
                            <Text className="text-sm text-nanny-muted">
                                Cuéntanos por qué quieres reportar este{" "}
                                {targetType === "THREAD" ? "hilo" : "comentario"}.
                            </Text>
                        </View>
                    </View>
                    <Text className="mb-1 text-sm text-nanny-text">Comentario *</Text>
                    <TextInput
                        value={comment}
                        onChangeText={setComment}
                        placeholder="Describe el motivo del reporte..."
                        multiline
                        maxLength={1000}
                        style={{ minHeight: 100, textAlignVertical: "top" }}
                        className="rounded-2xl bg-nanny-card p-3 text-base text-nanny-text"
                    />
                    <View className="mt-4 flex-row gap-3">
                        <TouchableOpacity
                            onPress={close}
                            className="flex-1 items-center rounded-2xl bg-nanny-card py-3"
                        >
                            <Text className="font-semibold text-nanny-text">Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={submit}
                            disabled={!canSend}
                            className={`flex-1 items-center rounded-2xl py-3 ${canSend ? "bg-nanny-red" : "bg-nanny-card"}`}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="font-semibold text-white">Enviar reporte</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
