/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: {
          green: '#22c55e',
          'green-dark': '#16a34a',
          'green-light': '#bbf7d0',
          emerald: '#059669',
        },
      },
    },
  },
  plugins: [],
}
