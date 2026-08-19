use sqlx::{SqlitePool, Executor};
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

    let pool = SqlitePool::connect(&db_url).await?;
    
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

        // 3. Triggers for Automatic Sync to FTS5
        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS page_contents_insert AFTER INSERT ON page_contents
            BEGIN
                INSERT INTO page_search(page_id, region_key, content)
                VALUES (new.page_id, new.region_key, new.content);
            END;"
        ).await?;

        tx.execute(
            "CREATE TRIGGER IF NOT EXISTS page_contents_update AFTER UPDATE ON page_contents
            BEGIN
                UPDATE page_search
                SET content = new.content
                WHERE page_id = new.page_id AND region_key = new.region_key;
            END;"
        ).await?;

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

    Ok(())
}
