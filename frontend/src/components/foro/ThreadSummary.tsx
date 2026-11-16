import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { forumApi } from "../../api/forum";

// Resumen con IA de un hilo del foro (solo usuarios PRO).
// El botón va en la fila de acciones del hilo y la tarjeta debajo, así que el estado
// vive en un hook que la pantalla comparte entre los dos componentes.

const BLUE = "#6d83a1";
const MUTED = "#a39b90";
const CARD_BG = "#e6edf6";
const CARD_BORDER = "#b9cbe2";
const ACTIVE_BG = "#dce6f2";
const PRO_COLOR = "#8a6cc4";
const PRO_BG = "#efeaf8";

export function useThreadSummary(
  threadId: number,
  userId: number | null,
  isPro: boolean,
) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Al cambiar de usuario seleccionado se descarta el resumen anterior
  useEffect(() => {
    setOpen(false);
    setSummary(null);
    setError(null);
  }, [threadId, userId]);

  const toggle = async () => {
    // Usuario no PRO: no se pide nada al backend, solo se muestra el aviso
    if (!isPro || userId == null) {
      setShowUpgrade(true);
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(null);

    // Siempre se pregunta al backend: si el hilo no ha cambiado devuelve el resumen
    // guardado de este usuario (sin llamar a la IA); si ha cambiado, genera uno nuevo.
    // Si ya había uno en pantalla se enseña mientras tanto, sin "Generando...".
    if (!summary) setLoading(true);
    try {
      const res = await forumApi.getThreadSummary(threadId, userId);
      setSummary(res.summary);
    } catch (e) {
      // Si falla pero ya teníamos uno, se deja el anterior en vez de mostrar el error
      if (!summary) {
        setError(
          e instanceof Error ? e.message : "No se pudo generar el resumen.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    open,
    summary,
    loading,
    error,
    isPro,
    toggle,
    showUpgrade,
    closeUpgrade: () => setShowUpgrade(false),
  };
}

type SummaryState = ReturnType<typeof useThreadSummary>;

// Botón "Resumen" <-> "Ocultar". Para usuarios no PRO sale en gris con candado
export function SummaryButton({ state }: { state: SummaryState }) {
  const { open, isPro, toggle, loading } = state;
  const locked = !isPro;
  const color = locked ? MUTED : BLUE;

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={loading}
      style={open ? { backgroundColor: ACTIVE_BG } : undefined}
      className={`flex-row items-center rounded-full px-4 py-2 ${open ? "" : "bg-nanny-card"}`}
      accessibilityRole="button"
      accessibilityLabel={
        locked
          ? "Resumen con IA (función PRO)"
          : open
            ? "Ocultar resumen"
            : "Generar resumen con IA"
      }
    >
      <Ionicons
        name={locked ? "lock-closed" : "sparkles-outline"}
        size={14}
        color={color}
      />
      <Text style={{ color }} className="ml-1 text-sm font-semibold">
        {open ? "Ocultar" : "Resumen"}
      </Text>
      {locked && (
        <View
          style={{ backgroundColor: PRO_BG }}
          className="ml-1.5 rounded-full px-1.5 py-0.5"
        >
          <Text style={{ color: PRO_COLOR }} className="text-[10px] font-bold">
            PRO
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Tarjeta azul con el resumen, debajo de la cabecera del hilo
export function SummaryCard({ state }: { state: SummaryState }) {
  const { open, summary, loading, error } = state;
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copy = async () => {
    if (!summary) return;
    await Clipboard.setStringAsync(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={{ backgroundColor: CARD_BG, borderColor: CARD_BORDER }}
      className="mt-5 rounded-2xl border p-4"
    >
      <View className="mb-3 flex-row items-center">
        <View
          style={{ backgroundColor: BLUE }}
          className="h-9 w-9 items-center justify-center rounded-full"
        >
          <Ionicons name="sparkles" size={16} color="#ffffff" />
        </View>
        <View className="ml-3 flex-1">
          <Text style={{ color: BLUE }} className="text-sm font-bold">
            Resumen de respuestas
          </Text>
          <Text className="text-xs text-nanny-muted">Generado con IA</Text>
        </View>
        {summary && !loading && (
          <TouchableOpacity
            onPress={copy}
            className="flex-row items-center rounded-full bg-white px-3 py-1"
            accessibilityRole="button"
            accessibilityLabel="Copiar resumen"
          >
            <Ionicons
              name={copied ? "checkmark" : "copy-outline"}
              size={14}
              color={BLUE}
            />
            <Text style={{ color: BLUE }} className="ml-1 text-xs font-semibold">
              {copied ? "Copiado" : "Copiar"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-row items-center py-2">
          <ActivityIndicator size="small" color={BLUE} />
          <Text className="ml-2 text-sm text-nanny-muted">
            Generando resumen...
          </Text>
        </View>
      ) : error ? (
        <Text className="text-sm text-nanny-red">{error}</Text>
      ) : (
        <Text className="text-sm leading-6 text-nanny-text">{summary}</Text>
      )}
    </View>
  );
}

// Aviso para usuarios no PRO al pulsar "Resumen"
export function ProUpgradeModal({ state }: { state: SummaryState }) {
  const { showUpgrade, closeUpgrade } = state;

  return (
    <Modal
      visible={showUpgrade}
      transparent
      animationType="fade"
      onRequestClose={closeUpgrade}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View className="items-center rounded-3xl bg-nanny-bg p-6">
          <View
            style={{ backgroundColor: PRO_BG }}
            className="mb-3 h-14 w-14 items-center justify-center rounded-full"
          >
            <Ionicons name="lock-closed" size={24} color={PRO_COLOR} />
          </View>
          <Text className="text-center text-lg font-bold text-nanny-text">
            Función exclusiva para usuarios PRO
          </Text>
          <Text className="mt-2 text-center text-sm text-nanny-muted">
            Mejora tu plan para obtener esta funcionalidad: un resumen con IA de
            los puntos clave de cada hilo del foro.
          </Text>
          <TouchableOpacity
            onPress={closeUpgrade}
            style={{ backgroundColor: PRO_COLOR }}
            className="mt-5 w-full flex-row items-center justify-center rounded-2xl py-3"
            accessibilityRole="button"
            accessibilityLabel="Mejorar mi plan a PRO"
          >
            <Ionicons name="star" size={16} color="#ffffff" />
            <Text className="ml-2 font-semibold text-white">Mejorar a PRO</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={closeUpgrade}
            className="mt-2 w-full items-center rounded-2xl bg-nanny-card py-3"
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
          >
            <Text className="font-semibold text-nanny-text">Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
