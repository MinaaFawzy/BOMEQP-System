/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8edf5',
          100: '#c5d0e2',
          200: '#9fb2ce',
          300: '#7894ba',
          400: '#5b7dac',
          500: '#3e669e',
          600: '#375d8f',
          700: '#2c4a5f',  // Secondary color
          800: '#1a2c49',  // Primary color
          900: '#0f1a2e',
          950: '#080d17',
        },
      },
    },
  },
  plugins: [],
}
