import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme';

type Props = {
  // Nombre del autor del mensaje al que se responde (null = respuesta al hilo)
  replyingTo: string | null;
  onCancelReply: () => void;
  // Devuelve true si se envió, para vaciar el campo
  onSend: (content: string) => Promise<boolean>;
};

export default function ReplyComposer({ replyingTo, onCancelReply, onSend }: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const canSend = content.trim().length > 0 && !sending;

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    if (await onSend(content.trim())) setContent('');
    setSending(false);
  };

  return (
    <View className="bg-white px-4 pb-3 pt-3">
      {replyingTo && (
        <View className="mb-2 flex-row items-center px-1">
          <Text className="flex-1 font-figtree text-caption text-nanny-muted">
            Respondiendo a <Text className="font-figtree-semibold text-nanny-text">{replyingTo}</Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} accessibilityRole="button" accessibilityLabel="Cancelar respuesta">
            <Ionicons name="close" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      )}
      <View className="flex-row items-end">
        <TextInput
          value={content}
          onChangeText={setContent}
          maxLength={5000}
          placeholder={replyingTo ? 'Escribe tu respuesta...' : 'Escribe una respuesta...'}
          placeholderTextColor={COLORS.subtle}
          multiline
          style={[{ minHeight: 44, maxHeight: 120 }, SHADOWS.card]}
          className="flex-1 rounded-2xl bg-[#FBF8FC] px-4 py-2.5 font-figtree text-[16px] text-nanny-text"
        />
        <TouchableOpacity
          onPress={send}
          disabled={!canSend}
          className={`ml-3 h-11 w-11 items-center justify-center rounded-2xl ${canSend ? 'bg-nanny-blue' : 'bg-nanny-disabled/70'}`}
          accessibilityRole="button"
          accessibilityLabel="Enviar respuesta"
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="paper-plane-outline" size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
