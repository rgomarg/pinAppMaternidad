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
  /** Fondo de las pantallas */
  background: '#F8EFF5',
  /** Tarjetas y superficies principales */
  surface: '#FFFFFF',
  /** Campos, chips y paneles dentro de una tarjeta */
  surfaceAlt: '#F4ECF6',
  /** Color de marca: botones, enlaces, pestaña activa */
  primary: '#654875',
  /** Variante oscura del color de marca (texto sobre fondos claros de marca) */
  primaryDark: '#4C3459',
  /** Fondo suave de marca: chips seleccionados, insignias, avisos informativos */
  primarySoft: '#EAE0F2',
  /** Texto principal */
  text: '#2D1E36',
  /** Texto secundario */
  muted: '#6E5D78',
  /** Texto terciario y marcadores de posición */
  subtle: '#8F8296',
  /** Bordes y separadores */
  border: '#E7DAEA',
  /** Bordes con más contraste (campos activos, controles) */
  borderStrong: '#D5C3DD',
  // Colores con significado (se mantienen respecto al diseño anterior)
  green: '#65a882',
  red: '#cc7a66',
} as const;

/**
 * Escala tipográfica: una sola familia (la del sistema: San Francisco en iOS,
 * Roboto en Android) y cuatro niveles. En las clases de NativeWind se usan como
 * text-title, text-subtitle, text-body y text-caption.
 */
export const TYPOGRAPHY = {
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
} as const;
