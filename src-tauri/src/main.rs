// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod exporter;

use sqlx::{SqlitePool, Row};
use tauri::Manager;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::Utc;

// --- Data Structs ---

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub genre: Option<String>,
    pub description: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct Chapter {
    pub id: String,
    pub book_id: String,
    pub title: String,
    pub sort_order: i32,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct Page {
    pub id: String,
    pub chapter_id: String,
    pub template_id: String,
    pub sort_order: i32,
    pub category: Option<String>,
    pub page_type: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub layout_json: String,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct Character {
    pub id: String,
    pub book_id: String,
    pub name: String,
    pub description: Option<String>,
    pub keywords: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct PageVersion {
    pub id: String,
    pub page_id: String,
    pub region_key: String,
    pub content: String,
    pub created_at: i64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SearchResult {
    pub page_id: String,
    pub chapter_id: String,
    pub chapter_title: String,
    pub page_number: i32,
    pub region_key: String,
    pub snippet: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BookDetails {
    pub book: Book,
    pub chapters: Vec<Chapter>,
    pub pages: Vec<Page>,
    pub characters: Vec<Character>,
}

// --- Helper Functions ---

fn get_snippet(text: &str, query: &str) -> String {
    let lower_text = text.to_lowercase();
    let lower_query = query.to_lowercase();
    
    if let Some(pos) = lower_text.find(&lower_query) {
        let start = pos.saturating_sub(40);
        let end = std::cmp::min(text.len(), pos + query.len() + 40);
        
        let prefix = if start > 0 { "..." } else { "" };
        let suffix = if end < text.len() { "..." } else { "" };
        
        let sub = &text[start..end].replace('\n', " ");
        format!("{}{}{}", prefix, sub, suffix)
    } else {
        let end = std::cmp::min(text.len(), 80);
        format!("{}{}", &text[..end].replace('\n', " "), if text.len() > 80 { "..." } else { "" })
    }
}

// --- Commands ---

#[tauri::command]
async fn get_books(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<Book>, String> {
    let books = sqlx::query_as::<_, Book>(
        "SELECT id, title, author, genre, description, created_at, updated_at FROM books ORDER BY updated_at DESC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(books)
}

#[tauri::command]
async fn create_book(
    pool: tauri::State<'_, SqlitePool>,
    title: String,
    author: String,
    genre: Option<String>,
    description: Option<String>,
) -> Result<Book, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();

    sqlx::query(
        "INSERT INTO books (id, title, author, genre, description, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&title)
    .bind(&author)
    .bind(&genre)
    .bind(&description)
    .bind(now)
    .bind(now)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Create a default first chapter
    let chapter_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO chapters (id, book_id, title, sort_order) VALUES (?, ?, ?, 0)"
    )
    .bind(&chapter_id)
    .bind(&id)
    .bind("Chapter 1: Introduction")
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Create a default first page using the "chapter_start" layout
    let page_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO pages (id, chapter_id, template_id, sort_order) VALUES (?, ?, 'chapter_start', 0)"
    )
    .bind(&page_id)
    .bind(&chapter_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Insert placeholders for the chapter start template
    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'number', '01')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'title', 'The Beginning')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'main', '')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(Book {
        id,
        title,
        author,
        genre,
        description,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
async fn delete_book(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM books WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_book_details(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<BookDetails, String> {
    let book = sqlx::query_as::<_, Book>(
        "SELECT id, title, author, genre, description, created_at, updated_at FROM books WHERE id = ?"
    )
    .bind(&book_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let chapters = sqlx::query_as::<_, Chapter>(
        "SELECT id, book_id, title, sort_order FROM chapters WHERE book_id = ? ORDER BY sort_order ASC"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let pages = sqlx::query_as::<_, Page>(
        "SELECT p.id, p.chapter_id, p.template_id, p.sort_order, p.category, p.page_type FROM pages p 
         JOIN chapters c ON p.chapter_id = c.id 
         WHERE c.book_id = ? 
         ORDER BY c.sort_order ASC, p.sort_order ASC"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let characters = sqlx::query_as::<_, Character>(
        "SELECT id, book_id, name, description, keywords FROM characters WHERE book_id = ? ORDER BY name ASC"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(BookDetails {
        book,
        chapters,
        pages,
        characters,
    })
}

#[tauri::command]
async fn create_chapter(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    title: String,
) -> Result<Chapter, String> {
    let id = Uuid::new_v4().to_string();
    
    // Get max sort order
    let row = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) FROM chapters WHERE book_id = ?")
        .bind(&book_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    
    let max_order: i32 = row.get(0);
    let sort_order = max_order + 1;

    sqlx::query(
        "INSERT INTO chapters (id, book_id, title, sort_order) VALUES (?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&book_id)
    .bind(&title)
    .bind(sort_order)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Add a default starting page for this chapter
    let page_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO pages (id, chapter_id, template_id, sort_order) VALUES (?, ?, 'standard', 0)"
    )
    .bind(&page_id)
    .bind(&id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'header', ?)")
        .bind(&page_id)
        .bind(&title)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'main', '')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(Chapter {
        id,
        book_id,
        title,
        sort_order,
    })
}

#[tauri::command]
async fn delete_chapter(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM chapters WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_chapter_title(
    pool: tauri::State<'_, SqlitePool>,
    id: String,
    title: String,
) -> Result<(), String> {
    sqlx::query("UPDATE chapters SET title = ? WHERE id = ?")
        .bind(title)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn reorder_chapters(
    pool: tauri::State<'_, SqlitePool>,
    chapter_ids: Vec<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (idx, id) in chapter_ids.iter().enumerate() {
        sqlx::query("UPDATE chapters SET sort_order = ? WHERE id = ?")
            .bind(idx as i32)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn create_page(
    pool: tauri::State<'_, SqlitePool>,
    chapter_id: String,
    template_id: String,
    category: Option<String>,
    page_type: Option<String>,
) -> Result<Page, String> {
    let id = Uuid::new_v4().to_string();

    let row = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) FROM pages WHERE chapter_id = ?")
        .bind(&chapter_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    
    let max_order: i32 = row.get(0);
    let sort_order = max_order + 1;

    sqlx::query(
        "INSERT INTO pages (id, chapter_id, template_id, sort_order, category, page_type) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&chapter_id)
    .bind(&template_id)
    .bind(sort_order)
    .bind(&category)
    .bind(&page_type)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Insert dynamic region placeholders based on template
    let default_contents = match template_id.as_str() {
        "title_page" => vec![
            ("header", ""),
            ("title", "Book Title"),
            ("subtitle", "Subheading"),
            ("author", "Author Name"),
            ("footer", "Publisher details"),
        ],
        "chapter_start" => vec![
            ("number", "Chapter Num"),
            ("title", "Chapter Title"),
            ("main", "Start writing here..."),
        ],
        "corner_notes" => vec![
            ("header", "Running Head"),
            ("sidebar", "Marginal note content..."),
            ("main", "Start writing here..."),
            ("footer", ""),
        ],
        "screenplay_title" => vec![
            ("title", "SCREENPLAY TITLE"),
            ("details", "Written by\nAuthor Name"),
            ("contact", "Contact Info"),
        ],
        "screenplay_standard" => vec![
            ("main", "FADE IN:"),
        ],
        "screenplay_cast" => vec![
            ("header", "CAST OF CHARACTERS"),
            ("main", "Character names and details..."),
        ],
        "screenplay_act_break" => vec![
            ("main", "ACT ONE"),
        ],
        _ => vec![
            ("header", "Running Head"),
            ("main", "Start writing here..."),
            ("footer", ""),
        ],
    };

    for (key, content) in default_contents {
        sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, ?, ?);")
            .bind(&id)
            .bind(key)
            .bind(content)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(Page {
        id,
        chapter_id,
        template_id,
        sort_order,
        category,
        page_type,
    })
}

#[tauri::command]
async fn delete_page(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM pages WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn update_page_meta(
    pool: tauri::State<'_, SqlitePool>,
    page_id: String,
    category: String,
    page_type: String,
) -> Result<(), String> {
    sqlx::query("UPDATE pages SET category = ?, page_type = ? WHERE id = ?")
        .bind(category)
        .bind(page_type)
        .bind(page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn reorder_pages(
    pool: tauri::State<'_, SqlitePool>,
    page_ids: Vec<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (idx, id) in page_ids.iter().enumerate() {
        sqlx::query("UPDATE pages SET sort_order = ? WHERE id = ?")
            .bind(idx as i32)
            .bind(id)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_page_content(
    pool: tauri::State<'_, SqlitePool>,
    page_id: String,
    region_key: String,
    content: String,
) -> Result<(), String> {
    // 1. Save Content
    sqlx::query(
        "INSERT INTO page_contents (page_id, region_key, content)
         VALUES (?, ?, ?)
         ON CONFLICT(page_id, region_key) DO UPDATE SET content = excluded.content;"
    )
    .bind(&page_id)
    .bind(&region_key)
    .bind(&content)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Update the book's updated_at timestamp
    let book_row = sqlx::query(
        "SELECT c.book_id FROM chapters c 
         JOIN pages p ON p.chapter_id = c.id 
         WHERE p.id = ?"
    )
    .bind(&page_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let book_id: String = book_row.get("book_id");
    let now = Utc::now().timestamp();
    sqlx::query("UPDATE books SET updated_at = ? WHERE id = ?")
        .bind(now)
        .bind(&book_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    // 2. Character Linking Scan
    let char_rows = sqlx::query(
        "SELECT id, name, keywords FROM characters WHERE book_id = ?"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let content_rows = sqlx::query(
        "SELECT content FROM page_contents WHERE page_id = ?"
    )
    .bind(&page_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let full_text = content_rows
        .iter()
        .map(|r| r.get::<String, _>("content"))
        .collect::<Vec<String>>()
        .join(" ");
    let full_text_lower = full_text.to_lowercase();

    for r in char_rows {
        let char_id: String = r.get("id");
        let char_name: String = r.get("name");
        let char_keywords: Option<String> = r.get("keywords");

        let mut matched = false;
        if full_text_lower.contains(&char_name.to_lowercase()) {
            matched = true;
        } else if let Some(keywords_str) = char_keywords {
            for kw in keywords_str.split(',') {
                let kw_trimmed = kw.trim().to_lowercase();
                if !kw_trimmed.is_empty() && full_text_lower.contains(&kw_trimmed) {
                    matched = true;
                    break;
                }
            }
        }

        if matched {
            sqlx::query(
                "INSERT OR IGNORE INTO character_mentions (character_id, page_id) VALUES (?, ?)"
            )
            .bind(&char_id)
            .bind(&page_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        } else {
            sqlx::query(
                "DELETE FROM character_mentions WHERE character_id = ? AND page_id = ?"
            )
            .bind(&char_id)
            .bind(&page_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        }
    }

    // 3. Version History Snapshots (Debounce/Interval 3 minutes)
    let last_version = sqlx::query(
        "SELECT content, created_at FROM page_versions 
         WHERE page_id = ? AND region_key = ? 
         ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&page_id)
    .bind(&region_key)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let should_snapshot = match last_version {
        None => true,
        Some(v) => {
            let last_content: String = v.get("content");
            let last_created: i64 = v.get("created_at");
            last_content != content && (now - last_created) > 180
        }
    };

    if should_snapshot {
        let version_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO page_versions (id, page_id, region_key, content, created_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&version_id)
        .bind(&page_id)
        .bind(&region_key)
        .bind(&content)
        .bind(now)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

        // Pruning older snapshots, keep only 20
        sqlx::query(
            "DELETE FROM page_versions 
             WHERE page_id = ? AND region_key = ? 
             AND id NOT IN (
                 SELECT id FROM page_versions 
                 WHERE page_id = ? AND region_key = ? 
                 ORDER BY created_at DESC LIMIT 20
             )",
        )
        .bind(&page_id)
        .bind(&region_key)
        .bind(&page_id)
        .bind(&region_key)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn get_page_content(
    pool: tauri::State<'_, SqlitePool>,
    page_id: String,
) -> Result<HashMap<String, String>, String> {
    let rows = sqlx::query(
        "SELECT region_key, content FROM page_contents WHERE page_id = ?"
    )
    .bind(&page_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut map = HashMap::new();
    for r in rows {
        let key: String = r.get("region_key");
        let content: String = r.get("content");
        map.insert(key, content);
    }
    Ok(map)
}

#[tauri::command]
async fn get_page_versions(
    pool: tauri::State<'_, SqlitePool>,
    page_id: String,
    region_key: String,
) -> Result<Vec<PageVersion>, String> {
    let versions = sqlx::query_as::<_, PageVersion>(
        "SELECT id, page_id, region_key, content, created_at FROM page_versions 
         WHERE page_id = ? AND region_key = ? 
         ORDER BY created_at DESC"
    )
    .bind(&page_id)
    .bind(&region_key)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(versions)
}

#[tauri::command]
async fn restore_page_version(
    pool: tauri::State<'_, SqlitePool>,
    version_id: String,
) -> Result<(), String> {
    let version = sqlx::query(
        "SELECT page_id, region_key, content FROM page_versions WHERE id = ?"
    )
    .bind(version_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let page_id: String = version.get("page_id");
    let region_key: String = version.get("region_key");
    let content: String = version.get("content");

    sqlx::query(
        "UPDATE page_contents SET content = ? WHERE page_id = ? AND region_key = ?"
    )
    .bind(content)
    .bind(page_id)
    .bind(region_key)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_templates(pool: tauri::State<'_, SqlitePool>) -> Result<Vec<Template>, String> {
    let templates = sqlx::query_as::<_, Template>(
        "SELECT id, name, layout_json FROM templates ORDER BY name ASC"
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(templates)
}

#[tauri::command]
async fn get_characters(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<Vec<Character>, String> {
    let characters = sqlx::query_as::<_, Character>(
        "SELECT id, book_id, name, description, keywords FROM characters WHERE book_id = ? ORDER BY name ASC"
    )
    .bind(book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(characters)
}

#[tauri::command]
async fn create_character(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    name: String,
    description: Option<String>,
    keywords: Option<String>,
) -> Result<Character, String> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO characters (id, book_id, name, description, keywords) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&book_id)
    .bind(&name)
    .bind(&description)
    .bind(&keywords)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(Character {
        id,
        book_id,
        name,
        description,
        keywords,
    })
}

#[tauri::command]
async fn delete_character(pool: tauri::State<'_, SqlitePool>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM characters WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_character_mentions(
    pool: tauri::State<'_, SqlitePool>,
    character_id: String,
) -> Result<Vec<Page>, String> {
    let pages = sqlx::query_as::<_, Page>(
        "SELECT p.id, p.chapter_id, p.template_id, p.sort_order FROM pages p
         JOIN character_mentions cm ON cm.page_id = p.id
         JOIN chapters c ON p.chapter_id = c.id
         WHERE cm.character_id = ?
         ORDER BY c.sort_order ASC, p.sort_order ASC"
    )
    .bind(character_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(pages)
}

#[tauri::command]
async fn search_book(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let matches = sqlx::query(
        "SELECT 
            ps.page_id,
            ps.region_key,
            ps.content,
            p.chapter_id,
            c.title as chapter_title,
            p.sort_order as page_order
         FROM page_search ps
         JOIN pages p ON p.id = ps.page_id
         JOIN chapters c ON c.id = p.chapter_id
         WHERE c.book_id = ? AND ps.content MATCH ?
         ORDER BY c.sort_order ASC, p.sort_order ASC"
    )
    .bind(&book_id)
    .bind(format!("*{}*", query))
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for row in matches {
        let page_id: String = row.get("page_id");
        let chapter_id: String = row.get("chapter_id");
        let chapter_title: String = row.get("chapter_title");
        let page_order: i32 = row.get("page_order");
        let region_key: String = row.get("region_key");
        let content: String = row.get("content");
        
        let snippet = get_snippet(&content, &query);

        results.push(SearchResult {
            page_id,
            chapter_id,
            chapter_title,
            page_number: page_order + 1,
            region_key,
            snippet,
        });
    }

    Ok(results)
}

#[tauri::command]
async fn export_book_to_epub(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    save_path: String,
) -> Result<(), String> {
    exporter::compile_epub(pool.inner(), &book_id, &save_path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Main Runner ---

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle.path().app_local_data_dir().expect("Failed to get local data dir");
            let db_path = app_dir.join("book_writer.db");
            
            // Block thread on DB schema setup/migrations on app init
            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&db_path).await.expect("Failed to initialize database")
            });
            
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_books,
            create_book,
            delete_book,
            get_book_details,
            create_chapter,
            delete_chapter,
            update_chapter_title,
            reorder_chapters,
            create_page,
            delete_page,
            update_page_meta,
            reorder_pages,
            save_page_content,
            get_page_content,
            get_page_versions,
            restore_page_version,
            get_templates,
            get_characters,
            create_character,
            delete_character,
            get_character_mentions,
            search_book,
            export_book_to_epub
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
