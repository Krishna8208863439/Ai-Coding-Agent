/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#171717',
        editor: '#1e1e1e',
        sidebar: '#202020',
        panel: '#252525',
        surface: '#282828',
        border: '#333333',
        subtle: '#2d2d2d',
        accent: {
          DEFAULT: '#007acc',
          cyan: '#00d2ff',
          hover: '#0098ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

