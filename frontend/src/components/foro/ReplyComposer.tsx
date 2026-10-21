import React, { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <View className="border-t border-nanny-card bg-white px-4 pb-3 pt-2">
      {replyingTo && (
        <View className="mb-2 flex-row items-center">
          <Text className="flex-1 text-xs text-nanny-muted">
            Respondiendo a <Text className="font-semibold text-nanny-text">{replyingTo}</Text>
          </Text>
          <TouchableOpacity onPress={onCancelReply} accessibilityRole="button" accessibilityLabel="Cancelar respuesta">
            <Ionicons name="close" size={18} color="#808080" />
          </TouchableOpacity>
        </View>
      )}
      <View className="flex-row items-end">
        <TextInput
          value={content}
          onChangeText={setContent}
          maxLength={5000}
          placeholder={replyingTo ? 'Escribe tu respuesta' : 'Responder al hilo'}
          placeholderTextColor="#a8a29a"
          multiline
          style={{ maxHeight: 120 }}
          className="flex-1 rounded-2xl bg-nanny-bg px-4 py-2 text-base text-nanny-text"
        />
        <TouchableOpacity
          onPress={send}
          disabled={!canSend}
          className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${canSend ? 'bg-nanny-blue' : 'bg-nanny-card'}`}
          accessibilityRole="button"
          accessibilityLabel="Enviar respuesta"
        >
          {sending ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="send" size={18} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
