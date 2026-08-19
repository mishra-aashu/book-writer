use sqlx::{SqlitePool, Row};
use std::fs::File;
use std::collections::HashMap;
use epub_builder::{EpubBuilder, EpubContent, ReferenceType, ZipLibrary};

#[allow(dead_code)]
#[derive(serde::Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub path: String,
    pub error: Option<String>,
}

// Queries database and compiles a book to a standard ePUB file
pub async fn compile_epub(
    pool: &SqlitePool,
    book_id: &str,
    save_path: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Fetch Book Details
    let book_row = sqlx::query("SELECT title, author, genre, description FROM books WHERE id = ?")
        .bind(book_id)
        .fetch_one(pool)
        .await?;

    let book_title: String = book_row.get("title");
    let book_author: String = book_row.get("author");
    let book_genre: Option<String> = book_row.get("genre");
    let book_description: Option<String> = book_row.get("description");

    // 2. Fetch Chapters
    let chapter_rows = sqlx::query(
        "SELECT id, title FROM chapters WHERE book_id = ? ORDER BY sort_order ASC"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    // 3. Setup ePUB Builder
    let mut epub = EpubBuilder::new(ZipLibrary::new()?)?;
    epub.set_title(&book_title);
    epub.add_author(&book_author);
    
    if let Some(desc) = &book_description {
        epub.add_description(desc);
    }
    
    // Set default CSS styling for ePUB reader view
    let custom_css = r#"
        body {
            font-family: "Georgia", "Times New Roman", serif;
            padding: 5% 8%;
            line-height: 1.6;
            font-size: 1.1em;
            color: #111;
        }
        h1.book-title {
            text-align: center;
            margin-top: 25%;
            font-size: 2.2em;
            font-weight: bold;
        }
        h2.book-subtitle {
            text-align: center;
            font-size: 1.4em;
            font-style: italic;
            margin-bottom: 20%;
            opacity: 0.8;
        }
        p.book-author {
            text-align: center;
            font-size: 1.2em;
            margin-bottom: 30%;
        }
        .chapter-num {
            text-align: center;
            font-size: 1.2em;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 15%;
            color: #555;
        }
        .chapter-title {
            text-align: center;
            font-size: 1.8em;
            margin-bottom: 10%;
        }
        p {
            text-indent: 1.5em;
            margin: 0 0 0.8em 0;
            text-align: justify;
        }
        p.first-para {
            text-indent: 0;
        }
        .corner-note {
            font-size: 0.85em;
            font-style: italic;
            background: #f9f9f9;
            border-left: 3px solid #ccc;
            padding: 10px;
            margin: 15px 0;
        }
        .split-container {
            display: table;
            width: 100%;
            margin: 15px 0;
        }
        .split-left {
            display: table-cell;
            width: 40%;
            padding-right: 15px;
            font-style: italic;
            border-right: 1px solid #eee;
        }
        .split-right {
            display: table-cell;
            width: 60%;
            padding-left: 15px;
        }
    "#;
    
    epub.stylesheet(custom_css.as_bytes())?;

    // 4. Add Title Page
    let title_html = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>Title Page</title>
          <link rel="stylesheet" type="text/css" href="stylesheet.css" />
        </head>
        <body>
          <h1 class="book-title">{}</h1>
          <h2 class="book-subtitle">{}</h2>
          <p class="book-author">By {}</p>
        </body>
        </html>"#,
        book_title,
        book_genre.unwrap_or_else(|| "Novel".to_string()),
        book_author
    );
    epub.add_content(
        EpubContent::new("title.xhtml", title_html.as_bytes())
            .title("Title Page")
            .reftype(ReferenceType::TitlePage)
    )?;

    // 5. Add Chapters & Pages
    let mut ch_idx = 1;
    for ch_row in chapter_rows {
        let ch_id: String = ch_row.get("id");
        let ch_title: String = ch_row.get("title");

        let page_rows = sqlx::query(
            "SELECT id, template_id FROM pages WHERE chapter_id = ? ORDER BY sort_order ASC"
        )
        .bind(&ch_id)
        .fetch_all(pool)
        .await?;

        let mut ch_body_html = String::new();
        ch_body_html.push_str(&format!(
            r#"<div class="chapter-num">Chapter {}</div>
            <h1 class="chapter-title">{}</h1>"#,
            ch_idx, ch_title
        ));

        for page_row in page_rows {
            let page_id: String = page_row.get("id");
            let template_id: String = page_row.get("template_id");

            // Get content mapping for this page
            let contents = sqlx::query(
                "SELECT region_key, content FROM page_contents WHERE page_id = ?"
            )
            .bind(&page_id)
            .fetch_all(pool)
            .await?;

            let mut region_map = HashMap::new();
            for item in contents {
                let region_key: String = item.get("region_key");
                let content_str: String = item.get("content");
                region_map.insert(region_key, content_str);
            }

            // Convert template fields to HTML structure
            let main_text = region_map.get("main").cloned().unwrap_or_default();
            let paragraphs: Vec<String> = main_text
                .split('\n')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(|s| format!("<p>{}</p>", s))
                .collect();
            
            let formatted_main = paragraphs.join("\n");

            match template_id.as_str() {
                "chapter_start" => {
                    let num = region_map.get("number").cloned().unwrap_or_default();
                    let title = region_map.get("title").cloned().unwrap_or_default();
                    ch_body_html.push_str(&format!(
                        r#"<div class="chapter-start-section">
                            <h2 style="text-align:center;">{}</h2>
                            <h3 style="text-align:center; font-style:italic;">{}</h3>
                            {}
                        </div>"#,
                        num, title, formatted_main
                    ));
                }
                "corner_notes" => {
                    let corner = region_map.get("corner").cloned().unwrap_or_default();
                    ch_body_html.push_str(&format!(
                        r#"<div class="page-section">
                            <div class="corner-note"><strong>Note:</strong> {}</div>
                            {}
                        </div>"#,
                        corner, formatted_main
                    ));
                }
                _ => {
                    ch_body_html.push_str(&format!(
                        r#"<div class="page-section">
                            {}
                        </div>"#,
                        formatted_main
                    ));
                }
            }
            ch_body_html.push_str("\n<hr style=\"border: none; border-top: 1px dashed #eee; margin: 30px 0;\" />\n");
        }

        let chapter_html = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>{}</title>
              <link rel="stylesheet" type="text/css" href="stylesheet.css" />
            </head>
            <body>
              {}
            </body>
            </html>"#,
            ch_title, ch_body_html
        );

        let filename = format!("chapter_{}.xhtml", ch_idx);
        epub.add_content(
            EpubContent::new(filename, chapter_html.as_bytes())
                .title(&ch_title)
                .reftype(ReferenceType::Text)
        )?;

        ch_idx += 1;
    }

    // 6. Write File
    let mut file = File::create(save_path)?;
    epub.generate(&mut file)?;

    Ok(())
}
