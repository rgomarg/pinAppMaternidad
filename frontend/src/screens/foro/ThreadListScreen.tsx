import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { forumApi, type Tag, type ThreadSummary } from '../../api/forum';
import { useFamilySelection } from '../../context/FamilySelectionContext';
import TagChips from '../../components/foro/TagChips';
import ThreadCard from '../../components/foro/ThreadCard';
import ScreenBackground from '../../components/ScreenBackground';
import { getUser } from '../../api/user';
import { COLORS, SHADOWS } from '../../theme';

const PAGE_SIZE = 20;

export default function ThreadListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { selectedUserId, isAdmin } = useFamilySelection();
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagId, setTagId] = useState<number | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    forumApi.getTags().then(setTags).catch(() => setTags([]));
  }, []);

  // Foto del usuario activo para el avatar de la cabecera
  useEffect(() => {
    if (!selectedUserId) {
      setUserAvatarUrl(null);
      return;
    }
    getUser(selectedUserId)
      .then((user) => setUserAvatarUrl(user.avatarUrl))
      .catch(() => setUserAvatarUrl(null));
  }, [selectedUserId]);

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

  const openNewThread = () => {
    if (!selectedUserId) {
      Alert.alert('Selecciona un usuario', 'Elige un usuario en la pestaña Inicio para poder publicar en el foro.');
      return;
    }
    navigation.navigate('NewThread');
  };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.background }}>
      <ScreenBackground />
      <View className="pb-4 pt-4">
        <View className="mb-5 flex-row items-center justify-between px-5">
          <Text className="font-figtree-medium text-display text-nanny-text">Foro</Text>
          <View className="flex-row items-center gap-3">
            {isAdmin && (
              <TouchableOpacity
                onPress={() => navigation.navigate('AdminPanel')}
                className="h-11 w-11 items-center justify-center rounded-full bg-nanny-card"
                style={SHADOWS.card}
                accessibilityRole="button"
                accessibilityLabel="Abrir panel de moderación"
              >
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            {/* Igual que en Inicio: abre el selector de usuarios (con "Editar mi perfil") */}
            <TouchableOpacity
              onPress={() => navigation.navigate('Datos', { openUserPicker: Date.now() })}
              accessibilityRole="button"
              accessibilityLabel="Cambiar de usuario o editar mi perfil"
              className="relative"
            >
              <View className="h-11 w-11 rounded-full border-2 border-nanny-blue p-0.5">
                <View className="flex-1 items-center justify-center overflow-hidden rounded-full bg-nanny-blue">
                  {userAvatarUrl ? (
                    <Image source={{ uri: userAvatarUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text className="font-figtree-semibold text-body text-white">{selectedUserId ? String(selectedUserId) : '?'}</Text>
                  )}
                </View>
              </View>
              <View className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white bg-nanny-blue">
                <Ionicons name="person" size={8} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View className="pl-5">
          <TagChips
            tags={tags}
            selected={tagId ? [tagId] : []}
            onToggle={selectTag}
            onClear={() => selectTag(null)}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(thread) => String(thread.id)}
          renderItem={({ item }) => (
            <ThreadCard
              thread={item}
              onPress={() => navigation.navigate('ThreadDetail', { threadId: item.id })}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 112 }}
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
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} /> : undefined}
          ListEmptyComponent={
            <View className="items-center rounded-[26px] bg-nanny-card px-6 py-8" style={SHADOWS.card}>
              <View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-nanny-soft">
                <Ionicons name={error ? 'cloud-offline-outline' : 'chatbox-ellipses-outline'} size={22} color={COLORS.primary} />
              </View>
              <Text className="text-center font-figtree-semibold text-[16px] text-nanny-text">
                {error ? 'No se pudo cargar el foro' : 'Todavía no hay conversaciones aquí'}
              </Text>
              <Text className="mt-2 text-center font-figtree text-[14px] leading-[21px] text-nanny-muted">
                {error
                  ? 'Comprueba que el backend esté activo y vuelve a intentarlo.'
                  : 'Sé la primera persona en compartir una duda o experiencia sobre este tema.'}
              </Text>
              <TouchableOpacity
                onPress={error ? () => { setLoading(true); loadFirstPage(); } : openNewThread}
                className="mt-5 rounded-full bg-nanny-blue px-6 py-3"
                accessibilityRole="button"
              >
                <Text className="font-figtree text-[16px] text-white">{error ? 'Reintentar' : 'Iniciar conversación'}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        onPress={openNewThread}
        style={[{ position: 'absolute', right: 16, bottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' }, SHADOWS.floating]}
        className="h-14 w-14 items-center justify-center rounded-full bg-nanny-blue"
        accessibilityRole="button"
        accessibilityLabel="Nuevo hilo"
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
