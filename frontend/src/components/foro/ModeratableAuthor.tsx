import React from 'react';
import { Alert, TouchableOpacity, View, type ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Author } from '../../api/forum';
import { adminApi } from '../../api/admin';
import { useFamilySelection } from '../../context/FamilySelectionContext';

type Props = {
  author: Author;
  // Se llama tras bloquear, para recargar la vista (el contenido del autor ya no es público)
  onBlocked: () => void;
  className?: string;
  children: React.ReactNode;
} & Pick<ViewProps, 'style'>;

// Envuelve el nombre/avatar de un autor del foro. Para un administrador se vuelve
// pulsable y ofrece bloquear al usuario directamente; para el resto es una View normal.
export default function ModeratableAuthor({ author, onBlocked, className, style, children }: Props) {
  const { selectedUserId, isAdmin } = useFamilySelection();
  // No se puede bloquear a otro admin ni a uno mismo (el backend también lo impide)
  const canModerate = isAdmin && selectedUserId !== null && author.id !== selectedUserId && author.role !== 'ADMIN';

  if (!canModerate) {
    return (
      <View className={className} style={style}>
        {children}
      </View>
    );
  }

  const block = async () => {
    try {
      await adminApi.blockUser(selectedUserId!, author.id);
      Alert.alert('Usuario bloqueado', `${author.name} y todo su contenido ya no son visibles en el foro.`);
      onBlocked();
    } catch (e) {
      Alert.alert('No se pudo bloquear', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    }
  };

  const openActions = () =>
    Alert.alert(
      `Bloquear a ${author.name}`,
      'Se ocultarán de inmediato su perfil y todos sus hilos y mensajes, y no podrá publicar. Podrás desbloquearlo desde el panel de moderación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Bloquear usuario', style: 'destructive', onPress: block },
      ],
    );

  return (
    <TouchableOpacity
      onPress={openActions}
      className={className}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`Opciones de moderación para ${author.name}`}
    >
      {children}
      <Ionicons name="shield-outline" size={12} color="#cc7a66" style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}
