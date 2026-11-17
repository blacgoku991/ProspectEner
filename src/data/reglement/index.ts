import global, { lexique } from './global';
import illegal from './illegal';
import legal from './legal';
import type { RuleBook } from './types';

export const books = { global, legal, illegal } as const;
export type BookSlug = keyof typeof books;
export { lexique };

export function bookStats(book: RuleBook) {
  let rules = 0;
  let critiques = 0;
  let importantes = 0;
  for (const chapter of book.chapters) {
    for (const section of chapter.sections) {
      for (const rule of section.rules) {
        rules++;
        if (rule.level === 'critique') critiques++;
        if (rule.level === 'importante') importantes++;
      }
    }
  }
  return { chapters: book.chapters.length, rules, critiques, importantes };
}

export const totalRules = Object.values(books).reduce((n, b) => n + bookStats(b).rules, 0);

/** Présentation de chaque tome : couleur, icône, préfixe des numéros de règle. */
export const bookMeta: Record<
  BookSlug,
  { theme: 'default' | 'legal' | 'illegal'; prefix: string; icon: string; short: string; tome: string }
> = {
  global: { theme: 'default', prefix: 'G', icon: 'book-open', short: 'Global', tome: 'Tome I' },
  legal: { theme: 'legal', prefix: 'L', icon: 'scale', short: 'Légal', tome: 'Tome II' },
  illegal: { theme: 'illegal', prefix: 'I', icon: 'venetian-mask', short: 'Illégal', tome: 'Tome III' },
};
