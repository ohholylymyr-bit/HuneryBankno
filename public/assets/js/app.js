const btn = document.getElementById('hamburger');
const menu = document.getElementById('menu');
if (btn && menu) btn.addEventListener('click', () => menu.classList.toggle('open'));
