import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

/**
 * Cabecera crema de las pantallas principales (mockup "Foro de Familias" y
 * "Libro de Familia"): título grande, subtítulo, ilustración a la derecha y,
 * opcionalmente, botones arriba a la derecha. Ocupa también la zona de la
 * barra de estado, así que la pantalla no debe añadir el padding superior.
 */
export default function HeroHeader({
  title,
  subtitle,
  illustration,
  actions,
}: {
  title: string;
  subtitle?: string;
  illustration?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: COLORS.hero,
        paddingTop: insets.top + 8,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
      }}
    >
      <View className="min-h-[44px] flex-row items-center justify-end gap-3 px-5">{actions}</View>
      <View className="flex-row items-end">
        <View className="flex-1 pb-6 pl-6 pr-2 pt-6">
          <Text className="font-figtree-medium text-[34px] leading-[40px] text-nanny-text">{title}</Text>
          {subtitle && (
            <Text className="mt-1 font-figtree text-[15px] leading-[20px] text-nanny-muted">{subtitle}</Text>
          )}
        </View>
        {illustration && <View className="pr-4">{illustration}</View>}
      </View>
    </View>
  );
}
