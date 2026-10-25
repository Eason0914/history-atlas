# World History Atlas · Units 1–3

An offline AP World History study map based on ten classroom PowerPoint decks: **105 slides**, **48 study locations and topics**, and **100 distinct embedded image files**. Unit 3 adds 30 slides and 11 new entries. Fourteen entries connect to Unit 3, including earlier Aztec, Inca, and overview examples revisited by the new slides.

## Two editions

- [Classic atlas](https://eason0914.github.io/history-atlas/classic.html): the original parchment, serif typography, and green map palette.
- [Liquid Glass](https://eason0914.github.io/history-atlas/glass.html): an Apple-inspired web interpretation with convex glass buttons, translucent navigation, calm reading surfaces, and the Classic edition's static ocean.

Use the edition switch at the top without leaving your current answer or quiz. Both editions share the same content, source library, drafts, and review records. The home page remembers your preferred look; each edition’s URL opens that specific look.

The glass edition follows the separation between navigation and reading content described in [Apple’s material guidance](https://developer.apple.com/design/human-interface-guidelines/materials). It uses browser CSS rather than native Apple APIs, respects reduced-motion and reduced-transparency preferences, and provides an opaque fallback when blur is unavailable.

The map ocean uses the Classic edition's pale green background and dot pattern, with no ocean photograph, refraction, or animation. Navigation, map controls, study actions, and quiz answers retain their glass optics so the text stays clear. Reduced-motion and reduced-transparency preferences are respected.

The decorative texture used in the glass controls is a photograph by Adrian Pelletier, published as CC0 on Pixnio; see [asset credits](assets/OCEAN-CREDIT.md). It is separate from the 100 classroom images and adds no historical source material.

## Open the website

On Windows, double-click **START-HERE.cmd**, or open **classic.html**, **glass.html**, or **index.html** in Chrome, Edge, or another modern browser. No installation, internet, API key, or account is required.

For a stable local address and browser storage, you can optionally run:

```text
python serve.py
```

This opens `http://127.0.0.1:8765`. Keep that window running while you study. Press Ctrl+C to stop. If the port is in use, run `python serve.py --port 8766`.

## Study features

- Click a world-map marker or a place in the list to read notes and view a slide image.
- Search names and study content. “Aztecs” finds the Aztec entry. Use `/` to focus search.
- The atlas initially highlights **Unit 3**. Filter by unit, region, **1200–1450**, **1450–1750**, earlier context, or extensions in the earlier decks. Tags describe lesson coverage, not uninterrupted rule. New Unit 3 notes have individual slide references.
- Use **SAQ · TEA** for Topic, Evidence, Analysis models and your own draft. Drafts save automatically in this browser, including drafts saved before the label update.
- Use **MCQ traps** for distinctions, then try a question.
- Mark places as **I know this** or **Review again**. The needs-review filter shows your revision list.
- Start a shuffled quiz in **Practice**. Wrong answers add places to your review list; retry them after the session. A correct quiz answer does not automatically mark an entire place as reviewed.
- Open **Slide library** to search all 105 slides’ original text, speaker notes where present, and images. Eleven image-only map slides have separate descriptions from visual inspection.
- Open source chips for the exact deck and slide. `sources.json` contains the complete extraction and source-file SHA-256 hashes.
- The header and Practice page link directly to your teacher’s [Quizlet class](https://quizlet.com/class/31576935/materials) and [AP History Skills Lab](https://ap-history-skills-lab.netlify.app/). SAQ and MCQ panels also link to the matching teacher resource. Links open in a new tab so your map and drafts stay open. Those external resources require internet access and may require a separate login; no Quizlet question bank is copied into this project.

Progress and drafts stay in local browser storage. They are not sent anywhere. Browser storage may differ between direct-file and local-server mode, and between browsers or port numbers. Use a consistent address. If storage is unavailable, the site tells you; keep a separate copy of important drafts.

## Scope and accuracy

The supplied decks focus on Units 1–2 around **1200–1450** and Unit 3 around **1450–1750**. This project does **not** claim to cover the entire AP World History curriculum. Earlier examples and later extensions remain visibly labeled.

Notes paraphrase the supplied slides. TEA models, comparison prompts, MCQ distinctions, and quiz questions are original study aids derived from those slides. They are not official College Board questions, and TEA is a writing scaffold rather than an official scoring rule. Locations with only brief slide coverage explicitly say so.

Seven source notes flag questionable claims, inconsistencies, or map-date mismatches. The new Qing slide has a map captioned **circa 1820**; the Mughal map’s title and legend give different first dates. The original wording remains in the library, while the study aids avoid relying on those claims as quiz answers. Ask your teacher about them. No external historical claims were added to silently “correct” the slides.

Map pins represent approximate places or regional anchors. They do not represent empire boundaries, exact capitals in every period, or uninterrupted rule across a filter window. Nearby pins have small offsets and leader lines to keep them selectable. Coastlines are modern navigation context.

All historical images were extracted from your slides. Some are later illustrations or modern photographs; they are not automatically contemporary primary sources. Embedded credits are preserved. The project includes original image files under `assets/slides/` and smaller local display copies under `assets/web/`. Use this as a personal classroom study resource and retain image credits.

Both editions retain the original browser storage key and original entry IDs, so earlier drafts and review records remain accessible on the same website origin. Internal `explain` data/draft keys are retained for compatibility, while the interface labels that field **Evidence**.

## Source decks

| Deck | Slides |
| --- | ---: |
| 1_2.1_-_Developments_in_East_Asia.pptx | 12 |
| 1_2.2_-_Developments_in_Dar_al-Islam.pptx | 10 |
| 1_2.3_-_Developments_in_South_and_Southeast_Asia.pptx | 14 |
| 1_2.4_-_Americas.pptx | 13 |
| 1_2.5_-_State_Building_in_Africa.pptx | 10 |
| 1_2.6_-_Developments_in_Europe.pptx | 8 |
| 1_2.7_-_The_Mongol_Empire.pptx | 8 |
| 3.1_-_Landbased_Empires.pptx | 13 |
| 3.2_-_Empire_Administration.pptx | 11 |
| 3.3_-_Empire_Belief_Systems.pptx | 6 |

## Project files

`index.html` is the shared page template. After editing it, run `python tools/generate_editions.py` to regenerate `classic.html` and `glass.html`. `theme.js` switches editions without resetting study state. `styles.css` retains the original design, `unit3.css` contains shared course additions, and `glass.css` contains scoped glass styles. `ocean-glass.js` and `ocean-glass.css` retain the button optics and restore the static Classic ocean. Deck IDs `d8`, `d9`, and `d10` identify the new Unit 3 sources.


`index.html`, `styles.css`, and `app.js` implement the interface. `data.js` contains curated entries and practice questions. Each question’s first data option is the correct one; the interface randomizes answer order. `sources.js` contains all source slides for direct-file use; `sources.json` is the readable extraction. `land.js` contains bundled map geometry.

To edit content, change `data.js` while retaining the `window.ATLAS_DATA = ...` assignment and valid JSON. Source references use `d1:3` for deck 1, slide 3. Use `sources.json` to verify references before adding new claims. There is no package installation or build process.

## Map attribution

Coastlines: [Natural Earth 1:110m physical land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/), public domain. Bundled geometry comes from the [Natural Earth source repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson). No online map service is called when the atlas runs.
