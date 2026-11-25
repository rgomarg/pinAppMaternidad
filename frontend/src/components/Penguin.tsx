import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * Ilustraciones de pingüino de las cabeceras (solo decorativas).
 * - "peek": un pingüino asomándose con las aletas levantadas (Foro).
 * - "family": un pingüino grande y uno pequeño sentados (Libro de Familia).
 */

const BLUE = '#8CCBF2';
const BLUE_DARK = '#6FB3E3';
const BELLY = '#FFFFFF';
const BEAK = '#F6A75E';
const LINE = '#1C1C1E';

type Props = { variant?: 'peek' | 'family'; width?: number };

export default function Penguin({ variant = 'peek', width = 150 }: Props) {
  if (variant === 'family') {
    return (
      <Svg width={width} height={width * 0.82} viewBox="0 0 170 140">
        {/* Pingüino grande */}
        <G>
          <Path d="M68 70 C60 82 60 96 66 104" fill={BLUE_DARK} stroke={LINE} strokeWidth={2} strokeLinecap="round" />
          <Path d="M142 70 C150 82 150 96 144 104" fill={BLUE_DARK} stroke={LINE} strokeWidth={2} strokeLinecap="round" />
          <Ellipse cx={105} cy={70} rx={38} ry={56} fill={BLUE} stroke={LINE} strokeWidth={2} />
          <Ellipse cx={106} cy={82} rx={26} ry={42} fill={BELLY} />
          <Circle cx={95} cy={52} r={3.5} fill={LINE} />
          <Circle cx={117} cy={52} r={3.5} fill={LINE} />
          <Ellipse cx={106} cy={61} rx={7} ry={4.5} fill={BEAK} stroke={LINE} strokeWidth={1.5} />
          <Path d="M86 124 l-5 8 m5 -8 l0 9 m0 -9 l5 8" stroke={BEAK} strokeWidth={4} strokeLinecap="round" />
          <Path d="M124 124 l-5 8 m5 -8 l0 9 m0 -9 l5 8" stroke={BEAK} strokeWidth={4} strokeLinecap="round" />
        </G>
        {/* Pingüino pequeño */}
        <G>
          <Path d="M30 98 C24 106 24 116 28 122" fill={BLUE_DARK} stroke={LINE} strokeWidth={1.5} strokeLinecap="round" />
          <Ellipse cx={48} cy={104} rx={22} ry={30} fill={BLUE} stroke={LINE} strokeWidth={1.5} />
          <Ellipse cx={49} cy={110} rx={15} ry={22} fill={BELLY} />
          <Circle cx={43} cy={95} r={2.5} fill={LINE} />
          <Circle cx={55} cy={95} r={2.5} fill={LINE} />
          <Ellipse cx={49} cy={101} rx={5} ry={3} fill={BEAK} stroke={LINE} strokeWidth={1} />
          <Path d="M40 132 l-3 5 m3 -5 l0 6 m0 -6 l3 5" stroke={BEAK} strokeWidth={3} strokeLinecap="round" />
          <Path d="M58 132 l-3 5 m3 -5 l0 6 m0 -6 l3 5" stroke={BEAK} strokeWidth={3} strokeLinecap="round" />
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={width} height={width * 0.56} viewBox="0 0 160 90">
      {/* Aletas levantadas */}
      <Path d="M36 90 C22 74 16 50 24 40 C32 32 40 50 44 72" fill={BLUE} stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M124 90 C138 74 144 50 136 40 C128 32 120 50 116 72" fill={BLUE} stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
      {/* Cuerpo y barriga */}
      <Path d="M38 92 C38 42 58 12 80 12 C102 12 122 42 122 92 Z" fill={BLUE} stroke={LINE} strokeWidth={3} />
      <Path d="M54 92 C54 58 66 40 80 40 C94 40 106 58 106 92 Z" fill={BELLY} />
      {/* Cara */}
      <Circle cx={69} cy={50} r={4} fill={LINE} />
      <Circle cx={93} cy={50} r={4} fill={LINE} />
      <Ellipse cx={81} cy={60} rx={8} ry={5.5} fill={BEAK} stroke={LINE} strokeWidth={2} />
    </Svg>
  );
}
