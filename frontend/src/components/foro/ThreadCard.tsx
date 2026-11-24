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
      className="mb-3 rounded-[26px] bg-nanny-card px-5 pb-4 pt-5"
      style={SHADOWS.card}
      accessibilityRole="button"
    >
      <Text className="font-figtree-medium text-[18px] leading-[24px] text-nanny-text">{thread.title}</Text>
      <Text className="mt-2.5 font-figtree text-[14px] leading-[21px] text-nanny-muted" numberOfLines={2}>
        {thread.content}
      </Text>

      <View className="mt-5 flex-row items-center">
        <View className="flex-1 flex-row flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <View key={tag.id} className="rounded-full bg-nanny-soft px-2.5 py-0.5">
              <Text className="font-figtree-medium text-[12px] text-nanny-primary-dark">{tag.name}</Text>
            </View>
          ))}
        </View>
        <Ionicons name="chatbubble-outline" size={18} color={COLORS.subtle} />
        <Text className="ml-1.5 font-figtree-medium text-[14px] text-nanny-muted">{thread.messageCount}</Text>
        <Text className="ml-5 font-figtree text-[13px] text-nanny-subtle">{timeAgo(thread.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}
