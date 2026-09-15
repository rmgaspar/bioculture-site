# Unified topic pages

The Portuguese routes are the canonical pages for the four resource topics and four pressure vectors. Former English-named routes redirect with their query string and hash intact. Language is still selected through the existing i18n runtime.

Each page keeps local controls and data IDs, with the original introduction and continuous visible sections. The global panel loads its `unified-*.js` controller on page load. These controllers retain the existing data readers, but must not replace the sidebar or the page title. Global IDs must remain unique within the combined document.

Global legacy styles are scoped to `.global-reading`. After editing their source styles, run:

```sh
python3 scripts/topics/scope-styles.py
node scripts/tests/unified-topics.test.mjs
node scripts/build-pages.mjs
```

The compact HTML mosaic uses four ordinary images within a shared frame; it does not depend on SVG masks or clipping. News cards have one 4:3 media frame; image wrappers must inherit its dimensions. Service diagrams preserve their original aspect ratio at a smaller width.

Headline statistics show the existing dataset's reference year, not the date of viewing. Update the explanatory summary when refreshing those datasets. Missing island-level observations must never be replaced by national averages.
