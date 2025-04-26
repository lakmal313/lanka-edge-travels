// tailwind.config.js
module.exports = {
  content: [
    './public/css/**/*.css',
    './views/**/*.ejs'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#10B981',    // your teal
        secondary: '#F59E0B',  // your coral
        background: '#F3F4F6',
        accent: '#34D399'
      }
    }
  },
  plugins: []
}
