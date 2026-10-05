# Unified topic pages

The Portuguese routes are the canonical pages for the four resource topics and four pressure vectors. Former English-named routes redirect with their query string and hash intact. Language is still selected through the existing i18n runtime.

Each page keeps local controls and data IDs, with the original introduction and continuous visible sections. The global panel loads its `unified-*.js` controller on page load. These controllers retain the existing data readers, but must not replace the sidebar or the page title. Global IDs must remain unique within the combined document.

Global styles are scoped to `.global-reading`. Rules shared by all eight panels live in
`assets/css/pages/global-reading-base.css`; each `assets/css/pages/unified-<topic>.css` holds only that
topic's own rules and is loaded right after the base. Edit these files directly (the former generator,
`scope-styles.py`, was retired when the styles were consolidated). After editing, run:

```sh
node scripts/tests/unified-topics.test.mjs
node scripts/build-pages.mjs
```

The compact complete web uses four ordinary linked images clipped into adjoining curved sectors with CSS polygons. A decorative external SVG draws the shared strands; image rendering does not depend on SVG masks. Element names and descriptions remain outside the composition. News cards have one 4:3 media frame; image wrappers must inherit its dimensions. Service diagrams preserve their original aspect ratio at a smaller width.

Headline statistics show the existing dataset's reference year, not the date of viewing. Update the explanatory summary when refreshing those datasets. Missing island-level observations must never be replaced by national averages.
