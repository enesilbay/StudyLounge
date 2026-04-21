/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-indigo': '#1A237E', 
        'amber-gold': '#FFC107',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}