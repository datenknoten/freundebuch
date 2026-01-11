/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#2D5016',
          light: '#3A6B1E',
          dark: '#1F3810',
        },
        sage: {
          DEFAULT: '#8B9D83',
          light: '#B8C4B0',
        },
        amber: {
          warm: '#D4A574',
        },
      },
      fontFamily: {
        heading: ['"Yanone Kaffeesatz"', 'sans-serif'],
        body: ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
};
