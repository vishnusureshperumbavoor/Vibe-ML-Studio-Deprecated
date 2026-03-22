/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        notebook: {
          bg: '#ffffff',        // Jupyter white background
          sidebar: '#f5f5f5',   // Top header
          cell: '#f7f7f7',      // Code background
          cellBorder: '#cfcfcf',// Grey borders
          text: '#000000',      // Black text
          textMuted: '#666666', // Grey text
          accent: '#1976d2',    // Blue accent
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in-out',
        'progress-indeterminate': 'progress 2s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    }
  },
  plugins: [],
}
