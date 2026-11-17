/** Niveau d'une règle. Sans niveau, la règle est « standard ». */
export type Level = 'critique' | 'importante';

export interface Rule {
  /** Titre court (facultatif). */
  title?: string;
  /** Texte de la règle : une à trois phrases, sans balisage. */
  text: string;
  level?: Level;
  /** Liste à puces facultative affichée sous le texte. */
  points?: string[];
}

export interface Section {
  title: string;
  intro?: string;
  rules: Rule[];
}

export interface Chapter {
  title: string;
  intro?: string;
  sections: Section[];
}

export interface RuleBook {
  slug: 'global' | 'legal' | 'illegal';
  title: string;
  /** Une ou deux phrases de présentation. */
  lead: string;
  chapters: Chapter[];
}

export interface Term {
  term: string;
  /** Forme longue ou traduction, ex. « New Life Rule ». */
  full?: string;
  def: string;
  kind: 'obligatoire' | 'interdit' | 'notion';
}
