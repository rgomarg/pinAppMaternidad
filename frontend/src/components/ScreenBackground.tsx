import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { COLORS } from '../theme';

/**
 * Fondo degradado amarillo → verde agua → azul de las pantallas (solo decorativo).
 * Se coloca como primer hijo del contenedor raíz de cada pantalla;
 * ocupa todo el espacio y no captura toques.
 */
export default function ScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="nannyScreenBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.gradientStart} />
            <Stop offset="0.5" stopColor={COLORS.gradientMid} />
            <Stop offset="1" stopColor={COLORS.gradientEnd} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#nannyScreenBg)" />
      </Svg>
    </View>
  );
}
