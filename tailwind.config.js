/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', light: '#3B82F6', dark: '#1D4ED8' },
        surface: { DEFAULT: '#0F172A', card: '#1E293B', border: '#334155' },
        risk: { low: '#10B981', medium: '#F59E0B', high: '#EF4444' },
        accent: '#38BDF8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-risk': 'pulseRisk 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseRisk: { '0%,100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' }, '50%': { boxShadow: '0 0 0 12px rgba(239,68,68,0)' } },
      },
    },
  },
  plugins: [],
}
