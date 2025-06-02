
// tailwind.config.js
module.exports = {
  purge: ['./views/**/*.ejs', './public/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#10B981',
        secondary: '#F59E0B',
        background: '#F9FAFB',
        accent: '#34D399',
        neutral: '#6B7280',
        soft: '#E5E7EB',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        heading: ['Montserrat', 'ui-sans-serif'],
        body: ['Inter', 'ui-sans-serif']
      }
    }
  },
  variants: {},
  plugins: []
}
