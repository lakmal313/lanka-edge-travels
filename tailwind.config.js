// tailwind.config.js
module.exports = {
  // Tailwind v2 uses `purge` (not `content`) to strip unused CSS
  purge: [
    './views/**/*.ejs',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#10B981',
        secondary: '#F59E0B',
        background:'#F3F4F6',
        accent:    '#34D399',
      }
    }
  },
  variants: {},
  plugins: []
}
