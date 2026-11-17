/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#111827',
          light: '#1F2937',
          muted: '#4B5563',
        },
        paper: {
          DEFAULT: '#F7F3EA',
          card: '#FFFFFF',
          dark: '#EFE9DC',
        },
        signal: {
          DEFAULT: '#C73E3A',
          hover: '#B33431',
          light: '#FDF2F2',
        },
        saffron: {
          DEFAULT: '#E5A33D',
          hover: '#CF8F2E',
          light: '#FEF9EE',
        },
        mist: {
          DEFAULT: '#E6E8E3',
          dark: '#D2D6CE',
          light: '#F3F4F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
