import React, { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { forumApi, type LikeState, type MessageNode } from '../../api/forum';

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
      Alert.alert(
        'Usuario no seleccionado',
        'Para votar comentarios, por favor selecciona un usuario desde la pestaña Inicio (icono de perfil arriba a la derecha).',
      );
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
      activeOpacity={0.7}
      className="flex-row items-center py-1 pr-2"
      accessibilityRole="button"
      accessibilityState={{ selected: state.likedByMe }}
      accessibilityLabel={state.likedByMe ? `Quitar voto, ${state.likesCount} votos` : `Votar, ${state.likesCount} votos`}
    >
      <Ionicons
        name={state.likedByMe ? 'thumbs-up' : 'thumbs-up-outline'}
        size={16}
        color={state.likedByMe ? '#6d83a1' : '#808080'}
      />
      <Text className={`ml-1 text-sm font-medium ${state.likedByMe ? 'text-nanny-blue' : 'text-nanny-muted'}`}>
        {state.likesCount}
      </Text>
    </TouchableOpacity>
  );
}
