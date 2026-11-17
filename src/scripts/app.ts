/**
 * Moteur d'interface d'Elyra : défilement fluide, voile de transition, apparitions,
 * curseur, halos, inclinaison 3D, boutons magnétiques, compteur de joueurs.
 * Chargé sur toutes les pages par le gabarit de base.
 */
import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

declare global {
  interface Window {
    __elyra?: boolean;
  }
}
window.__elyra = true;

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

const root = document.documentElement;

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export { gsap, ScrollTrigger, SplitText };

export let lenis: Lenis | null = null;

/* ------------------------------------------------------------------ Intro */

const introQueue: Array<() => void> = [];
let introDone = false;

/** Exécute `cb` quand le voile de chargement se lève (ou tout de suite s'il est déjà levé). */
export function onIntro(cb: () => void) {
  if (introDone) cb();
  else introQueue.push(cb);
}

function runIntro() {
  if (introDone) return;
  introDone = true;
  for (const cb of introQueue.splice(0)) {
    try {
      cb();
    } catch (err) {
      console.error(err);
    }
  }
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const holds: Array<Promise<unknown>> = [];
/**
 * Retient le lever du voile jusqu'à ce que `promise` soit tenue (ou `maxMs` écoulées).
 * À appeler dès l'évaluation du script de page, ex. pour attendre la première image 3D.
 */
export function holdIntro(promise: Promise<unknown>, maxMs = 2600) {
  holds.push(Promise.race([promise.catch(() => undefined), wait(maxMs)]));
}
/** Tous les scripts de page ont été évalués une fois le DOM prêt. */
const domReady = () =>
  document.readyState === 'loading' || document.readyState === 'interactive'
    ? Promise.race([
        new Promise<void>((resolve) =>
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }),
        ),
        wait(400),
      ])
    : Promise.resolve();
const pageReady = () =>
  Promise.all([fontsReady(), domReady()]).then(() => Promise.all(holds));
const fontsReady = () =>
  Promise.race([(document.fonts?.ready ?? Promise.resolve()).then(() => undefined), wait(1800)]);

function initVeil() {
  const count = document.querySelector<HTMLElement>('.veil__count');
  const firstVisit = !root.classList.contains('is-return');
  try {
    sessionStorage.setItem('elyra:seen', '1');
  } catch {
    /* stockage indisponible : sans conséquence */
  }

  const finish = () => {
    root.classList.remove('is-leaving');
    root.classList.add('is-ready');
    window.setTimeout(runIntro, reduced ? 0 : 360);
  };

  if (!firstVisit || reduced || !count) {
    pageReady().then(finish);
    return;
  }

  const state = { v: 0 };
  const counted = new Promise<void>((resolve) => {
    gsap.to(state, {
      v: 100,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        count.textContent = String(Math.round(state.v)).padStart(3, '0');
      },
      onComplete: resolve,
    });
  });
  Promise.all([pageReady(), counted]).then(finish);
}

/* ------------------------------------------------------------------ Défilement */

function initScroll() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.11, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToTarget(target: string | HTMLElement, offset = -110) {
  const el =
    typeof target === 'string' ? document.getElementById(target.replace(/^#/, '')) : target;
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset, duration: 1.3 });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
}

/* ------------------------------------------------------------------ Navigation */

let closeMenu = () => {};

function initNav() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  const progress = document.querySelector<HTMLElement>('.progress');
  let last = window.scrollY;

  const onScroll = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 24);
    if (Math.abs(y - last) > 6) {
      const hide = y > last && y > 460 && !root.classList.contains('menu-open');
      header?.classList.toggle('is-hidden', hide);
      last = y;
    }
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!toggle || !menu) return;
  menu.inert = true;

  const setMenu = (open: boolean) => {
    root.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', String(!open));
    menu.inert = !open;
    if (open) {
      lenis?.stop();
      header?.classList.remove('is-hidden');
    } else {
      lenis?.start();
    }
  };
  closeMenu = () => setMenu(false);

  toggle.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1020px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });
}

/* ------------------------------------------------------------------ Transitions de page */

function initLinks() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    const a = target?.closest?.('a');
    if (!a || e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePage) {
      if (url.hash) {
        e.preventDefault();
        closeMenu();
        history.pushState(null, '', url.hash);
        scrollToTarget(decodeURIComponent(url.hash));
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } else {
        // Lien vers la page courante : on remonte simplement en haut.
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(0, { duration: 1.2 });
        else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }
      return;
    }

    e.preventDefault();
    closeMenu();
    root.classList.remove('is-ready');
    root.classList.add('is-leaving');
    window.setTimeout(
      () => {
        window.location.href = url.href;
      },
      reduced ? 0 : 640,
    );
  });

  // Retour arrière via le cache du navigateur : on relève le voile.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      root.classList.remove('is-leaving');
      root.classList.add('is-ready');
    }
  });
}

/* ------------------------------------------------------------------ Apparitions */

function initReveals() {
  document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
    const step = Number(group.dataset.stagger) || 90;
    group.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', String(i * step));
    });
  });

  const items = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        el.classList.add('is-in');
        // Une fois l'animation jouée, l'élément retrouve ses propres transitions.
        const delay = Number(el.style.getPropertyValue('--d')) || 0;
        window.setTimeout(() => {
          el.removeAttribute('data-reveal');
          el.classList.remove('is-in');
          el.style.removeProperty('--d');
        }, delay + 1400);
      }
    },
    { rootMargin: '0px 0px -7% 0px', threshold: 0.05 },
  );
  items.forEach((el) => io.observe(el));
}

function initSplits() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-split]');
  if (reduced) {
    nodes.forEach((el) => el.classList.add('is-split'));
    return;
  }
  nodes.forEach((el) => {
    const immediate = el.dataset.split === 'now';
    let played = false;
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) => {
        el.classList.add('is-split');
        if (played) return;
        return gsap.from(self.lines, {
          yPercent: 112,
          duration: 1.25,
          ease: 'expo.out',
          stagger: 0.085,
          delay: Number(el.dataset.delay ?? 0) / 1000,
          onComplete: () => {
            played = true;
          },
          scrollTrigger: immediate ? undefined : { trigger: el, start: 'top 90%', once: true },
        });
      },
    });
  });
}

function initCounters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const pad = Number(el.dataset.pad) || 0;
    const fmt = (v: number) => String(Math.round(v)).padStart(pad, '0');
    if (reduced) {
      el.textContent = fmt(end);
      return;
    }
    const state = { v: 0 };
    el.textContent = fmt(0);
    gsap.to(state, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = fmt(state.v);
      },
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
    });
  });
}

function initParallax() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = Number(el.dataset.parallax) || 0.15;
    const axis = el.dataset.parallaxAxis === 'x' ? 'xPercent' : 'yPercent';
    gsap.fromTo(
      el,
      { [axis]: -amount * 100 },
      {
        [axis]: amount * 100,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      },
    );
  });
}

function initScramble() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    const text = el.textContent ?? '';
    const play = () =>
      gsap.to(el, {
        duration: 1.1,
        scrambleText: { text, chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/·', speed: 0.5 },
        overwrite: true,
      });
    ScrollTrigger.create({ trigger: el, start: 'top 94%', once: true, onEnter: play });
    if (el.dataset.scramble === 'hover') {
      el.closest('a, button, [data-spot]')?.addEventListener('pointerenter', play);
    }
  });
}

/* ------------------------------------------------------------------ Pointeur */

function initCursor() {
  const cursor = document.querySelector<HTMLElement>('.cursor');
  const glow = document.querySelector<HTMLElement>('.cursor-glow');
  if (!cursor || !glow || !finePointer || reduced) return;
  const label = cursor.querySelector('span');

  const cx = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3' });
  const gx = gsap.quickTo(glow, 'x', { duration: 1.4, ease: 'power3' });
  const gy = gsap.quickTo(glow, 'y', { duration: 1.4, ease: 'power3' });
  let shown = false;

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set([cursor, glow], { x: e.clientX, y: e.clientY });
        cursor.classList.add('is-visible');
        glow.classList.add('is-visible');
      }
      cx(e.clientX);
      cy(e.clientY);
      gx(e.clientX);
      gy(e.clientY);
    },
    { passive: true },
  );

  document.addEventListener('pointerover', (e) => {
    const t = e.target as Element | null;
    const labelled = t?.closest?.<HTMLElement>('[data-cursor]');
    const text = labelled?.dataset.cursor;
    const interactive = t?.closest?.('a, button, summary, input, select, textarea, label, [role="button"]');
    cursor.classList.toggle('is-label', !!text);
    cursor.classList.toggle('is-link', !text && !!interactive);
    if (text && label) label.textContent = text;
  });
  document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
  root.addEventListener('pointerleave', () => {
    shown = false;
    cursor.classList.remove('is-visible');
    glow.classList.remove('is-visible');
  });
}

function initSpot() {
  if (!finePointer) return;
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>('[data-spot]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}

function initTilt() {
  if (!finePointer || reduced) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const max = Number(el.dataset.tilt) || 9;
    const zone = el.parentElement?.classList.contains('tilt-scene') ? el.parentElement : el;
    zone.addEventListener('pointermove', (e) => {
      const r = zone.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.classList.add('is-tilting');
      el.style.setProperty('--ry', `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    });
    zone.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilting');
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = Number(el.dataset.magnetic) || 0.3;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - (r.left + r.width / 2)) * strength,
        y: (e.clientY - (r.top + r.height / 2)) * strength,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: true,
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.38)', overwrite: true });
    });
  });
}

function initFooterWord() {
  const word = document.querySelector<HTMLElement>('[data-footer-word]');
  const span = word?.querySelector<HTMLElement>('span');
  if (!word || !span || !finePointer) return;
  word.addEventListener(
    'pointermove',
    (e) => {
      const r = span.getBoundingClientRect();
      span.style.setProperty('--wx', `${e.clientX - r.left}px`);
      span.style.setProperty('--wy', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}

/* ------------------------------------------------------------------ Divers */

let toastTimer = 0;
export function toast(message: string) {
  const el = document.querySelector<HTMLElement>('.toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('is-on'), 2200);
}

/** Compteur de joueurs en direct, actif si `cfxCode` est renseigné dans la config. */
async function initServerStatus() {
  const code = document.body.dataset.cfx;
  if (!code) return;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${encodeURIComponent(code)}`,
      { signal: ctrl.signal, headers: { accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json())?.Data ?? {};
    const players = Number(data.clients ?? 0);
    const max = Number(data.sv_maxclients ?? data.svMaxclients ?? 0);
    const text = max ? `${players} / ${max} en ville` : `${players} en ville`;
    document.querySelectorAll<HTMLElement>('[data-server-status]').forEach((el) => {
      el.hidden = false;
      el.dataset.online = 'true';
    });
    document.querySelectorAll<HTMLElement>('[data-server-count]').forEach((el) => {
      el.textContent = text;
    });
  } catch {
    /* API injoignable : on garde l'affichage par défaut */
  } finally {
    window.clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ Démarrage */

initScroll();
initNav();
initLinks();
initCursor();
initSpot();
initTilt();
initMagnetic();
initFooterWord();
onIntro(() => {
  initReveals();
  initSplits();
  initCounters();
  initParallax();
  initScramble();
  ScrollTrigger.refresh();
});
initVeil();
initServerStatus();
