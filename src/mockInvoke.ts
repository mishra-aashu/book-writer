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

export const compressBase64Image = (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/') || base64Str.length < 50000) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      if (img.width === 0 || img.height === 0) {
        resolve(base64Str);
        return;
      }
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

const shrinkExistingMockData = async () => {
  console.log("[Mock Invoke] Shrinking existing mock data to free space...");
  
  // 1. Shrink project assets
  try {
    const assetsVal = localStorage.getItem('mock_project_assets');
    if (assetsVal) {
      const assets = JSON.parse(assetsVal);
      if (Array.isArray(assets)) {
        let changed = false;
        for (const asset of assets) {
          if (asset.dataBase64 && asset.dataBase64.startsWith('data:image/') && asset.dataBase64.length > 100000) {
            console.log(`[Mock Invoke] Shrinking existing asset: ${asset.name}`);
            const prevLen = asset.dataBase64.length;
            asset.dataBase64 = await compressBase64Image(asset.dataBase64);
            console.log(`[Mock Invoke] Shrunk from ${prevLen} to ${asset.dataBase64.length}`);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem('mock_project_assets', JSON.stringify(assets));
        }
      }
    }
  } catch (err) {
    console.error("[Mock Invoke] Failed to shrink assets:", err);
  }

  // 2. Shrink page contents
  try {
    const contentsVal = localStorage.getItem('mock_page_contents');
    if (contentsVal) {
      const contents = JSON.parse(contentsVal);
      let changed = false;
      for (const pageId of Object.keys(contents)) {
        const pageRegions = contents[pageId];
        if (pageRegions && typeof pageRegions === 'object') {
          for (const regionKey of Object.keys(pageRegions)) {
            let html = pageRegions[regionKey];
            if (typeof html === 'string' && html.includes('data:image/')) {
              const temp = document.createElement('div');
              temp.innerHTML = html;
              const imgs = temp.querySelectorAll('img');
              let pageImgChanged = false;
              for (let i = 0; i < imgs.length; i++) {
                const src = imgs[i].getAttribute('src') || '';
                if (src.startsWith('data:image/') && src.length > 100000) {
                  console.log(`[Mock Invoke] Shrinking image in page content: ${pageId}`);
                  const shrunk = await compressBase64Image(src);
                  imgs[i].setAttribute('src', shrunk);
                  pageImgChanged = true;
                }
              }
              if (pageImgChanged) {
                pageRegions[regionKey] = temp.innerHTML;
                changed = true;
              }
            }
          }
        }
      }
      if (changed) {
        localStorage.setItem('mock_page_contents', JSON.stringify(contents));
      }
    }
  } catch (err) {
    console.error("[Mock Invoke] Failed to shrink page contents:", err);
  }
};

// Start background shrink on load
shrinkExistingMockData();

const mockInvoke = async (cmd: string, args?: any): Promise<any> => {
  console.log(`[Mock Invoke] ${cmd}`, args);

  const getStorage = (key: string, def: any) => {
    const val = localStorage.getItem(`mock_${key}`);
    return val ? JSON.parse(val) : def;
  };
  const setStorage = (key: string, val: any) => {
    try {
      localStorage.setItem(`mock_${key}`, JSON.stringify(val));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota') || e.code === 22) {
        console.warn(`[Mock Invoke] Quota exceeded for mock_${key}. Attempting to free space...`);
        try {
          // Clear history/versions to recover space
          localStorage.removeItem('mock_page_versions');
          localStorage.removeItem('mock_editorial_notes');
          // Also look for AI chats and clean them up
          for (let i = 0; i < localStorage.length; i++) {
            const lsKey = localStorage.key(i);
            if (lsKey && lsKey.startsWith('mock_ai_chats_')) {
              localStorage.removeItem(lsKey);
            }
          }
          // Try setting again
          localStorage.setItem(`mock_${key}`, JSON.stringify(val));
          console.log(`[Mock Invoke] Successfully recovered from QuotaExceededError for mock_${key}`);
          return;
        } catch (retryErr) {
          console.error('[Mock Invoke] Failed to recover from QuotaExceededError:', retryErr);
        }
      }
      console.error(`[Mock Invoke] Error writing to localStorage for key mock_${key}:`, e);
    }
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
        id: args.id || Math.random().toString(36).substring(2, 11),
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
      
      // Limit to last 20 overall versions to save storage space
      if (versions.length > 20) {
        versions.splice(0, versions.length - 20);
      }
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
        if (args.chapterId !== undefined) p.chapter_id = args.chapterId;
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
    case 'select_save_path': {
      const val = prompt("Select simulated export path:", args.defaultPath || "");
      return val || null;
    }
    case 'export_book_to_epub': {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    }
    case 'export_book_to_docx': {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    }
    case 'export_book_to_pdf': {
      return new Promise((resolve) => setTimeout(resolve, 1500));
    }
    case 'get_book_word_count': {
      return 4500;
    }
    case 'get_book_storyboard': {
      const chapters = getStorage('chapters', []).filter((ch: any) => ch.book_id === args.bookId);
      const chapterIds = chapters.map((ch: any) => ch.id);
      const pages = getStorage('pages', []).filter((p: any) => chapterIds.includes(p.chapter_id));
      let cards = getStorage('storyboard_cards', []);

      let updated = false;
      pages.forEach((pg: any) => {
        let card = cards.find((c: any) => c.pageId === pg.id || c.id === pg.id);
        if (!card) {
          card = {
            id: pg.id,
            pageId: pg.id,
            chapterId: pg.chapter_id,
            title: pg.page_type === 'standard_prose' ? 'Prose Page' : (pg.page_type || 'Scene Card'),
            outline: '',
            color: null,
            sortOrder: pg.sort_order
          };
          cards.push(card);
          updated = true;
        } else {
          // Keep chapterId and sortOrder in sync with the page in case they got out of sync
          if (card.chapterId !== pg.chapter_id || card.sortOrder !== pg.sort_order) {
            card.chapterId = pg.chapter_id;
            card.sortOrder = pg.sort_order;
            updated = true;
          }
        }
      });

      if (updated) {
        setStorage('storyboard_cards', cards);
      }

      return cards.filter((c: any) => chapters.some((ch: any) => ch.id === c.chapterId))
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    }
    case 'create_storyboard_card': {
      const cards = getStorage('storyboard_cards', []);
      const pages = getStorage('pages', []);
      const chapterPages = pages.filter((p: any) => p.chapter_id === args.chapterId);
      
      const pageId = Math.random().toString(36).substring(2, 11);
      const newPg = {
        id: pageId,
        chapter_id: args.chapterId,
        template_id: 'standard_prose',
        sort_order: chapterPages.length,
        category: 'body',
        page_type: 'standard_prose'
      };
      pages.push(newPg);
      setStorage('pages', pages);

      const newCard = {
        id: pageId,
        pageId: pageId,
        chapterId: args.chapterId,
        title: args.title || 'New Scene Card',
        outline: null,
        color: null,
        sortOrder: chapterPages.length
      };
      cards.push(newCard);
      setStorage('storyboard_cards', cards);
      return newCard;
    }
    case 'delete_storyboard_card': {
      let cards = getStorage('storyboard_cards', []);
      const card = cards.find((c: any) => c.id === args.id);
      if (card) {
        let pages = getStorage('pages', []);
        pages = pages.filter((p: any) => p.id !== card.pageId && p.id !== card.id);
        setStorage('pages', pages);
      }
      cards = cards.filter((c: any) => c.id !== args.id);
      setStorage('storyboard_cards', cards);
      return null;
    }
    case 'update_storyboard_card': {
      const cards = getStorage('storyboard_cards', []);
      const card = cards.find((c: any) => c.id === args.id);
      if (card) {
        if (args.title !== undefined) card.title = args.title;
        if (args.outline !== undefined) card.outline = args.outline;
        if (args.color !== undefined) card.color = args.color;
      }
      setStorage('storyboard_cards', cards);
      return null;
    }
    case 'reorder_storyboard_cards': {
      const cards = getStorage('storyboard_cards', []);
      const pages = getStorage('pages', []);

      args.cardIds.forEach((id: string, idx: number) => {
        const card = cards.find((c: any) => c.id === id);
        if (card) {
          card.sortOrder = idx;
          const pg = pages.find((p: any) => p.id === card.pageId || p.id === card.id);
          if (pg) pg.sort_order = idx;
        }
      });

      setStorage('storyboard_cards', cards);
      setStorage('pages', pages);
      return null;
    }
    case 'move_storyboard_card_to_chapter': {
      const cards = getStorage('storyboard_cards', []);
      const card = cards.find((c: any) => c.id === args.id);
      if (card) {
        card.chapterId = args.chapterId;
        card.sortOrder = args.sortOrder;

        const pages = getStorage('pages', []);
        const pg = pages.find((p: any) => p.id === card.pageId || p.id === card.id);
        if (pg) {
          pg.chapter_id = args.chapterId;
          pg.sort_order = args.sortOrder;
          setStorage('pages', pages);
        }
      }
      setStorage('storyboard_cards', cards);
      return null;
    }
    case 'run_full_index_scan': {
      const bookId = args.bookId;
      const chapters = getStorage('chapters', []).filter((ch: any) => ch.book_id === bookId);
      const chapterIds = chapters.map((ch: any) => ch.id);
      const pages = getStorage('pages', []).filter((p: any) => chapterIds.includes(p.chapter_id));
      const characters = getStorage('characters', []).filter((c: any) => c.book_id === bookId);
      const contents = getStorage('page_contents', {});
      const mentions = getStorage('character_mentions', {});

      characters.forEach((char: any) => {
        mentions[char.id] = [];
      });

      pages.forEach((pg: any) => {
        const pageRegions = contents[pg.id] || {};
        const fullPageText = Object.values(pageRegions).join(' ').toLowerCase();

        characters.forEach((char: any) => {
          const keywords = char.keywords
            ? char.keywords.split(',').map((k: string) => k.trim().toLowerCase())
            : [char.name.toLowerCase()];
          const matches = keywords.some((kw: string) => fullPageText.includes(kw));

          if (matches) {
            if (!mentions[char.id].includes(pg.id)) {
              mentions[char.id].push(pg.id);
            }
          }
        });
      });

      setStorage('character_mentions', mentions);
      return { success: true, count: pages.length };
    }
    case 'get_editorial_notes': {
      const notes = getStorage('editorial_notes', []);
      return notes.filter((n: any) => n.book_id === args.bookId);
    }
    case 'create_editorial_note': {
      const notes = getStorage('editorial_notes', []);
      const newNote = {
        id: Math.random().toString(36).substring(2, 9),
        book_id: args.bookId,
        page_id: args.pageId,
        region_key: args.regionKey,
        text_offset: args.textOffset,
        text_length: args.textLength,
        selected_text: args.selectedText,
        comment_text: args.commentText,
        author: args.author,
        created_at: Math.floor(Date.now() / 1000),
        resolved: 0
      };
      notes.push(newNote);
      setStorage('editorial_notes', notes);
      return newNote;
    }
    case 'toggle_resolve_note': {
      const notes = getStorage('editorial_notes', []);
      const note = notes.find((n: any) => n.id === args.id);
      if (note) {
        note.resolved = args.resolved;
      }
      setStorage('editorial_notes', notes);
      return null;
    }
    case 'delete_editorial_note': {
      let notes = getStorage('editorial_notes', []);
      notes = notes.filter((n: any) => n.id !== args.id);
      setStorage('editorial_notes', notes);
      return null;
    }
    case 'get_book_settings': {
      const settingsMap = getStorage('book_settings', {});
      const settings = settingsMap[args.bookId] || {
        bookId: args.bookId,
        bodyFont: 'garamond',
        headerFont: 'playfair',
        fontSize: 18,
        lineHeight: 1.65,
        letterSpacing: 0.0,
        paragraphSpacing: 0.5,
        editorWidth: 'medium',
        pageHeight: 1122.0,
        pagePadding: 60.0,
        lightTheme: false,
        focusMode: false,
        limitEnabled: true,
        limitType: 'chars',
        limitValue: 2000,
        smartCap: true,
        smartI: true,
        smartSpace: true,
      };
      return settings;
    }
    case 'save_book_settings': {
      const settingsMap = getStorage('book_settings', {});
      settingsMap[args.settings.bookId] = args.settings;
      setStorage('book_settings', settingsMap);
      return null;
    }
    case 'get_chat_history': {
      const key = args.sessionId ? `ai_chats_${args.bookId}_${args.sessionId}` : `ai_chats_${args.bookId}`;
      return getStorage(key, []);
    }
    case 'add_chat_message': {
      const key = args.sessionId ? `ai_chats_${args.bookId}_${args.sessionId}` : `ai_chats_${args.bookId}`;
      const history = getStorage(key, []);
      const newMsg = {
        id: Math.random().toString(36).substring(2, 11),
        bookId: args.bookId,
        sender: args.sender,
        text: args.text,
        displayPrompt: args.displayPrompt,
        createdAt: Date.now(),
      };
      history.push(newMsg);
      setStorage(key, history);
      return newMsg;
    }
    case 'clear_chat_history': {
      const key = args.sessionId ? `ai_chats_${args.bookId}_${args.sessionId}` : `ai_chats_${args.bookId}`;
      setStorage(key, []);
      return null;
    }
    case 'get_chat_sessions': {
      let sessions = getStorage(`ai_sessions_${args.bookId}`, []);
      if (sessions.length === 0) {
        const legacyHistory = getStorage(`ai_chats_${args.bookId}`, []);
        if (legacyHistory.length > 0) {
          const defaultSession = {
            id: 'default',
            title: 'First Chat Session',
            createdAt: Date.now()
          };
          sessions = [defaultSession];
          setStorage(`ai_sessions_${args.bookId}`, sessions);
          setStorage(`ai_chats_${args.bookId}_default`, legacyHistory);
          setStorage(`ai_chats_${args.bookId}`, []);
        }
      }
      return sessions;
    }
    case 'save_chat_sessions': {
      setStorage(`ai_sessions_${args.bookId}`, args.sessions);
      return null;
    }
    case 'delete_chat_message': {
      if (typeof window !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mock_ai_chats_')) {
            const val = localStorage.getItem(key);
            if (val) {
              let history = JSON.parse(val);
              if (history.some((m: any) => m.id === args.id)) {
                history = history.filter((m: any) => m.id !== args.id);
                localStorage.setItem(key, JSON.stringify(history));
                break;
              }
            }
          }
        }
      }
      return null;
    }
    case 'get_project_assets': {
      const assets = getStorage('project_assets', []);
      const targetBookId = args.book_id || args.bookId;
      return assets.filter((a: any) => a.bookId === targetBookId || a.book_id === targetBookId)
        .map((a: any) => ({
          id: a.id,
          bookId: a.bookId || a.book_id,
          name: a.name,
          mimeType: a.mimeType || a.mime_type,
          dataBase64: a.dataBase64 || a.data_base_64 || a.data_base64,
          createdAt: a.createdAt || a.created_at
        }));
    }
    case 'upload_project_asset': {
      const assets = getStorage('project_assets', []);
      let dataBase64 = args.data_base_64 || args.dataBase64;
      if (dataBase64 && dataBase64.startsWith('data:image/')) {
        dataBase64 = await compressBase64Image(dataBase64);
      }
      const newAsset = {
        id: Math.random().toString(36).substring(2, 11),
        bookId: args.book_id || args.bookId,
        name: args.name,
        mimeType: args.mime_type || args.mimeType,
        dataBase64,
        createdAt: Date.now(),
      };
      assets.push(newAsset);
      setStorage('project_assets', assets);
      return newAsset;
    }
    case 'delete_project_asset': {
      let assets = getStorage('project_assets', []);
      assets = assets.filter((a: any) => a.id !== args.id);
      setStorage('project_assets', assets);
      return null;
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
