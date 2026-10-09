/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nanny-bg': '#f7f3ec',
        'nanny-card': '#ece6d9',
        'nanny-text': '#3a3a3a',
        'nanny-muted': '#808080',
        'nanny-blue': '#6d83a1',
        'nanny-green': '#65a882',
        'nanny-red': '#cc7a66'
      }
    },
  },
  plugins: [],
}
