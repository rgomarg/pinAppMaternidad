import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { forumApi, type ThreadDetail } from '../../api/forum';
import { useFamilySelection } from '../../context/FamilySelectionContext';
import AuthorAvatar, { ProBadge, timeAgo } from '../../components/foro/AuthorAvatar';
import MessageItem from '../../components/foro/MessageItem';

export default function ThreadDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const threadId: number = route.params.threadId;
  const { selectedUserId } = useFamilySelection();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // selectedUserId permite al backend marcar los mensajes con like del usuario
  const loadThread = useCallback(async () => {
    setError(null);
    try {
      setThread(await forumApi.getThread(threadId, selectedUserId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el hilo.');
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

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-nanny-bg">
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="flex-row items-center self-start px-6 py-3"
        accessibilityRole="button"
        accessibilityLabel="Volver al foro"
      >
        <Ionicons name="chevron-back" size={18} color="#6d83a1" />
        <Text className="ml-1 text-sm text-nanny-blue">Foro</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#6d83a1" style={{ marginTop: 48 }} />
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
            <View className="mb-3 flex-row items-center">
              <AuthorAvatar author={thread.owner} />
              <View className="ml-3">
                <View className="flex-row items-center">
                  <Text className="text-sm font-semibold text-nanny-text">{thread.owner.name}</Text>
                  <ProBadge author={thread.owner} />
                </View>
                <Text className="text-xs text-nanny-muted">{timeAgo(thread.createdAt)}</Text>
              </View>
            </View>
            <Text className="mb-2 text-2xl font-semibold text-nanny-text">{thread.title}</Text>
            <Text className="text-base leading-6 text-nanny-text">{thread.content}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {thread.tags.map((tag) => (
                <Text key={tag.id} className="rounded-full bg-nanny-card px-3 py-1 text-xs text-nanny-blue">
                  #{tag.name}
                </Text>
              ))}
            </View>
          </View>

          <Text className="mb-3 text-base font-bold uppercase tracking-wider text-nanny-muted">
            {thread.messageCount === 1 ? '1 respuesta' : `${thread.messageCount} respuestas`}
          </Text>
          {thread.messages.length === 0 ? (
            <Text className="text-nanny-muted">Nadie ha respondido todavía.</Text>
          ) : (
            thread.messages.map((message) => <MessageItem key={message.id} message={message} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}
