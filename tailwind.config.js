/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        accent: 'var(--color-accent)',
        'accent-muted': 'var(--color-accent-muted)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        success: 'var(--color-success)',
        border: 'var(--color-border)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        marquee: 'marquee 22s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      boxShadow: {
        glow: '0 18px 36px -14px rgba(217,79,43,0.32), 0 4px 10px -6px rgba(74,53,38,0.16)',
        'glow-lg': '0 24px 48px -14px rgba(217,79,43,0.45), 0 0 0 5px rgba(217,79,43,0.12)',
        card: '0 18px 30px -16px rgba(217,79,43,0.45)',
      },
    },
  },
  plugins: [],
};
