// --- All shared data interfaces for Ligama Book Writer ---

export interface Book {
  id: string;
  title: string;
  author: string;
  genre?: string;
  description?: string;
  project_type?: 'novel' | 'screenplay';
  created_at: number;
  updated_at: number;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  sort_order: number;
}

export interface Page {
  id: string;
  chapter_id: string;
  template_id: string;
  sort_order: number;
  category?: 'front_matter' | 'body' | 'back_matter' | 'screenplay';
  page_type?: string;
}

export interface Template {
  id: string;
  name: string;
  layout_json: string;
}

export interface Character {
  id: string;
  book_id: string;
  name: string;
  description?: string;
  keywords?: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  region_key: string;
  content: string;
  created_at: number;
}

export interface SearchResult {
  page_id: string;
  chapter_id: string;
  chapter_title: string;
  page_number: number;
  region_key: string;
  snippet: string;
}

export interface BookDetails {
  book: Book;
  chapters: Chapter[];
  pages: Page[];
  characters: Character[];
}

// ── Font Type System ──

/** Fonts for main body/prose text in the editor canvas */
export type BodyFont =
  | 'garamond'          // EB Garamond — classic print-book
  | 'lora'              // Lora — modern warm serif
  | 'merriweather'      // Merriweather — screen-optimized
  | 'crimson-pro'       // Crimson Pro — academic/literary
  | 'bitter'            // Bitter — slab-serif, unique
  | 'noto-serif'        // Noto Serif Devanagari — Hindi body
  | 'tiro-devanagari'   // Tiro Devanagari Hindi — Hindi literary
  | 'courier'           // Courier Prime — screenplay/manuscript
  | 'caveat'            // Caveat — handwritten notes
  | 'kalam';            // Kalam — Hindi handwritten

/** Fonts for chapter headers and display regions */
export type HeaderFont =
  | 'playfair'          // Playfair Display — elegant, high-contrast
  | 'cormorant'         // Cormorant Garamond — thin, luxury
  | 'cinzel'            // Cinzel — fantasy/historical
  | 'garamond'          // EB Garamond — classic fallback
  | 'lora'              // Lora — warm header
  | 'rajdhani'          // Rajdhani — Sci-Fi / clean tech
  | 'caveat';           // Caveat — handwritten style headers

export const HEADER_FONT_FAMILIES: Record<HeaderFont, string> = {
  playfair: "'Playfair Display', serif",
  cormorant: "'Cormorant Garamond', serif",
  cinzel: "'Cinzel', serif",
  rajdhani: "'Rajdhani', sans-serif",
  garamond: "'EB Garamond', serif",
  lora: "'Lora', serif",
  caveat: "'Caveat', cursive",
};


/** Typography preset themes for one-click application */
export interface TypographyPreset {
  id: string;
  label: string;
  description: string;
  emoji: string;
  bodyFont: BodyFont;
  headerFont: HeaderFont;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
}

/** Per-book typography settings (saved in book_settings) */
export interface BookTypographySettings {
  bodyFont: BodyFont;
  headerFont: HeaderFont;
  fontSize: number;        // 12–26px
  lineHeight: number;      // 1.2–2.2
  letterSpacing: number;   // 0–0.15 (em units)
  paragraphSpacing: number; // 0–2 (em units)
}

// Legacy alias — keep backward compatibility
export type ActiveFont = BodyFont;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type ActiveTab = 'write' | 'characters' | 'versions' | 'search' | 'export' | 'comments' | 'ai';
export type EditorWidth = 'narrow' | 'medium' | 'wide';

export interface EditorialNote {
  id: string;
  book_id: string;
  page_id: string;
  region_key: string;
  text_offset: number;
  text_length: number;
  selected_text: string | null;
  comment_text: string;
  author: string;
  created_at: number;
  resolved: number;
}

export interface StoryboardCard {
  id: string;
  chapterId: string;
  title: string | null;
  outline: string | null;
  color: string | null;
  sortOrder: number;
}
