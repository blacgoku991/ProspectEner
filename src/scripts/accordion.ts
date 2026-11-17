/** Accordéons (FAQ) : un bouton, un panneau, une transition de hauteur en CSS. */
import { ScrollTrigger } from './app.ts';

document.querySelectorAll<HTMLElement>('[data-acc]').forEach((item) => {
  const btn = item.querySelector<HTMLButtonElement>('button[aria-controls]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    const group = item.closest('[data-acc-group]');
    // Un seul panneau ouvert par groupe.
    group?.querySelectorAll<HTMLElement>('[data-acc].is-open').forEach((other) => {
      if (other === item) return;
      other.classList.remove('is-open');
      other.querySelector('button[aria-controls]')?.setAttribute('aria-expanded', 'false');
    });
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    window.setTimeout(() => ScrollTrigger.refresh(), 650);
  });
});
