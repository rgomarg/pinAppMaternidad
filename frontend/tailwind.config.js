/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
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
    fontFamily: {
      comic: ['"Comic Sans MS"', '"Comic Sans"', 'cursive'],
    }
  },
  plugins: [],
}