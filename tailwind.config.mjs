/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          black: '#000000',
          white: '#ffffff',
          green: '#00ff88',
          blue: '#00c8ff',
          amber: '#ffb800',
          red: '#ff4444',
        },
      },
    },
  },
  plugins: [],
};
