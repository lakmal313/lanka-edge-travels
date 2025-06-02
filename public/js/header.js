
// public/js/header.js
window.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('main-nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('bg-white', 'shadow-md', 'transition-all', 'duration-300', 'py-3');
      nav.classList.remove('bg-transparent', 'py-6');
    } else {
      nav.classList.remove('bg-white', 'shadow-md', 'py-3');
      nav.classList.add('bg-transparent', 'py-6');
    }
  });
});
