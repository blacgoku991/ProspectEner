/**
 * Pages catalogue (métiers, factions) : repérage de la section visible dans la barre collante
 * et filtrage des cartes par statut.
 */
import { ScrollTrigger } from './app.ts';

/* ---- Repérage de la section courante ---- */
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-spy]'));
const sections = links
  .map((link) => document.getElementById(link.dataset.spy ?? ''))
  .filter((el): el is HTMLElement => !!el);

if (sections.length) {
  const setCurrent = (id: string | null) => {
    for (const link of links) {
      const on = link.dataset.spy === id;
      link.classList.toggle('is-current', on);
      if (on) link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => spy.observe(s));
}

/* ---- Filtre par statut ---- */
const filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-filter]'));
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-status]'));

function applyFilter(value: string) {
  for (const btn of filters) {
    const on = btn.dataset.filter === value;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  }
  for (const card of cards) {
    card.hidden = value !== 'all' && card.dataset.status !== value;
  }
  document.querySelectorAll<HTMLElement>('[data-category]').forEach((cat) => {
    const visible = cat.querySelectorAll('[data-status]:not([hidden])').length;
    const empty = cat.querySelector<HTMLElement>('.sector__empty, [data-empty]');
    if (empty) empty.hidden = visible > 0;
  });
  ScrollTrigger.refresh();
}

filters.forEach((btn) => btn.addEventListener('click', () => applyFilter(btn.dataset.filter ?? 'all')));
