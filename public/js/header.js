// public/js/header.js
window.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('bg-white', 'shadow-md');
        nav.classList.remove('bg-transparent');
      } else {
        nav.classList.remove('bg-white', 'shadow-md');
        nav.classList.add('bg-transparent');
      }
    });
  });
  