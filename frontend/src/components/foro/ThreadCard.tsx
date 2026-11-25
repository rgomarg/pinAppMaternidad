import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThreadSummary } from '../../api/forum';
import { timeAgo } from './AuthorAvatar';
import { COLORS, SHADOWS } from '../../theme';

type Props = {
  thread: ThreadSummary;
  onPress: () => void;
  // Se mantiene por compatibilidad: el autor (y su moderación) se ven al abrir el hilo
  onAuthorBlocked?: () => void;
};

// Tarjeta del listado: título, extracto, etiqueta, nº de respuestas y antigüedad
export default function ThreadCard({ thread, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mb-5 rounded-[24px] bg-nanny-card px-6 pb-4 pt-5"
      style={SHADOWS.card}
      accessibilityRole="button"
    >
      <Text className="font-figtree-medium text-[20px] leading-[25px] text-nanny-text">{thread.title}</Text>
      <Text className="mt-3 font-figtree text-[15px] leading-[24px] text-nanny-muted" numberOfLines={2}>
        {thread.content}
      </Text>

      <View className="mt-6 flex-row items-center">
        <View className="flex-1 flex-row flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <View key={tag.id} className="rounded-full bg-nanny-placeholder px-3 py-1">
              <Text className="font-figtree text-[13px] text-white">{tag.name}</Text>
            </View>
          ))}
        </View>
        <Ionicons name="chatbubble-outline" size={20} color={COLORS.subtle} />
        <Text className="ml-2 font-figtree text-[14px] text-nanny-subtle">{thread.messageCount}</Text>
        <Text className="ml-6 font-figtree text-[14px] text-nanny-subtle">{timeAgo(thread.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}
