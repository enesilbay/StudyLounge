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
        'indigo-hover': '#303F9F',
        'soft-indigo': '#E8EAF6',
        'amber-gold': '#FFC107',
        'light-amber': '#FFF8E1',
        'study-success': '#2E7D32',
        'soft-success': '#E8F5E9',
        'study-info': '#0288D1',
        'soft-info': '#E1F5FE',
        'study-danger': '#D32F2F',
        'soft-danger': '#FFEBEE',
        'study-bg': '#F8FAFC',
        'study-surface': '#FFFFFF',
        'study-border': '#E5E7EB',
        'study-text': '#1F2937',
        'study-muted': '#6B7280',
      },
      fontFamily: {
        'montserrat': ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
