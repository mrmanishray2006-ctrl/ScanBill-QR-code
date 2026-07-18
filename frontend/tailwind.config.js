/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enables class-based dark mode triggering
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: '#6366f1', // Indigo primary
          dark: '#4f46e5',
          light: '#818cf8',
        },
        accent: {
          DEFAULT: '#0ea5e9', // Sky blue accent
          dark: '#0284c7',
          light: '#38bdf8',
        },
        surface: {
          DEFAULT: '#1e293b', // Slate surface cards
          light: '#f8fafc',
          card: 'rgba(30, 41, 59, 0.7)',
        },
        green: {
          DEFAULT: '#10b981', // Emerald green
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b', // Amber yellow
        },
        danger: {
          DEFAULT: '#ef4444', // Red alerts
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        md: '12px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
