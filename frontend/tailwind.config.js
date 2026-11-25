/** @type {import('tailwindcss').Config} */
// Los colores y la escala tipográfica son los mismos que en src/theme.ts:
// si se cambia un valor aquí, hay que cambiarlo también allí.
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'nanny-bg': '#F4F4F2',          // campos y chips dentro de tarjetas (el fondo de pantalla es un degradado)
        'nanny-card': '#FFFFFF',        // tarjetas y superficies
        'nanny-hero': '#F8F4DC',        // tarjeta crema de la cabecera
        'nanny-placeholder': '#C4C4C4', // avatar vacío y etiquetas grises
        'nanny-surface': '#F4F4F2',     // campos, chips y paneles dentro de una tarjeta
        'nanny-text': '#1C1C1E',        // texto principal
        'nanny-muted': '#5A5A5E',       // texto secundario
        'nanny-subtle': '#9E9EA3',      // texto terciario y placeholders
        'nanny-blue': '#46424A',        // color principal: gris carbón (se mantiene el nombre para no tocar las clases)
        'nanny-primary-dark': '#2E2B31',
        'nanny-soft': '#CFE7F9',        // fondo suave de marca
        'nanny-border': '#E6E6E3',      // bordes y separadores
        'nanny-border-strong': '#D0D0CC',
        'nanny-green': '#65a882',
        'nanny-red': '#cc7a66',
        'nanny-green-muted': '#5E8A6E',
        'nanny-danger': '#C0563F',
        'nanny-disabled': '#C4C4C4'
      },
      // Figtree: cada grosor es una familia (ver FONTS en src/theme.ts)
      fontFamily: {
        'figtree': ['Figtree_400Regular'],
        'figtree-medium': ['Figtree_500Medium'],
        'figtree-semibold': ['Figtree_600SemiBold'],
        'figtree-bold': ['Figtree_700Bold'],
      },
      // Escala tipográfica única: título, subtítulo, texto general y texto pequeño
      fontSize: {
        'display': ['34px', { lineHeight: '40px' }],
        'title': ['26px', { lineHeight: '32px' }],
        'subtitle': ['18px', { lineHeight: '24px' }],
        'body': ['15px', { lineHeight: '21px' }],
        'caption': ['12px', { lineHeight: '16px' }],
      }
    },
  },
  plugins: [],
}
