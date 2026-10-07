/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Palette lifted from the original stylesheets so the React build looks
      // like the site people already know.
      colors: {
        brand: {
          50: '#e1f5ee',
          100: '#b3e8dc',
          300: '#4bd0b8',
          500: '#00b8a9', // primary teal
          600: '#009e97',
          700: '#0f6e56', // accessible text teal
          900: '#0b4a3c',
        },
        navy: {
          DEFAULT: '#0b1f3a',
          700: '#0e3460',
          800: '#162e52',
          900: '#0d2b4e',
        },
        accent: {
          DEFAULT: '#ef9f27',
          dark: '#854f0b',
          soft: '#faeeda',
        },
        info: '#185fa5',
        danger: {
          DEFAULT: '#a32d2d',
          soft: '#fcebeb',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 31, 58, 0.06), 0 8px 24px rgba(11, 31, 58, 0.06)',
        lift: '0 4px 8px rgba(11, 31, 58, 0.08), 0 16px 40px rgba(11, 31, 58, 0.10)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};