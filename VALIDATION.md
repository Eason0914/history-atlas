# Local verification

43 browser and content checks passed for the Unit 3 update in a temporary headless Chrome profile on Windows.

Coverage includes 48 unique entries, 105 source slides across ten decks, exact slide references for each new factual note, all 48 location images, the 14 Unit 3 entries, time and unit filters, library filtering/pagination, source cautions, and completion/retry of a Unit 3 quiz.

Both editions were checked at widths of 1480, 1100, 720, 390, and 320 pixels, and by direct-file opening. Desktop and mobile screenshots were inspected. Reduced motion and reduced transparency were verified for the glass edition.

Existing browser storage keys and entry IDs were preserved. Earlier Aztec drafts and review status still load, new drafts survive reload, and edition switching preserves the selected place, unit, draft, and active quiz.

All new slides were read, including three image-only maps. The circa-1820 Qing map and inconsistent first dates on the Mughal map are labeled as source cautions. No browser runtime exceptions occurred. Temporary browser and local server processes were stopped afterward.

The original PowerPoints remain unchanged. These checks do not certify official AP exam coverage or resolve the seven classroom-source cautions.

## Ocean refraction and glass controls

The 43 checks above were rerun after the optics update and passed. A further 22 browser checks passed in headless Chrome on Windows:

- The classic edition hides the optics and does not request the ocean photograph.
- The glass edition loads its local photograph into WebGL. Pointer movement changes the rendered pixels without changing any land geometry or marker transforms.
- Real pointer clicks select Qing China, zoom and reset the map, show and hide the TEA model, and start and answer a quiz.
- Command buttons keep readable labels separate from their SVG displacement layer, including buttons recreated or relabeled by the app. Quiz answer badges stay intact, and feedback retains its green/red colors.
- Edition switching keeps the current draft. Reduced motion yields a static refracted photograph; reduced transparency removes button optics.
- The 390px mobile layout has no horizontal overflow. Direct-file opening uses the SVG displacement fallback and local ocean asset. Source attribution is present, and no browser runtime exceptions occurred.

Desktop, practice, and full-page mobile screenshots were inspected. The ocean photograph is decorative and does not change the slide library's count of 100 historical images. No historical content or quiz data changed in this optics update. These checks cover Chromium desktop and mobile emulation; they are not a physical iPhone/Safari certification.

## Restore the Classic ocean

The map ocean was subsequently restored to Classic's static pale green background, dot pattern, and ocean label colors. The ocean renderer was removed; button and quiz styling remained identical. Twelve focused browser checks passed for the restored background, absence of ocean animation, unchanged glass controls, map selection and zoom, draft retention, mobile overflow, direct-file opening, and absence of runtime errors. The desktop screenshot was inspected. The earlier ocean-refraction checks above describe the preceding revision.

## Opt-in live-map glass prototype

The existing 43 browser/content checks passed after the three optional app integration events were added. A further 28 checks passed for `?prototype=live-map`: the original content/routes remain; actual map pixels are displaced behind the native glass; marker preview/Expand and focus handling work; real panning keeps the preview anchored; filtering dismisses it; the existing quiz works; there is no perpetual idle render loop; reduced motion/transparency work; a forced SVG scene fallback follows zoom; 1100/720/390/320px layouts stay within the viewport; mobile preview bounds, Classic switching, and direct-file opening work; normal glass stays unchanged without the opt-in parameter; and no runtime exceptions occurred. Native, fallback, desktop, and mobile screenshots were inspected. The browser is Chrome on Windows; Safari/Firefox and physical phones remain outside this verification.
