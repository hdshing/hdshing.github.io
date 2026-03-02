# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Markdown 在线阅读器** (Markdown Online Reader) - A web-based tool for viewing Markdown files.

## Features

1. Upload local `.md` files from the user's computer
2. Input field for online `.md` file URLs (e.g., GitHub raw links)
3. Render Markdown content with support for:
   - Headings (H1-H6)
   - Lists (ordered/unordered)
   - Code blocks with syntax highlighting
   - Links, images, tables, blockquotes
4. Clean, minimal UI
5. Auto-adaptive dark/light mode (optional)

## Tech Stack

- **HTML5** - Page structure
- **CSS3** - Styling with CSS variables for theming
- **Vanilla JavaScript** - No frameworks
- **[marked.js](https://marked.js.org/)** - Markdown parsing library

## Project Structure

```
viewDM/
├── index.html          # Main entry point
├── css/
│   └── style.css       # Styles with dark/light mode support
├── js/
│   ├── app.js          # Main application logic
│   └── marked.min.js   # Or use CDN
└── CLAUDE.md           # This file
```

## Development

Since this is a pure HTML/CSS/JS project, no build step is required.

### Local Development

Serve the project with any static file server:

```bash
# Python 3
python -m http.server 8080

# Node.js (if you have http-server installed)
npx http-server -p 8080

# PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## CDN Dependencies

Include marked.js via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
```

## Key Implementation Notes

### File Upload

Use `<input type="file" accept=".md,.markdown">` with FileReader API:

```javascript
const reader = new FileReader();
reader.onload = (e) => {
    const content = e.target.result;
    document.getElementById('preview').innerHTML = marked.parse(content);
};
reader.readAsText(file);
```

### URL Fetching

Use `fetch()` to load remote Markdown files. Note CORS restrictions:

```javascript
fetch(url)
    .then(response => response.text())
    .then(text => {
        document.getElementById('preview').innerHTML = marked.parse(text);
    });
```

### Dark/Light Mode

Use CSS variables and `prefers-color-scheme`:

```css
:root {
    --bg-color: #ffffff;
    --text-color: #333333;
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
    }
}
```

## Security Considerations

- marked.js can sanitize HTML to prevent XSS attacks. Enable `sanitize` option if needed.
- When fetching remote URLs, be aware of CORS limitations.

## Styling Guidelines

- Keep UI minimal and focused on content readability
- Use system fonts for fast loading: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
- Code blocks should have syntax highlighting background colors
- Proper spacing for readability (line-height: 1.6-1.8)
