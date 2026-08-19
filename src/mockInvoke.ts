import { invoke as tauriInvoke } from '@tauri-apps/api/core';

// Check if running under Tauri desktop vs web browser preview
export const isTauri =
  typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

// Seed browser localStorage mock templates
export const seedDefaultTemplates = () => {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem('mock_templates');
  if (!existing || !existing.includes('screenplay_standard')) {
    localStorage.setItem(
      'mock_templates',
      JSON.stringify([
        {
          id: 'standard',
          name: 'Standard Layout',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"header" "main" "footer"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '40px 1fr 40px',
            gap: '15px',
          }),
        },
        {
          id: 'chapter_start',
          name: 'Chapter Start',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"number" "title" "main"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '50px 60px 1fr',
            gap: '20px',
          }),
        },
        {
          id: 'corner_notes',
          name: 'Corner Notes',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"header header" "main sidebar" "footer footer"',
            gridTemplateColumns: '1fr 200px',
            gridTemplateRows: '40px 1fr 40px',
            gap: '20px',
          }),
        },
        {
          id: 'title_page',
          name: 'Title Page',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"title" "subtitle" "author"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 100px 100px',
            gap: '20px',
          }),
        },
        {
          id: 'screenplay_title',
          name: 'Screenplay Title Page',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"title" "details" "contact"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr 150px 100px',
            gap: '20px',
          }),
        },
        {
          id: 'screenplay_standard',
          name: 'Standard Script Page',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"main"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
            gap: '0px',
          }),
        },
        {
          id: 'screenplay_cast',
          name: 'Cast List Page',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"header" "main"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '60px 1fr',
            gap: '20px',
          }),
        },
        {
          id: 'screenplay_act_break',
          name: 'Act Break Page',
          layout_json: JSON.stringify({
            display: 'grid',
            gridTemplateAreas: '"main"',
            gridTemplateColumns: '1fr',
            gridTemplateRows: '1fr',
            gap: '0px',
          }),
        }
      ])
    );
  }
};

seedDefaultTemplates();

const mockInvoke = async (cmd: string, args?: any): Promise<any> => {
  console.log(`[Mock Invoke] ${cmd}`, args);

  const getStorage = (key: string, def: any) => {
    const val = localStorage.getItem(`mock_${key}`);
    return val ? JSON.parse(val) : def;
  };
  const setStorage = (key: string, val: any) => {
    localStorage.setItem(`mock_${key}`, JSON.stringify(val));
  };

  switch (cmd) {
    case 'get_books': {
      return getStorage('books', []);
    }
    case 'get_templates': {
      return getStorage('templates', []);
    }
    case 'create_book': {
      const books = getStorage('books', []);
      const newBook = {
        id: Math.random().toString(36).substring(2, 11),
        title: args.title,
        author: args.author,
        genre: args.genre,
        description: args.description,
        project_type: args.projectType || 'novel',
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
      };
      books.push(newBook);
      setStorage('books', books);
      return newBook;
    }
    case 'delete_book': {
      let books = getStorage('books', []);
      books = books.filter((b: any) => b.id !== args.id);
      setStorage('books', books);
      return null;
    }
    case 'get_book_details': {
      const books = getStorage('books', []);
      const book = books.find((b: any) => b.id === args.bookId);
      const chapters = getStorage('chapters', [])
        .filter((c: any) => c.book_id === args.bookId)
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      const pages = getStorage('pages', [])
        .filter((p: any) => {
          // Keep pages that are virtual (like front/back matter or screenplay page) OR have valid chapter
          if (p.category === 'front_matter' || p.category === 'back_matter' || p.category === 'screenplay') {
            // Find if it belongs to the active book (stored in chapter_id as book_id)
            return p.chapter_id === args.bookId;
          }
          const ch = chapters.find((c: any) => c.id === p.chapter_id);
          return !!ch;
        })
        .sort((a: any, b: any) => a.sort_order - b.sort_order);
      const characters = getStorage('characters', []).filter(
        (c: any) => c.book_id === args.bookId
      );
      return { book, chapters, pages, characters };
    }
    case 'create_chapter': {
      const chapters = getStorage('chapters', []);
      const newCh = {
        id: Math.random().toString(36).substring(2, 11),
        book_id: args.bookId,
        title: args.title,
        sort_order: chapters.length,
      };
      chapters.push(newCh);
      setStorage('chapters', chapters);

      // Create a default first page for this chapter
      const pages = getStorage('pages', []);
      const newPg = {
        id: Math.random().toString(36).substring(2, 11),
        chapter_id: newCh.id,
        template_id: 'standard',
        sort_order: 0,
        category: 'body',
        page_type: 'standard_prose',
      };
      pages.push(newPg);
      setStorage('pages', pages);

      return newCh;
    }
    case 'delete_chapter': {
      let chapters = getStorage('chapters', []);
      chapters = chapters.filter((c: any) => c.id !== args.id);
      setStorage('chapters', chapters);
      return null;
    }
    case 'update_chapter_title': {
      const chapters = getStorage('chapters', []);
      const ch = chapters.find((c: any) => c.id === args.id);
      if (ch) ch.title = args.title;
      setStorage('chapters', chapters);
      return null;
    }
    case 'create_page': {
      const pages = getStorage('pages', []);
      const chapterPages = pages.filter((p: any) => p.chapter_id === args.chapterId);
      const newPg = {
        id: Math.random().toString(36).substring(2, 11),
        chapter_id: args.chapterId,
        template_id: args.templateId,
        sort_order: chapterPages.length,
        category: args.category || 'body',
        page_type: args.pageType || 'standard_prose',
      };
      pages.push(newPg);
      setStorage('pages', pages);
      return newPg;
    }
    case 'delete_page': {
      let pages = getStorage('pages', []);
      pages = pages.filter((p: any) => p.id !== args.id);
      setStorage('pages', pages);
      return null;
    }
    case 'get_page_content': {
      const contents = getStorage('page_contents', {});
      return contents[args.pageId] || {};
    }
    case 'save_page_content': {
      const contents = getStorage('page_contents', {});
      if (!contents[args.pageId]) contents[args.pageId] = {};
      contents[args.pageId][args.regionKey] = args.content;
      setStorage('page_contents', contents);

      // Save version snapshot
      const versions = getStorage('page_versions', []);
      const newVer = {
        id: Math.random().toString(36).substring(2, 11),
        page_id: args.pageId,
        region_key: args.regionKey,
        content: args.content,
        created_at: Math.floor(Date.now() / 1000),
      };
      versions.push(newVer);
      setStorage('page_versions', versions);

      // Scan character mentions
      const pages = getStorage('pages', []);
      const pg = pages.find((p: any) => p.id === args.pageId);
      if (pg) {
        const chapters = getStorage('chapters', []);
        const ch = chapters.find((c: any) => c.id === pg.chapter_id);
        if (ch) {
          const characters = getStorage('characters', []).filter(
            (c: any) => c.book_id === ch.book_id
          );
          const mentions = getStorage('character_mentions', {});

          for (const char of characters) {
            const keywords = char.keywords
              ? char.keywords.split(',').map((k: string) => k.trim().toLowerCase())
              : [char.name.toLowerCase()];
            const contentLower = args.content.toLowerCase();
            const matches = keywords.some((kw: string) => contentLower.includes(kw));

            if (!mentions[char.id]) mentions[char.id] = [];

            if (matches) {
              if (!mentions[char.id].includes(args.pageId)) {
                mentions[char.id].push(args.pageId);
              }
            } else {
              const otherRegions = Object.keys(contents[args.pageId] || {}).filter(
                (k) => k !== args.regionKey
              );
              const stillMatches = otherRegions.some((k) => {
                const rText = (contents[args.pageId][k] || '').toLowerCase();
                return keywords.some((kw: string) => rText.includes(kw));
              });
              if (!stillMatches) {
                mentions[char.id] = mentions[char.id].filter(
                  (pid: string) => pid !== args.pageId
                );
              }
            }
          }
          setStorage('character_mentions', mentions);
        }
      }
      return null;
    }
    case 'get_page_versions': {
      const versions = getStorage('page_versions', []);
      return versions
        .filter(
          (v: any) => v.page_id === args.pageId && v.region_key === args.regionKey
        )
        .reverse()
        .slice(0, 20);
    }
    case 'restore_page_version': {
      const versions = getStorage('page_versions', []);
      const ver = versions.find((v: any) => v.id === args.versionId);
      if (ver) {
        const contents = getStorage('page_contents', {});
        if (!contents[ver.page_id]) contents[ver.page_id] = {};
        contents[ver.page_id][ver.region_key] = ver.content;
        setStorage('page_contents', contents);
      }
      return null;
    }
    case 'create_character': {
      const characters = getStorage('characters', []);
      const newChar = {
        id: Math.random().toString(36).substring(2, 11),
        book_id: args.bookId,
        name: args.name,
        description: args.description,
        keywords: args.keywords,
      };
      characters.push(newChar);
      setStorage('characters', characters);
      return newChar;
    }
    case 'delete_character': {
      let characters = getStorage('characters', []);
      characters = characters.filter((c: any) => c.id !== args.id);
      setStorage('characters', characters);
      return null;
    }
    case 'get_character_mentions': {
      const mentions = getStorage('character_mentions', {});
      const pageIds = mentions[args.characterId] || [];
      const pages = getStorage('pages', []);
      return pages.filter((p: any) => pageIds.includes(p.id));
    }
    case 'search_book': {
      const pages = getStorage('pages', []);
      const chapters = getStorage('chapters', []);
      const contents = getStorage('page_contents', {});
      const query = args.query.toLowerCase();
      const results: any[] = [];

      const bookChapters = chapters.filter((c: any) => c.book_id === args.bookId);
      for (const ch of bookChapters) {
        const chPages = pages.filter((p: any) => p.chapter_id === ch.id);
        chPages.forEach((p: any, pIdx: number) => {
          const pContent = contents[p.id] || {};
          for (const regionKey of Object.keys(pContent)) {
            const text = pContent[regionKey] || '';
            if (text.toLowerCase().includes(query)) {
              const idx = text.toLowerCase().indexOf(query);
              const start = Math.max(0, idx - 40);
              const end = Math.min(text.length, idx + query.length + 40);
              const snippet =
                (start > 0 ? '...' : '') +
                text.substring(start, end) +
                (end < text.length ? '...' : '');

              results.push({
                page_id: p.id,
                chapter_id: ch.id,
                chapter_title: ch.title,
                page_number: pIdx + 1,
                region_key: regionKey,
                snippet,
              });
            }
          }
        });
      }
      return results;
    }
    case 'reorder_chapters': {
      const chapters = getStorage('chapters', []);
      args.chapterIds.forEach((id: string, idx: number) => {
        const ch = chapters.find((c: any) => c.id === id);
        if (ch) ch.sort_order = idx;
      });
      setStorage('chapters', chapters);
      return null;
    }
    case 'reorder_pages': {
      const pages = getStorage('pages', []);
      args.pageIds.forEach((id: string, idx: number) => {
        const p = pages.find((pg: any) => pg.id === id);
        if (p) p.sort_order = idx;
      });
      setStorage('pages', pages);
      return null;
    }
    case 'update_page_meta': {
      const pages = getStorage('pages', []);
      const p = pages.find((pg: any) => pg.id === args.pageId);
      if (p) {
        if (args.category) p.category = args.category;
        if (args.pageType) p.page_type = args.pageType;
        // Map pageType to template_id
        if (args.pageType === 'full_title' || args.pageType === 'divider') p.template_id = 'title_page';
        else if (args.pageType === 'chapter_start' || args.pageType === 'epilogue' || args.pageType === 'prologue') p.template_id = 'chapter_start';
        else if (args.pageType === 'about_author') p.template_id = 'corner_notes';
        else if (args.pageType === 'screenplay_title') p.template_id = 'screenplay_title';
        else if (args.pageType === 'screenplay_cast') p.template_id = 'screenplay_cast';
        else if (args.pageType === 'screenplay_act_break') p.template_id = 'screenplay_act_break';
        else if (args.pageType === 'screenplay_standard' || args.pageType === 'screenplay_fade_in' || args.pageType === 'screenplay_fade_out' || args.pageType === 'screenplay_revision' || args.pageType === 'screenplay_toc') p.template_id = 'screenplay_standard';
        else p.template_id = 'standard';
      }
      setStorage('pages', pages);
      return null;
    }
    case 'export_book_to_epub': {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    }
    default:
      throw new Error(`Unknown mock command ${cmd}`);
  }
};

export const invoke = async (cmd: string, args?: any): Promise<any> => {
  if (isTauri) {
    return tauriInvoke(cmd, args);
  } else {
    return mockInvoke(cmd, args);
  }
};
