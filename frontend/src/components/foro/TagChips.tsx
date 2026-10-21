import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { Tag } from '../../api/forum';

type Props = {
  tags: Tag[];
  selected: number[];
  onToggle: (tagId: number) => void;
  // Muestra un chip "Todos" que limpia la selección (filtro del listado)
  onClear?: () => void;
};

export default function TagChips({ tags, selected, onToggle, onClear }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {onClear && <Chip label="Todos" active={selected.length === 0} onPress={onClear} />}
      {tags.map((tag) => (
        <Chip key={tag.id} label={tag.name} active={selected.includes(tag.id)} onPress={() => onToggle(tag.id)} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`rounded-full px-4 py-2 ${active ? 'bg-nanny-blue' : 'bg-nanny-card'}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-nanny-text'}`}>{label}</Text>
    </TouchableOpacity>
  );
}
