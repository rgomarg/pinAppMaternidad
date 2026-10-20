import React from 'react';
import { Text, View } from 'react-native';
import type { Author } from '../../api/forum';

// Iniciales sobre un color fijo por usuario (aún no hay fotos de perfil)
const COLORS = ['#6d83a1', '#65a882', '#cc7a66', '#a38b6d', '#8a76a8'];

export default function AuthorAvatar({ author, size = 36 }: { author: Author; size?: number }) {
  const initials = author.name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS[author.id % COLORS.length],
      }}
      className="items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.38 }} className="font-bold text-white">
        {initials}
      </Text>
    </View>
  );
}

export function timeAgo(date: string) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Distintivo para profesionales sanitarios (rol PRO)
export function ProBadge({ author }: { author: Author }) {
  if (author.role !== 'PRO') return null;
  return (
    <Text className="ml-2 rounded-full bg-nanny-green/15 px-2 py-0.5 text-xs font-semibold text-nanny-green">
      Profesional
    </Text>
  );
}
