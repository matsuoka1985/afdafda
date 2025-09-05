export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue"
  ],
  safelist: [
    'filter-red-heart',
    'filter-white-heart'
  ],
  theme: {
    extend: {
      colors: {
        'custom-dark': 'rgb(21,32,43)',
        'custom-purple': 'rgb(84,25,218)',
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, rgb(84,25,218) 0%, rgb(120,40,230) 100%)',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.filter-red-heart': {
          filter: 'brightness(0) saturate(100%) invert(23%) sepia(100%) saturate(7500%) hue-rotate(340deg) brightness(1.2) contrast(1)',
        },
        '.filter-white-heart': {
          filter: 'brightness(0) saturate(100%) invert(100%)',
        }
      };
      addUtilities(newUtilities);
    }
  ],
}