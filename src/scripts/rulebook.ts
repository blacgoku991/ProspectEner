/**
 * Pages de règlement : recherche instantanée, filtre par niveau, sommaire qui suit la lecture,
 * copie du lien d'une règle et mise en évidence de la règle ciblée par l'URL.
 */
import { scrollToTarget, ScrollTrigger, toast } from './app.ts';

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const root = document.querySelector<HTMLElement>('[data-rulebook]');
if (root) {
  const input = document.querySelector<HTMLInputElement>('[data-rule-search]');
  const levels = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-level].pill'));
  const rules = Array.from(root.querySelectorAll<HTMLElement>('[data-rule]'));
  const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-section]'));
  const chapters = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
  const count = root.querySelector<HTMLElement>('[data-rule-count]');
  const empty = root.querySelector<HTMLElement>('[data-rule-empty]');
  const reset = root.querySelector<HTMLButtonElement>('[data-rule-reset]');

  let level = 'all';
  let refreshTimer = 0;

  function apply() {
    const tokens = norm(input?.value ?? '')
      .split(/\s+/)
      .filter(Boolean);
    let shown = 0;

    for (const rule of rules) {
      const hay = rule.dataset.search ?? '';
      const okLevel = level === 'all' || rule.dataset.level === level;
      const okText = tokens.every((t) => hay.includes(t));
      rule.hidden = !(okLevel && okText);
      if (!rule.hidden) shown++;
    }
    for (const section of sections) {
      section.hidden = !section.querySelector('[data-rule]:not([hidden])');
    }
    for (const chapter of chapters) {
      chapter.hidden = !chapter.querySelector('[data-rule]:not([hidden])');
    }

    const filtering = tokens.length > 0 || level !== 'all';
    if (count) {
      count.textContent = filtering
        ? `${shown} résultat${shown > 1 ? 's' : ''}`
        : `${rules.filter((r) => !r.closest('[data-lexique]')).length} règles`;
    }
    if (empty) empty.hidden = shown > 0;

    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }

  input?.addEventListener('input', apply);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      apply();
      input.blur();
    }
  });

  levels.forEach((btn) =>
    btn.addEventListener('click', () => {
      level = btn.dataset.level ?? 'all';
      for (const b of levels) {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      }
      apply();
    }),
  );

  reset?.addEventListener('click', () => {
    if (input) input.value = '';
    levels[0]?.click();
    apply();
  });

  // Raccourci « / » pour aller à la recherche
  window.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = document.activeElement;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
    e.preventDefault();
    input?.focus();
  });

  /* ---- Sommaire : chapitre en cours ---- */
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc]'));
  const setCurrent = (id: string) => {
    for (const link of tocLinks) {
      const on = link.dataset.toc === id;
      link.classList.toggle('is-current', on);
      if (on && window.matchMedia('(min-width: 1020px)').matches) {
        link.scrollIntoView({ block: 'nearest' });
      }
    }
  };
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setCurrent(entry.target.id);
      }
    },
    { rootMargin: '-30% 0px -65% 0px' },
  );
  chapters.forEach((c) => spy.observe(c));
  if (chapters[0]) setCurrent(chapters[0].id);

  // Sur mobile, le sommaire démarre replié.
  const box = document.querySelector<HTMLDetailsElement>('.toc__box');
  const wide = window.matchMedia('(min-width: 1020px)');
  const syncBox = () => {
    if (box) box.open = wide.matches;
  };
  syncBox();
  wide.addEventListener('change', syncBox);
  box?.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a') && !wide.matches) box.open = false;
  });

  /* ---- Lien direct vers une règle ---- */
  root.addEventListener('click', async (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-copy]');
    if (!btn) return;
    const url = `${window.location.origin}${window.location.pathname}#${btn.dataset.copy}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Lien de la règle copié');
    } catch {
      window.location.hash = btn.dataset.copy ?? '';
      toast('Lien placé dans la barre d’adresse');
    }
  });

  const highlight = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el?.matches('[data-rule]')) return;
    if (el.hidden) reset?.click();
    el.classList.remove('is-target');
    void el.offsetWidth;
    el.classList.add('is-target');
  };
  window.addEventListener('hashchange', highlight);
  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToTarget(window.location.hash, -200);
      highlight();
    }, 900);
  }
}
