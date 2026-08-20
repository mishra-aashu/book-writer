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
    pub project_type: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BookSettings {
    pub book_id: String,
    pub body_font: String,
    pub header_font: String,
    pub font_size: i32,
    pub line_height: f64,
    pub letter_spacing: f64,
    pub paragraph_spacing: f64,
    pub editor_width: String,
    pub page_height: f64,
    pub page_padding: f64,
    pub light_theme: bool,
    pub focus_mode: bool,
    pub limit_enabled: bool,
    pub limit_type: String,
    pub limit_value: i32,
    pub smart_cap: bool,
    pub smart_i: bool,
    pub smart_space: bool,
    pub drafting_mode: bool,
    pub project_word_goal: i32,
    pub daily_word_goal: i32,
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

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct StoryboardCard {
    pub id: String,
    pub chapter_id: String,
    pub title: Option<String>,
    pub outline: Option<String>,
    pub color: Option<String>,
    pub sort_order: i32,
}

#[derive(serde::Serialize, serde::Deserialize, sqlx::FromRow, Clone)]
pub struct EditorialNote {
    pub id: String,
    pub book_id: String,
    pub page_id: String,
    pub region_key: String,
    pub text_offset: i32,
    pub text_length: i32,
    pub selected_text: Option<String>,
    pub comment_text: String,
    pub author: String,
    pub created_at: i64,
    pub resolved: i32,
}

// --- Helper Functions ---

fn strip_html(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;
    
    let mut chars = html.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '<' {
            in_tag = true;
            let mut tag_content = String::new();
            while let Some(&next_c) = chars.peek() {
                if next_c == '>' {
                    break;
                }
                tag_content.push(chars.next().unwrap());
            }
            let tag_lower = tag_content.to_lowercase();
            if tag_lower == "/p" || tag_lower == "/div" || tag_lower == "br" || tag_lower == "br/" || tag_lower == "p" || tag_lower == "div" {
                result.push(' ');
            }
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(c);
        }
    }
    
    result = result
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
        
    let mut clean_result = String::new();
    let mut last_was_space = false;
    for c in result.chars() {
        if c.is_whitespace() {
            if !last_was_space {
                clean_result.push(' ');
                last_was_space = true;
            }
        } else {
            clean_result.push(c);
            last_was_space = false;
        }
    }
    
    clean_result.trim().to_string()
}

async fn sync_page_search(
    pool: &SqlitePool,
    page_id: &str,
    region_key: &str,
    raw_content: &str,
) -> Result<(), String> {
    let plain_text = strip_html(raw_content);
    
    sqlx::query("DELETE FROM page_search WHERE page_id = ? AND region_key = ?")
        .bind(page_id)
        .bind(region_key)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("INSERT INTO page_search (page_id, region_key, content) VALUES (?, ?, ?)")
        .bind(page_id)
        .bind(region_key)
        .bind(&plain_text)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
        
    Ok(())
}

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
        "SELECT id, title, author, genre, description, project_type, created_at, updated_at FROM books ORDER BY updated_at DESC"
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
    project_type: Option<String>,
) -> Result<Book, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp();
    let proj_type = project_type.unwrap_or_else(|| "novel".to_string());

    sqlx::query(
        "INSERT INTO books (id, title, author, genre, description, project_type, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&title)
    .bind(&author)
    .bind(&genre)
    .bind(&description)
    .bind(&proj_type)
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
    let page_id = Uuid::new_v4().to_string();
    let (ch_id, temp_id, cat, pg_type) = if proj_type == "screenplay" {
        (id.clone(), "screenplay_standard".to_string(), "screenplay".to_string(), "screenplay_standard".to_string())
    } else {
        (chapter_id.clone(), "chapter_start".to_string(), "body".to_string(), "chapter_start".to_string())
    };

    sqlx::query(
        "INSERT INTO pages (id, chapter_id, template_id, sort_order, category, page_type) VALUES (?, ?, ?, 0, ?, ?)"
    )
    .bind(&page_id)
    .bind(&ch_id)
    .bind(&temp_id)
    .bind(&cat)
    .bind(&pg_type)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    if proj_type != "screenplay" {
        sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'number', '01')")
            .bind(&page_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        sync_page_search(pool.inner(), &page_id, "number", "01").await?;

        sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'title', 'The Beginning')")
            .bind(&page_id)
            .execute(pool.inner())
            .await
            .map_err(|e| e.to_string())?;
        sync_page_search(pool.inner(), &page_id, "title", "The Beginning").await?;
    }

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'main', '')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    sync_page_search(pool.inner(), &page_id, "main", "").await?;

    Ok(Book {
        id,
        title,
        author,
        genre,
        description,
        project_type: proj_type,
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
        "SELECT id, title, author, genre, description, project_type, created_at, updated_at FROM books WHERE id = ?"
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
         LEFT JOIN chapters c ON p.chapter_id = c.id 
         WHERE c.book_id = ? OR p.chapter_id = ? 
         ORDER BY c.sort_order ASC, p.sort_order ASC"
    )
    .bind(&book_id)
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
    sync_page_search(pool.inner(), &page_id, "header", &title).await?;

    sqlx::query("INSERT INTO page_contents (page_id, region_key, content) VALUES (?, 'main', '')")
        .bind(&page_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    sync_page_search(pool.inner(), &page_id, "main", "").await?;

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
        sync_page_search(pool.inner(), &id, key, content).await?;
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

    sync_page_search(pool.inner(), &page_id, &region_key, &content).await?;

    // Update the book's updated_at timestamp
    let book_row = sqlx::query(
        "SELECT 
            CASE 
                WHEN c.book_id IS NOT NULL THEN c.book_id
                ELSE p.chapter_id
            END as book_id
         FROM pages p
         LEFT JOIN chapters c ON p.chapter_id = c.id
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
        .map(|html| strip_html(&html))
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
    .bind(&content)
    .bind(&page_id)
    .bind(&region_key)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    sync_page_search(pool.inner(), &page_id, &region_key, &content).await?;

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
        "SELECT p.id, p.chapter_id, p.template_id, p.sort_order, p.category, p.page_type FROM pages p
         JOIN character_mentions cm ON cm.page_id = p.id
         LEFT JOIN chapters c ON p.chapter_id = c.id
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
            COALESCE(c.title, '') as chapter_title,
            p.sort_order as page_order
         FROM page_search ps
         JOIN pages p ON p.id = ps.page_id
         LEFT JOIN chapters c ON c.id = p.chapter_id
         WHERE (c.book_id = ? OR p.chapter_id = ?) AND ps.content MATCH ?
         ORDER BY c.sort_order ASC, p.sort_order ASC"
    )
    .bind(&book_id)
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
async fn get_book_settings(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<BookSettings, String> {
    // Ensure a settings row exists for the book (using default values)
    sqlx::query(
        "INSERT OR IGNORE INTO book_settings (book_id) VALUES (?)"
    )
    .bind(&book_id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    // Fetch the settings row
    let settings = sqlx::query_as::<_, BookSettings>(
        "SELECT * FROM book_settings WHERE book_id = ?"
    )
    .bind(&book_id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(settings)
}

#[tauri::command]
async fn get_book_word_count(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<i32, String> {
    let rows = sqlx::query(
        "SELECT pc.content FROM page_contents pc 
         JOIN pages p ON pc.page_id = p.id
         WHERE p.chapter_id = ? OR p.chapter_id IN (SELECT id FROM chapters WHERE book_id = ?)"
    )
    .bind(&book_id)
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    let mut total_words = 0;
    for row in rows {
        let content: String = row.get("content");
        let mut plain_text = String::new();
        let mut in_tag = false;
        for c in content.chars() {
            if c == '<' {
                in_tag = true;
                plain_text.push(' ');
            } else if c == '>' {
                in_tag = false;
                plain_text.push(' ');
            } else if !in_tag {
                plain_text.push(c);
            }
        }
        total_words += plain_text.split_whitespace().count() as i32;
    }

    Ok(total_words)
}

#[tauri::command]
async fn save_book_settings(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    settings: BookSettings,
) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO book_settings (
            book_id, body_font, header_font, font_size, line_height,
            letter_spacing, paragraph_spacing, editor_width, page_height, page_padding,
            light_theme, focus_mode, limit_enabled, limit_type, limit_value,
            smart_cap, smart_i, smart_space, drafting_mode, project_word_goal, daily_word_goal
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&book_id)
    .bind(&settings.body_font)
    .bind(&settings.header_font)
    .bind(settings.font_size)
    .bind(settings.line_height)
    .bind(settings.letter_spacing)
    .bind(settings.paragraph_spacing)
    .bind(&settings.editor_width)
    .bind(settings.page_height)
    .bind(settings.page_padding)
    .bind(settings.light_theme)
    .bind(settings.focus_mode)
    .bind(settings.limit_enabled)
    .bind(&settings.limit_type)
    .bind(settings.limit_value)
    .bind(settings.smart_cap)
    .bind(settings.smart_i)
    .bind(settings.smart_space)
    .bind(settings.drafting_mode)
    .bind(settings.project_word_goal)
    .bind(settings.daily_word_goal)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn export_book_to_docx(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    save_path: String,
) -> Result<(), String> {
    exporter::compile_docx(pool.inner(), &book_id, &save_path)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn export_book_to_epub(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    save_path: String,
    body_font: Option<String>,
    header_font: Option<String>,
) -> Result<(), String> {
    exporter::compile_epub(pool.inner(), &book_id, &save_path, body_font, header_font)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_book_storyboard(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<Vec<StoryboardCard>, String> {
    sqlx::query_as::<_, StoryboardCard>(
        "SELECT s.id, s.chapter_id, s.title, s.outline, s.color, s.sort_order 
         FROM storyboard_cards s
         JOIN chapters c ON s.chapter_id = c.id
         WHERE c.book_id = ?
         ORDER BY c.sort_order ASC, s.sort_order ASC"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_storyboard_card(
    pool: tauri::State<'_, SqlitePool>,
    chapter_id: String,
    title: String,
) -> Result<StoryboardCard, String> {
    let id = uuid::Uuid::new_v4().to_string();
    
    // Get max sort order
    let row = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) FROM storyboard_cards WHERE chapter_id = ?")
        .bind(&chapter_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    let max_order: i32 = row.get(0);
    let sort_order = max_order + 1;

    sqlx::query(
        "INSERT INTO storyboard_cards (id, chapter_id, title, outline, color, sort_order) VALUES (?, ?, ?, NULL, NULL, ?)"
    )
    .bind(&id)
    .bind(&chapter_id)
    .bind(&title)
    .bind(sort_order)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(StoryboardCard {
        id,
        chapter_id,
        title: Some(title),
        outline: None,
        color: None,
        sort_order,
    })
}

#[tauri::command]
async fn delete_storyboard_card(
    pool: tauri::State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM storyboard_cards WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_storyboard_card(
    pool: tauri::State<'_, SqlitePool>,
    id: String,
    title: Option<String>,
    outline: Option<String>,
    color: Option<String>,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE storyboard_cards SET title = ?, outline = ?, color = ? WHERE id = ?"
    )
    .bind(title)
    .bind(outline)
    .bind(color)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn reorder_storyboard_cards(
    pool: tauri::State<'_, SqlitePool>,
    card_ids: Vec<String>,
) -> Result<(), String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for (idx, id) in card_ids.iter().enumerate() {
        sqlx::query("UPDATE storyboard_cards SET sort_order = ? WHERE id = ?")
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
async fn move_storyboard_card_to_chapter(
    pool: tauri::State<'_, SqlitePool>,
    card_id: String,
    chapter_id: String,
) -> Result<(), String> {
    // Get max sort order in target chapter
    let row = sqlx::query("SELECT COALESCE(MAX(sort_order), -1) FROM storyboard_cards WHERE chapter_id = ?")
        .bind(&chapter_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    let max_order: i32 = row.get(0);
    let sort_order = max_order + 1;

    sqlx::query("UPDATE storyboard_cards SET chapter_id = ?, sort_order = ? WHERE id = ?")
        .bind(chapter_id)
        .bind(sort_order)
        .bind(card_id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_editorial_notes(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
) -> Result<Vec<EditorialNote>, String> {
    sqlx::query_as::<_, EditorialNote>(
        "SELECT id, book_id, page_id, region_key, text_offset, text_length, selected_text, comment_text, author, created_at, resolved 
         FROM editorial_notes WHERE book_id = ? ORDER BY created_at ASC"
    )
    .bind(&book_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_editorial_note(
    pool: tauri::State<'_, SqlitePool>,
    book_id: String,
    page_id: String,
    region_key: String,
    text_offset: i32,
    text_length: i32,
    selected_text: Option<String>,
    comment_text: String,
    author: String,
) -> Result<EditorialNote, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().timestamp();
    let resolved = 0;

    sqlx::query(
        "INSERT INTO editorial_notes (id, book_id, page_id, region_key, text_offset, text_length, selected_text, comment_text, author, created_at, resolved) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&book_id)
    .bind(&page_id)
    .bind(&region_key)
    .bind(&text_offset)
    .bind(&text_length)
    .bind(&selected_text)
    .bind(&comment_text)
    .bind(&author)
    .bind(&created_at)
    .bind(&resolved)
    .execute(pool.inner())
    .await
    .map_err(|e| e.to_string())?;

    Ok(EditorialNote {
        id,
        book_id,
        page_id,
        region_key,
        text_offset,
        text_length,
        selected_text,
        comment_text,
        author,
        created_at,
        resolved,
    })
}

#[tauri::command]
async fn toggle_resolve_note(
    pool: tauri::State<'_, SqlitePool>,
    id: String,
    resolved: i32,
) -> Result<(), String> {
    sqlx::query("UPDATE editorial_notes SET resolved = ? WHERE id = ?")
        .bind(resolved)
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_editorial_note(
    pool: tauri::State<'_, SqlitePool>,
    id: String,
) -> Result<(), String> {
    sqlx::query("DELETE FROM editorial_notes WHERE id = ?")
        .bind(&id)
        .execute(pool.inner())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// --- Main Runner ---

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
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
            export_book_to_epub,
            export_book_to_docx,
            get_book_settings,
            get_book_word_count,
            save_book_settings,
            get_book_storyboard,
            save_storyboard_card,
            create_storyboard_card,
            delete_storyboard_card,
            reorder_storyboard_cards,
            move_storyboard_card_to_chapter,
            get_editorial_notes,
            create_editorial_note,
            toggle_resolve_note,
            delete_editorial_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
