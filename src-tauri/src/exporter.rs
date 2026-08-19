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

fn find_fonts_dir() -> Option<std::path::PathBuf> {
    let candidates = [
        "src/assets/fonts",
        "../src/assets/fonts",
        "assets/fonts",
    ];
    for c in &candidates {
        let path = std::path::PathBuf::from(c);
        if path.exists() && path.is_dir() {
            return Some(path);
        }
    }
    None
}

fn get_font_files(font_key: &str) -> Vec<(&'static str, &'static str, &'static str, &'static str)> {
    match font_key {
        "garamond" => vec![
            ("EB_Garamond-400.woff2", "EB Garamond", "normal", "400"),
            ("EB_Garamond-400-Italic.woff2", "EB Garamond", "italic", "400"),
            ("EB_Garamond-500.woff2", "EB Garamond", "normal", "500"),
            ("EB_Garamond-500-Italic.woff2", "EB Garamond", "italic", "500"),
            ("EB_Garamond-600.woff2", "EB Garamond", "normal", "600"),
        ],
        "lora" => vec![
            ("Lora-400.woff2", "Lora", "normal", "400"),
            ("Lora-400-Italic.woff2", "Lora", "italic", "400"),
            ("Lora-600.woff2", "Lora", "normal", "600"),
            ("Lora-600-Italic.woff2", "Lora", "italic", "600"),
            ("Lora-700.woff2", "Lora", "normal", "700"),
            ("Lora-700-Italic.woff2", "Lora", "italic", "700"),
        ],
        "merriweather" => vec![
            ("Merriweather-300.woff2", "Merriweather", "normal", "300"),
            ("Merriweather-300-Italic.woff2", "Merriweather", "italic", "300"),
            ("Merriweather-400.woff2", "Merriweather", "normal", "400"),
            ("Merriweather-400-Italic.woff2", "Merriweather", "italic", "400"),
            ("Merriweather-700.woff2", "Merriweather", "normal", "700"),
        ],
        "crimson-pro" => vec![
            ("Crimson_Pro-400.woff2", "Crimson Pro", "normal", "400"),
            ("Crimson_Pro-400-Italic.woff2", "Crimson Pro", "italic", "400"),
            ("Crimson_Pro-600.woff2", "Crimson Pro", "normal", "600"),
            ("Crimson_Pro-600-Italic.woff2", "Crimson Pro", "italic", "600"),
            ("Crimson_Pro-700.woff2", "Crimson Pro", "normal", "700"),
        ],
        "bitter" => vec![
            ("Bitter-400.woff2", "Bitter", "normal", "400"),
            ("Bitter-400-Italic.woff2", "Bitter", "italic", "400"),
            ("Bitter-600.woff2", "Bitter", "normal", "600"),
            ("Bitter-700.woff2", "Bitter", "normal", "700"),
        ],
        "noto-serif" => vec![
            ("Noto_Serif_Devanagari-400.woff2", "Noto Serif Devanagari", "normal", "400"),
            ("Noto_Serif_Devanagari-500.woff2", "Noto Serif Devanagari", "normal", "500"),
            ("Noto_Serif_Devanagari-600.woff2", "Noto Serif Devanagari", "normal", "600"),
            ("Noto_Serif_Devanagari-700.woff2", "Noto Serif Devanagari", "normal", "700"),
        ],
        "tiro-devanagari" => vec![
            ("Tiro_Devanagari_Hindi-400.woff2", "Tiro Devanagari Hindi", "normal", "400"),
            ("Tiro_Devanagari_Hindi-400-Italic.woff2", "Tiro Devanagari Hindi", "italic", "400"),
        ],
        "courier" => vec![
            ("Courier_Prime-400.woff2", "Courier Prime", "normal", "400"),
            ("Courier_Prime-400-Italic.woff2", "Courier Prime", "italic", "400"),
            ("Courier_Prime-700.woff2", "Courier Prime", "normal", "700"),
            ("Courier_Prime-700-Italic.woff2", "Courier Prime", "italic", "700"),
        ],
        "caveat" => vec![
            ("Caveat-400.woff2", "Caveat", "normal", "400"),
            ("Caveat-600.woff2", "Caveat", "normal", "600"),
            ("Caveat-700.woff2", "Caveat", "normal", "700"),
        ],
        "kalam" => vec![
            ("Kalam-300.woff2", "Kalam", "normal", "300"),
            ("Kalam-400.woff2", "Kalam", "normal", "400"),
            ("Kalam-700.woff2", "Kalam", "normal", "700"),
        ],
        "playfair" => vec![
            ("Playfair_Display-400.woff2", "Playfair Display", "normal", "400"),
            ("Playfair_Display-400-Italic.woff2", "Playfair Display", "italic", "400"),
            ("Playfair_Display-600.woff2", "Playfair Display", "normal", "600"),
            ("Playfair_Display-700.woff2", "Playfair Display", "normal", "700"),
            ("Playfair_Display-700-Italic.woff2", "Playfair Display", "italic", "700"),
        ],
        "cormorant" => vec![
            ("Cormorant_Garamond-400.woff2", "Cormorant Garamond", "normal", "400"),
            ("Cormorant_Garamond-400-Italic.woff2", "Cormorant Garamond", "italic", "400"),
            ("Cormorant_Garamond-600.woff2", "Cormorant Garamond", "normal", "600"),
            ("Cormorant_Garamond-600-Italic.woff2", "Cormorant Garamond", "italic", "600"),
            ("Cormorant_Garamond-700.woff2", "Cormorant Garamond", "normal", "700"),
        ],
        "cinzel" => vec![
            ("Cinzel-400.woff2", "Cinzel", "normal", "400"),
            ("Cinzel-600.woff2", "Cinzel", "normal", "600"),
            ("Cinzel-700.woff2", "Cinzel", "normal", "700"),
        ],
        "rajdhani" => vec![
            ("Rajdhani-400.woff2", "Rajdhani", "normal", "400"),
            ("Rajdhani-500.woff2", "Rajdhani", "normal", "500"),
            ("Rajdhani-600.woff2", "Rajdhani", "normal", "600"),
            ("Rajdhani-700.woff2", "Rajdhani", "normal", "700"),
        ],
        _ => vec![],
    }
}

fn get_body_font_stack(font_key: &str) -> &'static str {
    match font_key {
        "garamond" => "\"EB Garamond\", Georgia, serif",
        "lora" => "\"Lora\", Georgia, serif",
        "merriweather" => "\"Merriweather\", Georgia, serif",
        "crimson-pro" => "\"Crimson Pro\", Georgia, serif",
        "bitter" => "\"Bitter\", Georgia, serif",
        "noto-serif" => "\"Noto Serif Devanagari\", Georgia, serif",
        "tiro-devanagari" => "\"Tiro Devanagari Hindi\", Georgia, serif",
        "courier" => "\"Courier Prime\", Courier, monospace",
        "caveat" => "\"Caveat\", cursive, serif",
        "kalam" => "\"Kalam\", cursive, serif",
        _ => "\"Georgia\", \"Times New Roman\", serif",
    }
}

fn get_header_font_stack(font_key: &str) -> &'static str {
    match font_key {
        "playfair" => "\"Playfair Display\", Georgia, serif",
        "cormorant" => "\"Cormorant Garamond\", Georgia, serif",
        "cinzel" => "\"Cinzel\", Georgia, serif",
        "rajdhani" => "\"Rajdhani\", sans-serif",
        "garamond" => "\"EB Garamond\", Georgia, serif",
        "lora" => "\"Lora\", Georgia, serif",
        "caveat" => "\"Caveat\", cursive, serif",
        _ => "\"Georgia\", \"Times New Roman\", serif",
    }
}

fn render_page_to_html(template_id: &str, region_map: &HashMap<String, String>) -> String {
    let main_text = region_map.get("main").cloned().unwrap_or_default();
    let formatted_main = if template_id.starts_with("screenplay_") {
        main_text
    } else {
        let trimmed = main_text.trim();
        if trimmed.starts_with('<') {
            main_text
        } else {
            let paragraphs: Vec<String> = main_text
                .split('\n')
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .map(|s| format!("<p>{}</p>", s))
                .collect();
            paragraphs.join("\n")
        }
    };

    match template_id {
        "title_page" => {
            let title = region_map.get("title").cloned().unwrap_or_default();
            let subtitle = region_map.get("subtitle").cloned().unwrap_or_default();
            let author = region_map.get("author").cloned().unwrap_or_default();
            let footer = region_map.get("footer").cloned().unwrap_or_default();
            format!(
                r#"<div class="title-page-section" style="text-align:center; padding: 100px 0;">
                    <h1 class="book-title" style="font-size: 3em; margin-bottom: 10px;">{}</h1>
                    <h2 class="book-subtitle" style="font-size: 1.5em; font-weight: normal; margin-bottom: 50px; font-style: italic;">{}</h2>
                    <p class="book-author" style="font-size: 1.2em; margin-bottom: 100px;">{}</p>
                    <p class="book-publisher" style="font-size: 0.9em; margin-top: 50px;">{}</p>
                </div>"#,
                title, subtitle, author, footer
            )
        }
        "chapter_start" => {
            let num = region_map.get("number").cloned().unwrap_or_default();
            let title = region_map.get("title").cloned().unwrap_or_default();
            format!(
                r#"<div class="chapter-start-section">
                    <h2 style="text-align:center;">{}</h2>
                    <h3 style="text-align:center; font-style:italic;">{}</h3>
                    {}
                </div>"#,
                num, title, formatted_main
            )
        }
        "corner_notes" => {
            let corner = region_map.get("sidebar").cloned().unwrap_or_default();
            format!(
                r#"<div class="page-section">
                    <div class="corner-note"><strong>Note:</strong> {}</div>
                    {}
                </div>"#,
                corner, formatted_main
            )
        }
        "screenplay_title" => {
            let title = region_map.get("title").cloned().unwrap_or_default();
            let details = region_map.get("details").cloned().unwrap_or_default();
            let contact = region_map.get("contact").cloned().unwrap_or_default();
            let details_html = details.replace('\n', "<br />");
            let contact_html = contact.replace('\n', "<br />");
            format!(
                r#"<div class="screenplay-title-page" style="text-align:center; padding: 150px 0; font-family: Courier, monospace;">
                    <h1 style="font-size: 2.5em; text-transform: uppercase; margin-bottom: 80px; letter-spacing: 0.1em;">{}</h1>
                    <p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 120px;">{}</p>
                    <p style="font-size: 0.9em; margin-top: 100px; line-height: 1.4;">{}</p>
                </div>"#,
                title, details_html, contact_html
            )
        }
        "screenplay_standard" => {
            format!(
                r#"<div class="screenplay-standard-page" style="font-family: Courier, monospace; line-height: 1.2;">
                    {}
                </div>"#,
                formatted_main
            )
        }
        "screenplay_cast" => {
            let header = region_map.get("header").cloned().unwrap_or_default();
            format!(
                r#"<div class="screenplay-cast-page" style="font-family: Courier, monospace;">
                    <h2 style="text-align:center; text-transform: uppercase; margin-bottom: 30px;">{}</h2>
                    {}
                </div>"#,
                header, formatted_main
            )
        }
        "screenplay_act_break" => {
            format!(
                r#"<div class="screenplay-act-break-page" style="text-align:center; padding: 150px 0; font-family: Courier, monospace; text-transform: uppercase; font-weight: bold; font-size: 1.3em;">
                    {}
                </div>"#,
                formatted_main
            )
        }
        _ => {
            format!(
                r#"<div class="page-section">
                    {}
                </div>"#,
                formatted_main
            )
        }
    }
}

// Queries database and compiles a book to a standard ePUB file
pub async fn compile_epub(
    pool: &SqlitePool,
    book_id: &str,
    save_path: &str,
    body_font: Option<String>,
    header_font: Option<String>,
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

    // Embed local font resources
    let mut font_face_css = String::new();
    if let Some(fonts_dir) = find_fonts_dir() {
        let mut fonts_to_embed = Vec::new();
        if let Some(bf) = body_font.as_deref() {
            fonts_to_embed.extend(get_font_files(bf));
        }
        if let Some(hf) = header_font.as_deref() {
            fonts_to_embed.extend(get_font_files(hf));
        }
        
        fonts_to_embed.sort_by_key(|t| t.0);
        fonts_to_embed.dedup_by_key(|t| t.0);

        for (filename, family, style, weight) in fonts_to_embed {
            let font_path = fonts_dir.join(filename);
            if font_path.exists() {
                if let Ok(font_data) = std::fs::read(&font_path) {
                    let resource_path = format!("fonts/{}", filename);
                    if let Ok(_) = epub.add_resource(&resource_path, font_data.as_slice(), "font/woff2") {
                        font_face_css.push_str(&format!(
                            "@font-face {{\n  font-family: \"{}\";\n  src: url(\"{}\");\n  font-style: {};\n  font-weight: {};\n}}\n",
                            family, resource_path, style, weight
                        ));
                    }
                }
            }
        }
    }
    
    // Set default CSS styling for ePUB reader view
    let raw_custom_css = r#"
        /* FONT_FACES_PLACEHOLDER */
        body {
            font-family: BODY_FONT_PLACEHOLDER;
            padding: 5% 8%;
            line-height: 1.6;
            font-size: 1.1em;
            color: #111;
        }
        h1, h2, h3, h4, h5, h6 {
            font-family: HEADER_FONT_PLACEHOLDER;
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
        /* Screenplay Styling */
        .sc-slugline {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 1.2em;
            margin-bottom: 0.8em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-action {
            font-family: "Courier Prime", "Courier New", monospace;
            margin-bottom: 0.8em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-character {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-left: 30%;
            margin-top: 0.8em;
            margin-bottom: 0.2em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-parenthetical {
            font-family: "Courier Prime", "Courier New", monospace;
            margin-left: 22%;
            margin-right: 20%;
            margin-bottom: 0.2em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-dialogue {
            font-family: "Courier Prime", "Courier New", monospace;
            margin-left: 15%;
            margin-right: 15%;
            margin-bottom: 0.8em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-transition {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-left: 55%;
            margin-bottom: 0.8em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-shot {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 1em;
            margin-bottom: 0.8em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-fade_in, .sc-fade-in {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 1.5em;
            margin-bottom: 1em;
            text-indent: 0 !important;
            text-align: left !important;
        }
        .sc-fade_out, .sc-fade-out {
            font-family: "Courier Prime", "Courier New", monospace;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 1.5em;
            margin-bottom: 1em;
            text-indent: 0 !important;
            text-align: left !important;
        }
    "#;

    let body_stack = get_body_font_stack(body_font.as_deref().unwrap_or("garamond"));
    let header_stack = get_header_font_stack(header_font.as_deref().unwrap_or("playfair"));

    let custom_css = raw_custom_css
        .replace("/* FONT_FACES_PLACEHOLDER */", &font_face_css)
        .replace("BODY_FONT_PLACEHOLDER", body_stack)
        .replace("HEADER_FONT_PLACEHOLDER", header_stack);
    
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

    // 5. Fetch and Prepend Front Matter Pages
    let front_pages = sqlx::query(
        "SELECT id, template_id FROM pages WHERE (chapter_id = ? OR category = 'front_matter') AND category = 'front_matter' ORDER BY sort_order ASC"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    let mut front_idx = 1;
    for page_row in front_pages {
        let page_id: String = page_row.get("id");
        let template_id: String = page_row.get("template_id");

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

        let body_html = render_page_to_html(&template_id, &region_map);
        let page_html = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>Front Matter</title>
              <link rel="stylesheet" type="text/css" href="stylesheet.css" />
            </head>
            <body>
              {}
            </body>
            </html>"#,
            body_html
        );

        let filename = format!("front_{}.xhtml", front_idx);
        epub.add_content(
            EpubContent::new(filename, page_html.as_bytes())
                .title(&format!("Front Matter {}", front_idx))
                .reftype(ReferenceType::Preface)
        )?;
        front_idx += 1;
    }

    // 6. Add Chapters & Pages
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

            let body_html = render_page_to_html(&template_id, &region_map);
            ch_body_html.push_str(&body_html);
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

    // 7. Fetch and Append Back Matter Pages
    let back_pages = sqlx::query(
        "SELECT id, template_id FROM pages WHERE (chapter_id = ? OR category = 'back_matter') AND category = 'back_matter' ORDER BY sort_order ASC"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    let mut back_idx = 1;
    for page_row in back_pages {
        let page_id: String = page_row.get("id");
        let template_id: String = page_row.get("template_id");

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

        let body_html = render_page_to_html(&template_id, &region_map);
        let page_html = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>Back Matter</title>
              <link rel="stylesheet" type="text/css" href="stylesheet.css" />
            </head>
            <body>
              {}
            </body>
            </html>"#,
            body_html
        );

        let filename = format!("back_{}.xhtml", back_idx);
        epub.add_content(
            EpubContent::new(filename, page_html.as_bytes())
                .title(&format!("Back Matter {}", back_idx))
                .reftype(ReferenceType::Text)
        )?;
        back_idx += 1;
    }

    // 8. Fetch and Append Screenplay Pages (if any screenplay pages exist instead of chapters)
    let screenplay_pages = sqlx::query(
        "SELECT id, template_id FROM pages WHERE (chapter_id = ? OR category = 'screenplay') AND category = 'screenplay' ORDER BY sort_order ASC"
    )
    .bind(book_id)
    .fetch_all(pool)
    .await?;

    let mut sp_idx = 1;
    for page_row in screenplay_pages {
        let page_id: String = page_row.get("id");
        let template_id: String = page_row.get("template_id");

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

        let body_html = render_page_to_html(&template_id, &region_map);
        let page_html = format!(
            r#"<?xml version="1.0" encoding="utf-8"?>
            <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
              <title>Screenplay</title>
              <link rel="stylesheet" type="text/css" href="stylesheet.css" />
            </head>
            <body>
              {}
            </body>
            </html>"#,
            body_html
        );

        let filename = format!("screenplay_{}.xhtml", sp_idx);
        epub.add_content(
            EpubContent::new(filename, page_html.as_bytes())
                .title(&format!("Page {}", sp_idx))
                .reftype(ReferenceType::Text)
        )?;
        sp_idx += 1;
    }

    // 9. Write File
    let mut file = File::create(save_path)?;
    epub.generate(&mut file)?;

    Ok(())
}
