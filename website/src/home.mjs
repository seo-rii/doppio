import './site.css';

document.querySelectorAll('[data-current-year]').forEach((node) => {
  node.textContent = new Date().getFullYear().toString();
});
