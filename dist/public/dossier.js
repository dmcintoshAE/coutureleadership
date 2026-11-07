// Print a detached snapshot so browser print never includes navigation or form controls.
(() => {
 document.addEventListener('click', event => {
  const button = event.target.closest('[data-print]');
  if (!button) return;
  const source = document.querySelector(button.dataset.print);
  if (!source) return;
  document.getElementById('executive-dossier')?.remove();
  const dossier = document.createElement('article');
  dossier.id = 'executive-dossier';
  const heading = document.createElement('div');
  heading.className = 'dossier-heading';
  heading.textContent = `COUTURE LEADERSHIP™ · EXECUTIVE DOSSIER · ${new Date().toLocaleDateString()} · Confidential`;
  dossier.append(heading);
  const snapshot = source.cloneNode(true);
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('button, .panel-actions, [hidden], #reset-confirm, #career-confirm, #career-form').forEach(el => el.remove());
  snapshot.querySelectorAll('input, textarea, select').forEach(el => {
   const text = document.createElement('span');
   text.textContent = el.type === 'checkbox' ? (el.checked ? 'Complete — ' : 'To do — ') : el.value;
   el.replaceWith(text);
  });
  dossier.append(snapshot);
  document.body.append(dossier);
  const previous = document.title;
  document.title = 'Couture Leadership - Executive Dossier';
  try { window.print(); } finally { document.title = previous; dossier.remove(); }
 });
})();
