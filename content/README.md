# Content Layout

- `raw`: source papers, mark schemes, template files, and imported binaries
- `normalized`: schema-valid JSON used by the application and grading logic
- `assets`: extracted diagrams, images, and media referenced by normalized items
- `qa`: review records and publication status

The original assessment assets currently live outside this folder in the bootstrap workspace. Migrate them into `content/raw/` through tracked content-ingestion tasks instead of manual unlogged moves.

