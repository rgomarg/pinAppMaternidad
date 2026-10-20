import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forumApi, type Tag, type ThreadSummary } from '../../api/forum';
import TagChips from '../../components/foro/TagChips';
import ThreadCard from '../../components/foro/ThreadCard';

const PAGE_SIZE = 20;

export default function ThreadListScreen() {
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagId, setTagId] = useState<number | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    forumApi.getTags().then(setTags).catch(() => setTags([]));
  }, []);

  // Carga la primera página (al entrar, al cambiar de tag o al tirar hacia abajo)
  const loadFirstPage = useCallback(async () => {
    setError(null);
    try {
      const result = await forumApi.getThreads({ tagId, page: 1, limit: PAGE_SIZE });
      setThreads(result.items);
      setTotal(result.total);
      setPage(1);
    } catch {
      setError('No se pudo cargar el foro. Comprueba que el backend esté activo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tagId]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = async () => {
    if (loadingMore || threads.length >= total) return;
    setLoadingMore(true);
    try {
      const result = await forumApi.getThreads({ tagId, page: page + 1, limit: PAGE_SIZE });
      setThreads((current) => [...current, ...result.items]);
      setPage(result.page);
      setTotal(result.total);
    } catch {
      // Se reintenta al volver a llegar al final de la lista
    } finally {
      setLoadingMore(false);
    }
  };

  const selectTag = (id: number | null) => {
    setLoading(true);
    setTagId((current) => (current === id ? null : id));
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top }} className="bg-nanny-bg">
      <View className="px-6 pb-4 pt-2">
        <Text className="mb-1 text-sm font-medium text-nanny-muted">Comunidad</Text>
        <Text className="mb-4 text-3xl font-semibold text-nanny-text">Foro</Text>
        <TagChips
          tags={tags}
          selected={tagId ? [tagId] : []}
          onToggle={selectTag}
          onClear={() => selectTag(null)}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6d83a1" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(thread) => String(thread.id)}
          renderItem={({ item }) => <ThreadCard thread={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFirstPage();
              }}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#6d83a1" /> : null}
          ListEmptyComponent={
            <Text className="mt-12 text-center text-nanny-muted">
              {error ?? (tagId ? 'No hay hilos con esta etiqueta todavía.' : 'Todavía no hay hilos. ¡Abre el primero!')}
            </Text>
          }
        />
      )}
    </View>
  );
}
