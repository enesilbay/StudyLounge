/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A237E',
        secondary: '#303F9F',
        softIndigo: '#E8EAF6',
        accent: '#FFC107',
        lightAmber: '#FFF8E1',
        success: '#2E7D32',
        softSuccess: '#E8F5E9',
        info: '#0288D1',
        softInfo: '#E1F5FE',
        danger: '#D32F2F',
        softDanger: '#FFEBEE',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        screenOff: '#000000',
        border: '#E5E7EB',
        textDark: '#1F2937',
        textMuted: '#6B7280',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
