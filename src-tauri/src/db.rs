use sqlx::{SqlitePool, Executor, Acquire};
use sqlx::sqlite::SqliteConnectOptions;
use std::str::FromStr;
use std::path::Path;

pub async fn init_db(db_path: &Path) -> Result<SqlitePool, sqlx::Error> {
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());
    
    // Create database file and parent directories if they don't exist
    if !db_path.exists() {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| sqlx::Error::Io(e))?;
        }
        std::fs::File::create(db_path).map_err(|e| sqlx::Error::Io(e))?;
    }

    let connection_options = SqliteConnectOptions::from_str(&db_url)?
        .pragma("foreign_keys", "ON")
        .pragma("journal_mode", "WAL");

    let pool = SqlitePool::connect_with(connection_options).await?;
    
    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let mut conn = pool.acquire().await?;
    
    // Fetch current user_version
    let row: (i32,) = sqlx::query_as("PRAGMA user_version;")
        .fetch_one(&mut *conn)
        .await?;
    
    let current_version = row.0;

    if current_version < 1 {
        let mut tx = pool.begin().await?;
        
        // 1. Create Core Tables
        tx.execute(
            "CREATE TABLE IF NOT EXISTS books (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                genre TEXT,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                layout_json TEXT NOT NULL
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                title TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                template_id TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                category TEXT,
                page_type TEXT,
                FOREIGN KEY(chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
                FOREIGN KEY(template_id) REFERENCES templates(id)
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS page_contents (
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                content TEXT NOT NULL,
                PRIMARY KEY(page_id, region_key),
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS page_versions (
                id TEXT PRIMARY KEY,
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                keywords TEXT,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS character_mentions (
                character_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                PRIMARY KEY(character_id, page_id),
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        // 2. FTS5 Virtual Table for Search
        tx.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS page_search USING fts5(
                page_id UNINDEXED,
                region_key UNINDEXED,
                content
            );"
        ).await?;

        // 3. Triggers for Automatic Sync to FTS5 (FTS5 search plaintext syncing managed in Rust)
        tx.execute("DROP TRIGGER IF EXISTS page_contents_insert;").await?;
        tx.execute("DROP TRIGGER IF EXISTS page_contents_update;").await?;

        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS page_contents_delete AFTER DELETE ON page_contents
            BEGIN
                DELETE FROM page_search
                WHERE page_id = old.page_id AND region_key = old.region_key;
            END;"
        ).await?;

        // 4. Populate Default Templates
        let templates = vec![
            (
                "title_page", 
                "Title Page", 
                r#"{"display":"grid","gridTemplateAreas":"'header' 'title' 'subtitle' 'author' 'footer'","gridTemplateColumns":"1fr","gridTemplateRows":"0.5fr 2fr 1fr 1fr 1fr","gap":"20px","minHeight":"100%"}"#
            ),
            (
                "standard", 
                "Standard Prose", 
                r#"{"display":"grid","gridTemplateAreas":"'header' 'main' 'footer'","gridTemplateColumns":"1fr","gridTemplateRows":"30px 1fr 30px","gap":"15px","minHeight":"100%"}"#
            ),
            (
                "corner_notes", 
                "Marginal Notes", 
                r#"{"display":"grid","gridTemplateAreas":"'header header' 'sidebar main' 'footer footer'","gridTemplateColumns":"200px 1fr","gridTemplateRows":"30px 1fr 30px","gap":"20px","minHeight":"100%"}"#
            ),
            (
                "chapter_start", 
                "Chapter Header", 
                r#"{"display":"grid","gridTemplateAreas":"'number' 'title' 'main'","gridTemplateColumns":"1fr","gridTemplateRows":"80px 50px 1fr","gap":"25px","minHeight":"100%"}"#
            ),
        ];

        for (id, name, layout_json) in templates {
            sqlx::query("INSERT INTO templates (id, name, layout_json) VALUES (?, ?, ?);")
                .bind(id)
                .bind(name)
                .bind(layout_json)
                .execute(&mut *tx)
                .await?;
        }

        // Set version to 1
        tx.execute("PRAGMA user_version = 1;").await?;
        
        tx.commit().await?;
    }

    if current_version < 2 {
        let mut tx = pool.begin().await?;
        
        // 1. Add category and page_type columns
        let _ = tx.execute("ALTER TABLE pages ADD COLUMN category TEXT;").await;
        let _ = tx.execute("ALTER TABLE pages ADD COLUMN page_type TEXT;").await;

        // 2. Seed missing screenplay templates
        let screenplay_templates = vec![
            (
                "screenplay_title",
                "Screenplay Title Page",
                r#"{"display":"grid","gridTemplateAreas":"'title' 'details' 'contact'","gridTemplateColumns":"1fr","gridTemplateRows":"1fr 150px 100px","gap":"20px"}"#
            ),
            (
                "screenplay_standard",
                "Standard Script Page",
                r#"{"display":"grid","gridTemplateAreas":"'main'","gridTemplateColumns":"1fr","gridTemplateRows":"1fr","gap":"0px"}"#
            ),
            (
                "screenplay_cast",
                "Cast List Page",
                r#"{"display":"grid","gridTemplateAreas":"'header' 'main'","gridTemplateColumns":"1fr","gridTemplateRows":"60px 1fr","gap":"20px"}"#
            ),
            (
                "screenplay_act_break",
                "Act Break Page",
                r#"{"display":"grid","gridTemplateAreas":"'main'","gridTemplateColumns":"1fr","gridTemplateRows":"1fr","gap":"0px"}"#
            ),
        ];

        for (id, name, layout_json) in screenplay_templates {
            let _ = sqlx::query("INSERT OR IGNORE INTO templates (id, name, layout_json) VALUES (?, ?, ?);")
                .bind(id)
                .bind(name)
                .bind(layout_json)
                .execute(&mut *tx)
                .await;
        }

        // Set version to 2
        tx.execute("PRAGMA user_version = 2;").await?;
        
        tx.commit().await?;
    }

    if current_version < 3 {
        let mut tx = pool.begin().await?;

        tx.execute(
            "CREATE TABLE IF NOT EXISTS book_settings (
                book_id TEXT PRIMARY KEY,
                body_font TEXT NOT NULL DEFAULT 'garamond',
                header_font TEXT NOT NULL DEFAULT 'playfair',
                font_size INTEGER NOT NULL DEFAULT 18,
                line_height REAL NOT NULL DEFAULT 1.65,
                letter_spacing REAL NOT NULL DEFAULT 0.0,
                paragraph_spacing REAL NOT NULL DEFAULT 0.5,
                editor_width TEXT NOT NULL DEFAULT 'medium',
                page_height REAL NOT NULL DEFAULT 1122.0,
                page_padding REAL NOT NULL DEFAULT 60.0,
                light_theme INTEGER NOT NULL DEFAULT 0,
                focus_mode INTEGER NOT NULL DEFAULT 0,
                limit_enabled INTEGER NOT NULL DEFAULT 1,
                limit_type TEXT NOT NULL DEFAULT 'chars',
                limit_value INTEGER NOT NULL DEFAULT 2000,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
            );"
        ).await?;

        // Set version to 3
        tx.execute("PRAGMA user_version = 3;").await?;

        tx.commit().await?;
    }

    if current_version < 4 {
        let mut tx = pool.begin().await?;

        // 1. Add project_type column to books table if it doesn't exist
        let col_exists: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM pragma_table_info('books') WHERE name = 'project_type'"
        )
        .fetch_one(&mut *tx)
        .await?;

        if col_exists.0 == 0 {
            tx.execute("ALTER TABLE books ADD COLUMN project_type TEXT NOT NULL DEFAULT 'novel';").await?;
        }

        // Set version to 4
        tx.execute("PRAGMA user_version = 4;").await?;

        tx.commit().await?;
    }

    if current_version < 5 {
        let mut tx = pool.begin().await?;

        // 1. Create page_storyboard table
        tx.execute(
            "CREATE TABLE IF NOT EXISTS page_storyboard (
                page_id TEXT PRIMARY KEY,
                outline TEXT,
                color TEXT,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        // 2. Create editorial_notes table
        tx.execute(
            "CREATE TABLE IF NOT EXISTS editorial_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                text_offset INTEGER NOT NULL,
                text_length INTEGER NOT NULL,
                selected_text TEXT,
                comment_text TEXT NOT NULL,
                author TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                resolved INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        // Set version to 5
        tx.execute("PRAGMA user_version = 5;").await?;

        tx.commit().await?;
    }

    if current_version < 6 {
        let mut conn = pool.acquire().await?;

        // 1. Disable foreign keys temporarily
        sqlx::query("PRAGMA foreign_keys = OFF;").execute(&mut *conn).await?;

        let mut tx = conn.begin().await?;

        // 2. Rename old tables
        tx.execute("ALTER TABLE pages RENAME TO pages_old;").await?;
        tx.execute("ALTER TABLE page_contents RENAME TO page_contents_old;").await?;
        tx.execute("ALTER TABLE page_versions RENAME TO page_versions_old;").await?;
        tx.execute("ALTER TABLE character_mentions RENAME TO character_mentions_old;").await?;
        tx.execute("ALTER TABLE page_storyboard RENAME TO page_storyboard_old;").await?;
        tx.execute("ALTER TABLE editorial_notes RENAME TO editorial_notes_old;").await?;

        // 3. Create new pages table without FOREIGN KEY(chapter_id)
        tx.execute(
            "CREATE TABLE pages (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                template_id TEXT NOT NULL,
                sort_order INTEGER NOT NULL,
                category TEXT,
                page_type TEXT,
                FOREIGN KEY(template_id) REFERENCES templates(id)
            );"
        ).await?;

        // Create dependent tables with correct foreign keys referencing new pages table
        tx.execute(
            "CREATE TABLE page_contents (
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                content TEXT NOT NULL,
                PRIMARY KEY(page_id, region_key),
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE page_versions (
                id TEXT PRIMARY KEY,
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE character_mentions (
                character_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                PRIMARY KEY(character_id, page_id),
                FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE page_storyboard (
                page_id TEXT PRIMARY KEY,
                outline TEXT,
                color TEXT,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        tx.execute(
            "CREATE TABLE editorial_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                page_id TEXT NOT NULL,
                region_key TEXT NOT NULL,
                text_offset INTEGER NOT NULL,
                text_length INTEGER NOT NULL,
                selected_text TEXT,
                comment_text TEXT NOT NULL,
                author TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                resolved INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
                FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
            );"
        ).await?;

        // 4. Copy data
        tx.execute(
            "INSERT INTO pages (id, chapter_id, template_id, sort_order, category, page_type)
             SELECT id, chapter_id, template_id, sort_order, category, page_type FROM pages_old;"
        ).await?;

        tx.execute(
            "INSERT INTO page_contents (page_id, region_key, content)
             SELECT page_id, region_key, content FROM page_contents_old;"
        ).await?;

        tx.execute(
            "INSERT INTO page_versions (id, page_id, region_key, content, created_at)
             SELECT id, page_id, region_key, content, created_at FROM page_versions_old;"
        ).await?;

        tx.execute(
            "INSERT INTO character_mentions (character_id, page_id)
             SELECT character_id, page_id FROM character_mentions_old;"
        ).await?;

        tx.execute(
            "INSERT INTO page_storyboard (page_id, outline, color)
             SELECT page_id, outline, color FROM page_storyboard_old;"
        ).await?;

        tx.execute(
            "INSERT INTO editorial_notes (id, book_id, page_id, region_key, text_offset, text_length, selected_text, comment_text, author, created_at, resolved)
             SELECT id, book_id, page_id, region_key, text_offset, text_length, selected_text, comment_text, author, created_at, resolved FROM editorial_notes_old;"
        ).await?;

        // 5. Drop old tables
        tx.execute("DROP TABLE pages_old;").await?;
        tx.execute("DROP TABLE page_contents_old;").await?;
        tx.execute("DROP TABLE page_versions_old;").await?;
        tx.execute("DROP TABLE character_mentions_old;").await?;
        tx.execute("DROP TABLE page_storyboard_old;").await?;
        tx.execute("DROP TABLE editorial_notes_old;").await?;

        // 6. Create triggers for cascade delete of pages
        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS delete_chapter_pages AFTER DELETE ON chapters
            BEGIN
                DELETE FROM pages WHERE chapter_id = old.id;
            END;"
        ).await?;

        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS delete_book_pages AFTER DELETE ON books
            BEGIN
                DELETE FROM pages WHERE chapter_id = old.id;
            END;"
        ).await?;

        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS page_contents_delete AFTER DELETE ON page_contents
            BEGIN
                DELETE FROM page_search
                WHERE page_id = old.page_id AND region_key = old.region_key;
            END;"
        ).await?;

        // Set version to 6
        tx.execute("PRAGMA user_version = 6;").await?;

        tx.commit().await?;

        // Re-enable foreign keys
        sqlx::query("PRAGMA foreign_keys = ON;").execute(&mut *conn).await?;
    }

    if current_version < 7 {
        let mut tx = pool.begin().await?;
        let _ = tx.execute("ALTER TABLE book_settings ADD COLUMN smart_cap INTEGER NOT NULL DEFAULT 1;").await;
        let _ = tx.execute("ALTER TABLE book_settings ADD COLUMN smart_i INTEGER NOT NULL DEFAULT 1;").await;
        let _ = tx.execute("ALTER TABLE book_settings ADD COLUMN smart_space INTEGER NOT NULL DEFAULT 1;").await;
        tx.execute("PRAGMA user_version = 7;").await?;
        tx.commit().await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Row;

    #[tokio::test]
    async fn test_db_setup_and_foreign_keys() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join("test_book_writer_v6.db");
        if db_path.exists() {
            let _ = std::fs::remove_file(&db_path);
        }
        let pool = init_db(&db_path).await.unwrap();

        // 1. Verify inserting a screenplay page (chapter_id = book_id) succeeds!
        let book_id = "test-book-123".to_string();
        sqlx::query("INSERT INTO books (id, title, author, project_type, created_at, updated_at) VALUES (?, ?, ?, 'screenplay', 0, 0)")
            .bind(&book_id)
            .bind("Test Book")
            .bind("Author")
            .execute(&pool)
            .await
            .unwrap();

        let page_id = "test-page-123".to_string();
        sqlx::query("INSERT INTO pages (id, chapter_id, template_id, sort_order, category, page_type) VALUES (?, ?, 'standard', 0, 'screenplay', 'screenplay_standard')")
            .bind(&page_id)
            .bind(&book_id)
            .execute(&pool)
            .await
            .unwrap();

        // 2. Test finding the book ID for this page (simulation of save_page_content query)
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
        .fetch_one(&pool)
        .await
        .unwrap();

        let resolved_book_id: String = book_row.get("book_id");
        assert_eq!(resolved_book_id, book_id);

        // 3. Test cascade delete on books deletes pages too!
        sqlx::query("DELETE FROM books WHERE id = ?").bind(&book_id).execute(&pool).await.unwrap();
        
        let count_row = sqlx::query("SELECT COUNT(*) FROM pages WHERE id = ?")
            .bind(&page_id)
            .fetch_one(&pool)
            .await
            .unwrap();
        let count: i64 = count_row.get(0);
        assert_eq!(count, 0, "Page should have been cascade-deleted by trigger!");

        let _ = std::fs::remove_file(&db_path);
    }
}


