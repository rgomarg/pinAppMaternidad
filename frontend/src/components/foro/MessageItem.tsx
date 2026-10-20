import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageNode } from '../../api/forum';
import AuthorAvatar, { ProBadge, timeAgo } from './AuthorAvatar';
import LikeButton from './LikeButton';

// A partir de este nivel las respuestas ya no se sangran más (pantallas estrechas)
const MAX_INDENT_DEPTH = 3;

type Props = {
  message: MessageNode;
  depth?: number;
  userId: number | null;
  onReply: (message: MessageNode) => void;
  onDelete: (message: MessageNode) => void;
};

export default function MessageItem({ message, depth = 0, userId, onReply, onDelete }: Props) {
  return (
    <View>
      <View className="mb-3 rounded-3xl bg-white p-4">
        <View className="mb-2 flex-row items-center">
          <AuthorAvatar author={message.author} size={28} />
          <Text className="ml-2 text-sm font-semibold text-nanny-text">{message.author.name}</Text>
          <ProBadge author={message.author} />
          <Text className="ml-auto text-xs text-nanny-muted">{timeAgo(message.createdAt)}</Text>
        </View>
        <Text className="text-base leading-6 text-nanny-text">{message.content}</Text>
        <View className="mt-3 flex-row items-center">
          <LikeButton message={message} userId={userId} />
          <TouchableOpacity onPress={() => onReply(message)} className="ml-5 flex-row items-center" accessibilityRole="button">
            <Ionicons name="return-down-forward" size={16} color="#6d83a1" />
            <Text className="ml-1 text-sm text-nanny-blue">Responder</Text>
          </TouchableOpacity>
          {message.author.id === userId && (
            <TouchableOpacity
              onPress={() => onDelete(message)}
              className="ml-auto"
              accessibilityRole="button"
              accessibilityLabel="Eliminar mensaje"
            >
              <Ionicons name="trash-outline" size={16} color="#808080" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {message.replies.length > 0 && (
        <View
          style={depth < MAX_INDENT_DEPTH ? { marginLeft: 16, paddingLeft: 12, borderLeftWidth: 2 } : undefined}
          className="border-nanny-card"
        >
          {message.replies.map((reply) => (
            <MessageItem key={reply.id} message={reply} depth={depth + 1} userId={userId} onReply={onReply} onDelete={onDelete} />
          ))}
        </View>
      )}
    </View>
  );
}
