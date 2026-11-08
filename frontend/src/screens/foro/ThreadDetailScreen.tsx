import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { forumApi, type MessageNode, type ThreadDetail } from "../../api/forum";
import { adminApi } from "../../api/admin";
import { useFamilySelection } from "../../context/FamilySelectionContext";
import AuthorAvatar, {
  ProBadge,
  timeAgo,
} from "../../components/foro/AuthorAvatar";
import MessageItem from "../../components/foro/MessageItem";
import ModeratableAuthor from "../../components/foro/ModeratableAuthor";
import ReplyComposer from "../../components/foro/ReplyComposer";
import ReportModal from "../../components/foro/ReportModal";

export default function ThreadDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const threadId: number = route.params.threadId;
  const { selectedUserId, isAdmin } = useFamilySelection();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageNode | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: "THREAD" | "MESSAGE";
    id: number;
  } | null>(null);

  // selectedUserId permite al backend marcar los mensajes con like del usuario
  const loadThread = useCallback(async () => {
    setError(null);
    try {
      setThread(await forumApi.getThread(threadId, selectedUserId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el hilo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [threadId, selectedUserId]);

  useFocusEffect(
    useCallback(() => {
      loadThread();
    }, [loadThread]),
  );

  const confirmDelete = (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
  ) =>
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          onConfirm().catch((e) =>
            Alert.alert(
              "No se pudo eliminar",
              e instanceof Error ? e.message : "Inténtalo de nuevo.",
            ),
          ),
      },
    ]);

  const deleteThread = () =>
    confirmDelete(
      "Eliminar hilo",
      "El hilo y sus respuestas dejarán de estar visibles en el foro.",
      async () => {
        await forumApi.deleteThread(threadId, selectedUserId!);
        navigation.goBack();
      },
    );

  // Moderación: un admin puede eliminar cualquier hilo (borrado lógico, restaurable desde el panel)
  const moderateThread = () =>
    confirmDelete(
      "Eliminar hilo (moderación)",
      "El hilo desaparecerá del foro de inmediato. Podrás restaurarlo desde el panel de moderación.",
      async () => {
        await adminApi.deleteThread(selectedUserId!, threadId);
        navigation.goBack();
      },
    );

  // Las respuestas al mensaje no se pierden: pasan al primer nivel del hilo
  const deleteMessage = (message: MessageNode) =>
    confirmDelete(
      "Eliminar mensaje",
      "Esta acción no se puede deshacer.",
      async () => {
        await forumApi.deleteMessage(message.id, selectedUserId!);
        if (replyingTo?.id === message.id) setReplyingTo(null);
        await loadThread();
      },
    );

  const sendReply = async (content: string) => {
    if (!selectedUserId) return false;
    try {
      await forumApi.createMessage({
        content,
        authorId: selectedUserId,
        threadId,
        parentId: replyingTo?.id,
      });
      setReplyingTo(null);
      // Se recarga el hilo para ver la respuesta en su sitio del árbol
      await loadThread();
      return true;
    } catch (e) {
      Alert.alert(
        "No se pudo enviar",
        e instanceof Error ? e.message : "Inténtalo de nuevo.",
      );
      return false;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, paddingTop: insets.top }}
      className="bg-nanny-bg"
    >
      <View className="flex-row items-center justify-between px-6 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
          accessibilityRole="button"
          accessibilityLabel="Volver al foro"
        >
          <Ionicons name="chevron-back" size={18} color="#6d83a1" />
          <Text className="ml-1 text-sm text-nanny-blue">Foro</Text>
        </TouchableOpacity>
        {thread && thread.owner.id === selectedUserId ? (
          <TouchableOpacity
            onPress={deleteThread}
            accessibilityRole="button"
            accessibilityLabel="Eliminar hilo"
          >
            <Ionicons name="trash-outline" size={20} color="#cc7a66" />
          </TouchableOpacity>
        ) : (
          thread &&
          isAdmin && (
            <TouchableOpacity
              onPress={moderateThread}
              className="flex-row items-center"
              accessibilityRole="button"
              accessibilityLabel="Eliminar hilo como administrador"
            >
              <Ionicons name="shield-outline" size={18} color="#cc7a66" />
              <Text className="ml-1 text-sm font-semibold text-nanny-red">
                Eliminar
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#6d83a1"
          style={{ marginTop: 48 }}
        />
      ) : !thread ? (
        <Text className="mt-12 px-6 text-center text-nanny-muted">{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadThread();
              }}
            />
          }
        >
          <View className="mb-6">
            {/* Al bloquear al autor el hilo deja de ser público, así que se vuelve al listado */}
            <ModeratableAuthor
              author={thread.owner}
              onBlocked={() => navigation.goBack()}
              className="mb-3 flex-row items-center self-start"
            >
              <AuthorAvatar author={thread.owner} />
              <View className="ml-3">
                <View className="flex-row items-center">
                  <Text className="text-sm font-semibold text-nanny-text">
                    {thread.owner.name}
                  </Text>
                  <ProBadge author={thread.owner} />
                </View>
                <Text className="text-xs text-nanny-muted">
                  {timeAgo(thread.createdAt)}
                </Text>
              </View>
            </ModeratableAuthor>
            <Text className="mb-2 text-2xl font-semibold text-nanny-text">
              {thread.title}
            </Text>
            <Text className="text-base leading-6 text-nanny-text">
              {thread.content}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {thread.tags.map((tag) => (
                <Text
                  key={tag.id}
                  className="rounded-full bg-nanny-card px-3 py-1 text-xs text-nanny-blue"
                >
                  #{tag.name}
                </Text>
              ))}
            </View>
            {thread.owner.id !== selectedUserId && (
                <TouchableOpacity
                  onPress={() =>
                    setReportTarget({ type: "THREAD", id: thread.id })
                  }
                  disabled={thread.reportedByMe}
                  className="mt-3 flex-row items-center self-start rounded-full bg-nanny-card px-4 py-2"
                  accessibilityRole="button"
                  accessibilityLabel={thread.reportedByMe ? "Hilo ya reportado" : "Reportar hilo"}
                >
                  <Ionicons
                    name={thread.reportedByMe ? "flag" : "flag-outline"}
                    size={14}
                    color={thread.reportedByMe ? "#cc7a66" : "#808080"}
                  />
                  <Text className="ml-1 text-sm font-semibold text-nanny-muted">
                    {thread.reportedByMe ? "Reportado" : "Reportar"}
                  </Text>
                </TouchableOpacity>
              )}
          </View>

          <Text className="mb-3 text-base font-bold uppercase tracking-wider text-nanny-muted">
            {thread.messageCount === 1
              ? "1 respuesta"
              : `${thread.messageCount} respuestas`}
          </Text>
          {thread.messages.length === 0 ? (
            <Text className="text-nanny-muted">
              Nadie ha respondido todavía.
            </Text>
          ) : (
            thread.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                userId={selectedUserId}
                onReply={setReplyingTo}
                onDelete={deleteMessage}
                onAuthorBlocked={loadThread}
                onReport={(m) => setReportTarget({ type: "MESSAGE", id: m.id })}
              />
            ))
          )}
        </ScrollView>
      )}

      {thread &&
        (selectedUserId ? (
          <ReplyComposer
            replyingTo={replyingTo?.author.name ?? null}
            onCancelReply={() => setReplyingTo(null)}
            onSend={sendReply}
          />
        ) : (
          <Text className="border-t border-nanny-card bg-white px-6 py-4 text-center text-sm text-nanny-muted">
            Elige un usuario en la pestaña Datos para poder responder.
          </Text>
        ))}
      {reportTarget && (
        <ReportModal
          visible
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          reporterId={selectedUserId}
          onClose={() => setReportTarget(null)}
          onReported={loadThread}
        />
      )}
    </KeyboardAvoidingView>
  );
}
