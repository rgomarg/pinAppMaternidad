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
        'nanny-bg': '#F8EFF5',          // campos y chips dentro de tarjetas (el fondo de pantalla es un degradado)
        'nanny-card': '#FFFFFF',        // tarjetas y superficies
        'nanny-surface': '#F4ECF6',     // campos, chips y paneles dentro de una tarjeta
        'nanny-text': '#2D1E36',        // texto principal
        'nanny-muted': '#6E5D78',       // texto secundario
        'nanny-subtle': '#8F8296',      // texto terciario y placeholders
        'nanny-blue': '#654875',        // color de marca (se mantiene el nombre para no tocar las clases)
        'nanny-primary-dark': '#4C3459',
        'nanny-soft': '#EAE0F2',        // fondo suave de marca
        'nanny-border': '#E7DAEA',      // bordes y separadores
        'nanny-border-strong': '#D5C3DD',
        'nanny-green': '#65a882',
        'nanny-red': '#cc7a66'
      },
      // Escala tipográfica única: título, subtítulo, texto general y texto pequeño
      fontSize: {
        'title': ['26px', { lineHeight: '32px' }],
        'subtitle': ['18px', { lineHeight: '24px' }],
        'body': ['15px', { lineHeight: '21px' }],
        'caption': ['12px', { lineHeight: '16px' }],
      }
    },
  },
  plugins: [],
}
