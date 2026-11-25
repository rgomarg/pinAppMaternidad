/**
 * Tema visual de NANNY.
 *
 * Única fuente de colores y tipografía para los estilos que se escriben en JS
 * (style={...}, colores de iconos, navegación, gráficas). Los mismos valores
 * están en tailwind.config.js para las clases de NativeWind; si se cambia uno,
 * hay que cambiar el otro.
 *
 * Solo contiene valores estéticos: no tiene lógica.
 */

export const COLORS = {
  /** Fondo de respaldo de las pantallas (debajo del degradado) */
  background: '#E6EBD0',
  /** Degradado del fondo de pantalla: arriba (amarillo) → centro (verde agua) → abajo (azul cielo) */
  gradientStart: '#F3E496',
  gradientMid: '#D6E4D8',
  gradientEnd: '#A3CFF2',
  /** Campos y chips dentro de las tarjetas blancas */
  field: '#F4F4F2',
  /** Tarjeta crema de la cabecera de las pantallas principales (mockup) */
  hero: '#F8F4DC',
  /** Avatar vacío y etiquetas grises de los hilos (mockup) */
  placeholder: '#C4C4C4',
  /** Botón flotante "+" del foro */
  fab: '#CFE7F9',
  /** Tarjetas y superficies principales */
  surface: '#FFFFFF',
  /** Campos, chips y paneles dentro de una tarjeta */
  surfaceAlt: '#F4F4F2',
  /** Color de marca: botones, enlaces, pestaña activa */
  primary: '#46424A',
  /** Variante oscura del color de marca (texto sobre fondos claros de marca) */
  primaryDark: '#2E2B31',
  /** Fondo suave de marca: chips seleccionados, insignias, avisos informativos */
  primarySoft: '#CFE7F9',
  /** Texto principal */
  text: '#1C1C1E',
  /** Texto secundario */
  muted: '#5A5A5E',
  /** Texto terciario y marcadores de posición */
  subtle: '#9E9EA3',
  /** Bordes y separadores */
  border: '#E6E6E3',
  /** Bordes con más contraste (campos activos, controles) */
  borderStrong: '#D0D0CC',
  // Colores con significado (se mantienen respecto al diseño anterior)
  green: '#65a882',
  red: '#cc7a66',
  /** Verde apagado para la variación de peso/altura (mockup Home) */
  greenMuted: '#5E8A6E',
  /** Rojo teja para acciones de borrar */
  danger: '#C0563F',
  /** Botón deshabilitado y elementos inactivos de la barra inferior */
  disabled: '#C4C4C4',
  tabInactive: '#A0A0A0',
} as const;

/**
 * Fuente Figtree (se carga en App.tsx con useFonts). En React Native cada grosor
 * es una familia distinta: fontWeight no la cambia. En NativeWind se usan como
 * font-figtree, font-figtree-medium, font-figtree-semibold y font-figtree-bold.
 */
export const FONTS = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

/**
 * Escala tipográfica: una sola familia (la del sistema: San Francisco en iOS,
 * Roboto en Android) y cuatro niveles. En las clases de NativeWind se usan como
 * text-title, text-subtitle, text-body y text-caption.
 */
export const TYPOGRAPHY = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '500' as const },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;

/**
 * Sombras suaves neutras para tarjetas y botones flotantes.
 * Se aplican con style={SHADOWS.card}.
 */
export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  /** Campos y botones blancos de los formularios: sombra muy suave */
  field: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
