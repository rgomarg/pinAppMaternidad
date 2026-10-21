import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThreadSummary } from '../../api/forum';
import AuthorAvatar, { ProBadge, timeAgo } from './AuthorAvatar';

export default function ThreadCard({ thread, onPress }: { thread: ThreadSummary; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} className="mb-3 rounded-3xl bg-white p-5" accessibilityRole="button">
      <View className="mb-3 flex-row items-center">
        <AuthorAvatar author={thread.owner} size={32} />
        <Text className="ml-2 text-sm font-semibold text-nanny-text">{thread.owner.name}</Text>
        <ProBadge author={thread.owner} />
        <Text className="ml-auto text-xs text-nanny-muted">{timeAgo(thread.createdAt)}</Text>
      </View>

      <Text className="mb-1 text-lg font-semibold text-nanny-text">{thread.title}</Text>
      <Text className="text-sm text-nanny-muted" numberOfLines={2}>
        {thread.content}
      </Text>

      <View className="mt-4 flex-row items-center">
        <View className="flex-1 flex-row flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <Text key={tag.id} className="rounded-full bg-nanny-bg px-3 py-1 text-xs text-nanny-blue">
              #{tag.name}
            </Text>
          ))}
        </View>
        <Ionicons name="chatbubble-outline" size={16} color="#808080" />
        <Text className="ml-1 text-sm text-nanny-muted">{thread.messageCount}</Text>
      </View>
    </TouchableOpacity>
  );
}
