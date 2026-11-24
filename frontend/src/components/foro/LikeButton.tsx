import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forumApi, type LikeState, type MessageNode } from '../../api/forum';
import { COLORS } from '../../theme';

type Props = {
  message: MessageNode;
  userId: number | null;
};

export default function LikeButton({ message, userId }: Props) {
  const [state, setState] = useState<LikeState>({ likesCount: message.likesCount, likedByMe: message.likedByMe });
  const [pending, setPending] = useState(false);

  // Al recargar el hilo llegan valores nuevos del backend
  useEffect(() => {
    setState({ likesCount: message.likesCount, likedByMe: message.likedByMe });
  }, [message.likesCount, message.likedByMe]);

  const toggle = async () => {
    if (!userId) {
      Alert.alert('Selecciona un usuario', 'Elige un usuario en la pestaña Inicio para dar me gusta.');
      return;
    }
    if (pending) return;

    // Actualización optimista; el backend devuelve el contador real
    const previous = state;
    setState({
      likesCount: state.likesCount + (state.likedByMe ? -1 : 1),
      likedByMe: !state.likedByMe,
    });
    setPending(true);
    try {
      setState(
        previous.likedByMe
          ? await forumApi.unlikeMessage(message.id, userId)
          : await forumApi.likeMessage(message.id, userId),
      );
    } catch {
      setState(previous);
    } finally {
      setPending(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={toggle}
      className="flex-row items-center"
      accessibilityRole="button"
      accessibilityState={{ selected: state.likedByMe }}
      accessibilityLabel={`Me gusta, ${state.likesCount}`}
    >
      <Ionicons
        name={state.likedByMe ? 'heart' : 'heart-outline'}
        size={16}
        color={state.likedByMe ? COLORS.danger : COLORS.muted}
      />
      <Text className={`ml-1.5 font-figtree-medium text-[14px] ${state.likedByMe ? 'text-nanny-danger' : 'text-nanny-muted'}`}>
        {state.likesCount}
      </Text>
    </TouchableOpacity>
  );
}
