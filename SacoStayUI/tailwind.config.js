/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // SacoStay brand colors
        'saco-orange': '#FF9F43',
        'saco-orange-dark': '#FF8C2A',
        'saco-brand': '#ffbd59',
        'saco-brand-dark': '#f5a832',
        'saco-blue': '#1A1A2E',
        'saco-gray': '#6B7280',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        'saco': '0 20px 40px rgba(0, 0, 0, 0.1)',
        'saco-orange': '0 4px 12px rgba(255, 159, 67, 0.3)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  safelist: [
    'text-[#2563EB]',
    'text-[#F59E0B]',
    'text-[#EF4444]',
    'bg-[#2563EB]',
    'bg-[#F59E0B]',
    'bg-[#EF4444]',
    'text-[21px]',
    'text-[19px]',
    'text-[17px]',
    'text-[15px]',
  ],
  plugins: [],
}
