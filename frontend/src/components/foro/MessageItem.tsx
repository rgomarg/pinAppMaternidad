import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageNode } from '../../api/forum';
import AuthorAvatar, { ProBadge, timeAgo } from './AuthorAvatar';
import LikeButton from './LikeButton';
import ModeratableAuthor from './ModeratableAuthor';

// Sangría de cada nivel de respuestas: margen + padding + línea guía a la izquierda
const INDENT_MARGIN = 16;
const INDENT_PADDING = 12;
const INDENT_BORDER = 2;
const INDENT_STEP = INDENT_MARGIN + INDENT_PADDING + INDENT_BORDER;

// Las tarjetas se estrechan con cada nivel hasta este ancho. A partir de ahí dejan de
// encogerse y la conversación se desborda hacia la derecha (scroll horizontal en ThreadDetailScreen)
const MIN_CARD_WIDTH = 260;

type Props = {
  message: MessageNode;
  depth?: number;
  // Ancho disponible para la conversación en el nivel 0 (ancho de la pantalla menos márgenes)
  availableWidth: number;
  userId: number | null;
  onReply: (message: MessageNode) => void;
  onDelete: (message: MessageNode) => void;
  onReport: (message: MessageNode) => void;
  // Solo para admins: tras bloquear al autor desde su nombre
  onAuthorBlocked: () => void;
};

export default function MessageItem({ message, depth = 0, availableWidth, userId, onReply, onDelete, onAuthorBlocked, onReport }: Props) {
  // Se fija el ancho explícitamente: dentro de un ScrollView horizontal el ancho no está acotado
  const cardWidth = Math.max(availableWidth - depth * INDENT_STEP, MIN_CARD_WIDTH);

  return (
    <View>
      <View style={{ width: cardWidth }} className="mb-3 rounded-3xl bg-white p-4">
        <View className="mb-2 flex-row items-center">
          <ModeratableAuthor author={message.author} onBlocked={onAuthorBlocked} className="flex-row items-center">
            <AuthorAvatar author={message.author} size={28} />
            <Text className="ml-2 text-sm font-semibold text-nanny-text">{message.author.name}</Text>
            <ProBadge author={message.author} />
          </ModeratableAuthor>
          <Text className="ml-auto text-xs text-nanny-muted">{timeAgo(message.createdAt)}</Text>
        </View>
        <Text className="text-base leading-6 text-nanny-text">{message.content}</Text>
        <View className="mt-3 flex-row items-center">
          <LikeButton message={message} userId={userId} />
          <TouchableOpacity onPress={() => onReply(message)} className="ml-5 flex-row items-center" accessibilityRole="button">
            <Ionicons name="return-down-forward" size={16} color="#6d83a1" />
            <Text className="ml-1 text-sm text-nanny-blue">Responder</Text>
          </TouchableOpacity>
          {message.author.id !== userId && (
            <TouchableOpacity
              onPress={() => onReport(message)}
              disabled={message.reportedByMe}
              className="ml-auto"
              accessibilityRole="button"
              accessibilityLabel={message.reportedByMe ? "Mensaje ya reportado" : "Reportar mensaje"}
            >
              <Ionicons
                name={message.reportedByMe ? "flag" : "flag-outline"}
                size={16}
                color={message.reportedByMe ? "#cc7a66" : "#808080"}
              />
            </TouchableOpacity>
          )}
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
          style={{ marginLeft: INDENT_MARGIN, paddingLeft: INDENT_PADDING, borderLeftWidth: INDENT_BORDER }}
          className="border-nanny-card"
        >
          {message.replies.map((reply) => (
            <MessageItem
              key={reply.id}
              message={reply}
              depth={depth + 1}
              availableWidth={availableWidth}
              userId={userId}
              onReply={onReply}
              onDelete={onDelete}
              onAuthorBlocked={onAuthorBlocked}
              onReport={onReport}
            />
          ))}
        </View>
      )}
    </View>
  );
}
