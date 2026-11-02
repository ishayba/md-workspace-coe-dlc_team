# תוכנית Code Generation — v4.7.0 נגישות וייצוא

## Summary

- Builds: פאנל נגישות, פאנל ייצוא עם Word אמיתי (‏docx), כללי ייצוא, R-06 עד R-10, ורשימת בדיקות ל-QA
- Touches: ‏`a11y.js`, ‏`a11y-ui.js`, ‏`export-core.js`, ‏`export-ui.js` (חדשים), ‏`index.html`, ‏`md-visual-ui.js`, ‏`sw.js`, ‏`scripts/build-dist.js`, ‏`package.json`, ‏`docs/qa-checklist-v4.7.0.html`, ‏`BACKLOG.md`, ‏`test/*`, ‏`e2e/*`
- Tests: כ-145 בדיקות יחידה חדשות ב-9 קבצים, קובץ e2e חדש עם כ-45 בדיקות, ועדכון של 4 קובצי e2e קיימים. הכול בשיטת TDD

## מקורות

- הדרישות: `inception/requirements-analysis/requirements.md` (FR1 עד FR6, NFR1 עד NFR11)
- ‏`construction/functional-design/`: ‏`functional-spec.md` (WF1 עד WF8, SM1 עד SM3, נספח A), ‏`rules.md` (BR1.1 עד BR7.11), ‏`entities.md`, ‏`frontend-components.md`
- ‏`construction/nfr-requirements/`: ביצועים, אבטחה, קנה מידה, אמינות, תצפית, נגישות, טכנולוגיה (NFR1.1 עד NFR11.6)
- ‏`inception/refined-mockups/`: ‏`mockup-visual.html`, ‏`interaction-spec.md`, ‏`design-system-mapping.md`
- יחידה אחת, בלי Units Generation (scope `refactor`). אין סיפורי משתמש, ולכן המעקב הוא לשלבי התוכנית מול FR, ‏BR ו-NFR

## Testing Contract
```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "project",
  "ordering": "for every applicable testable layer, write failing tests first (Red), implement the minimum to pass (Green), then refactor while green.",
  "scope": "refactor",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "- **Methodology**: TDD\n- **Ordering**: for every applicable testable layer, write failing tests first (Red), implement the minimum to pass (Green), then refactor while green."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c693c9f14d67ed62434cb8377249552bb101b2f4a85f34b6f6aa4a61507cf5f3",
  "contract_sha256": "sha256:42ad574aee1c6b3bbcd22b54eeceddf4e8ad833e112b4edd74abf53fe63808ea"
}
```

## שכבות שאפשר לבדוק

| שכבה מהחוזה | כאן | אופן |
|---|---|---|
| Data model / database behavior | ‏A11yPrefs: ניקוי והמרה של ערכים, רמות גודל, ‏`isDefault` | TDD ביחידה (`a11y.js`) |
| Repository / data access | מתאם אחסון עם `localStorage` מוזרק: קריאה, כתיבה, מפתחות ונפילה לזיכרון | TDD ביחידה (`a11y.js`) |
| Business logic | מפרק בלוקים ורצים, ‏LRM, שם קובץ, תאריך, ‏Markdown, ‏XML של docx, ‏ZIP, ‏CRC32, קטעי הקראה, ניגודיות, HTML לצפייה ו-CSP | TDD ביחידה (`export-core.js`, ‏`a11y.js`, ‏`index.html`) |
| API / endpoint | אין. האפליקציה בלי שרת, ו-`server.js` לא משתנה | לא רלוונטי |
| Frontend behavior | אייקונים, פאנלים, פאנל נגישות, הקראה, אזור חי, פאנל ייצוא, הדבקה, Esc, ‏releaseFocus, ‏zoom ו-reflow | TDD ב-e2e (Playwright) ובבדיקות סטטיות ביחידה |

## שלבים

### א. מבנה ורץ בדיקות

- [x] **Step 1** — שלד הפרויקט: ‏`a11y.js` ו-`export-core.js` כ-UMD ריקים (`window.MdA11y`, ‏`window.MdExport`) שמחזירים `{}`, ו-`a11y-ui.js` ו-`export-ui.js` כ-IIFE ריקים. טעינה ב-`index.html` אחרי `md-visual-ui.js`. ‏(BR7.9, NFR11.1)
- [x] **Step 2** — אימות רץ הבדיקות: ‏`node --test test/a11y.test.js` רץ (גם כשהקובץ ריק), וההרצה של `NODE_PATH=… node e2e/v46-visual.e2e.js` הקיים עוברת. הפקודות נרשמות ב-`unit-test-instructions.md`.

### ב. Data model — ‏A11yPrefs (`a11y.js`)

- [x] **Step 3** — Red: ‏`test/a11y.test.js`, בדיקות ל-`normalizePrefs`: ערכים חוקיים, ערך לא חוקי שהופך לברירת מחדל, מעבר מ-`mdw_theme` ישן; ל-`ZOOM_LEVELS`; ל-`nextZoom` (הגדלה, הקטנה, קצוות, איפוס); ל-`isDefault`; ל-`reset`. נרשם פלט הכישלון. ‏(BR2.2, BR2.4, BR2.10, BR1.6, FR2.2, FR2.4)
- [x] **Step 4** — Green: מימוש מינימלי ב-`a11y.js`.
- [x] **Step 5** — Refactor: קבועים וקריאות, כשהבדיקות ירוקות.

### ג. Repository — מתאם אחסון (`a11y.js`)

- [x] **Step 6** — Red: בדיקות ל-`createPrefsStore(storage)`: קריאה ושמירה במפתחות `mdw_theme`, ‏`mdw_a11y_hc`, ‏`mdw_a11y_zoom`; אחסון שזורק ב-`getItem` או ב-`setItem` (‏QuotaExceededError), כשהכתיבה ממשיכה בזיכרון בלי לזרוק; ‏`storage` שהוא `null`. ‏(BR2.12, NFR8.5, FR2.12)
- [x] **Step 7** — Green.
- [x] **Step 8** — Refactor.

### ד. Business logic — נגישות (`a11y.js`)

- [x] **Step 9** — Red: בדיקות ל-`contrast(fg, bg)` (שחור על לבן 21, ‏`#767676` על לבן 4.54, ‏hex קצר); ל-`buildSegments(descriptors)` (כותרת, פסקה, משימה פתוחה וסגורה, טבלה בתבנית "כותרת: ערך", קוד ותרשים שרק מוכרזים, קטע ריק מדולג); ל-`splitForSpeech(text, 200)` (גבול משפט, רווח אחרון, מילה ארוכה מאוד, עברית). ‏(NFR2.1, BR2.6, NFR8.6, FR2.6)
- [x] **Step 10** — Green.
- [x] **Step 11** — Refactor.
- [x] **Step 12** — Red: ‏`test/a11y-contrast.test.js`. הבדיקה קוראת את ערכי הטוקנים מה-CSS ב-`index.html` (`:root`, ‏`[data-theme="dark"]`, ‏`.hc`, ‏`.hc[data-theme="dark"]`), ובודקת את רשימת הזוגות של NFR2.3 מול הספים של NFR2.2. היא נכשלת כי הטוקנים החדשים עוד לא קיימים. ‏(BR7.1, NFR2.2, NFR2.3)
- [x] **Step 13** — Green: הוספת הטוקנים ל-`index.html` לפי `design-system-mapping.md`: ‏`--border-control`, ‏`--focus-ring`, ‏`--focus-ring-fg`, ‏`--highlight-bg`, ‏`--selected-bg`, ‏`--reading-ring`, ‏`--reading-bg`, ‏`--accent-warning-strong`, ‏`--dot-changed`, ‏`--badge-*`, ‏`--border-w` ו-`--focus-w`; עדכון של `--text-muted` (יום ולילה) ושל `--border-strong` (לילה); בלוק `.hc` שמגדיר מחדש טוקנים.
- [x] **Step 14** — Refactor.

### ה. Business logic — ייצוא (`export-core.js`)

- [x] **Step 15** — Red: ‏`test/export-blocks.test.js`. בדיקות ל-`parseBlocks` לכל סוג בלוק (h1 עד h6, ‏p, רשימות `-`, ‏`+`, ‏`*` ו-`1.`, משימות, קינון, טבלה עם יישור ושורות קצרות, קוד עם שפה, תרשים, ציטוט מרובה שורות, ‏hr, תמונה, ‏`div dir`), ול-`parseRuns` (קוד, קישור, מודגש, נטוי, קו חוצה, שילובים, ‏`href` לא בטוח). ‏(WF6, BR3.8)
- [x] **Step 16** — Green.
- [x] **Step 17** — Red: בדיקת התאמה מול `parseMarkdown` (דרך `load-app.js`) על קורפוס: ‏`SAMPLE_MD`, ‏`samples/css-studio-sample.md` ותבניות התוכן. היא משווה את רצף סוגי הבלוקים ואת הטקסט. ‏(WF6 שלב 5, BR3.8)
- [x] **Step 18** — Green: תיקוני פער במפרק עד להתאמה.
- [x] **Step 19** — Refactor: המפרק.
- [x] **Step 20** — Red: ‏`test/export-rules.test.js`. ‏`applyLrm` עם 9 המקרים של נספח A; ‏`hasHebrew`; ‏`fileName` (ניקוי, רווחים, 80 תווים בלי לשבור surrogate, ברירת מחדל, עברית); ‏`asOfDate` (‏`DD.MM.YYYY` ו-`YYYY-MM-DD`); ‏`resolveTitle` (‏`#doc-title`, אחר כך h1, אחר כך `md-workspace`). ‏(BR4.2, BR4.3, BR4.4, BR4.1, FR4.2 עד FR4.4)
- [x] **Step 21** — Green.
- [x] **Step 22** — Red: בדיקות ל-`toMarkdown(blocks, {title, asOf})`: עטיפה ב-`<div dir="rtl" lang="he">`, כותרת ו"נכון ל-", ‏LRM לפי הכלל, קוד ותרשים כמו שהם, כתובות בלי LRM, ו-round-trip של סוגי הבלוקים. ‏(BR3.6, FR3.7, NFR9.4)
- [x] **Step 23** — Green.
- [x] **Step 24** — Refactor: ‏LRM, שם קובץ ו-Markdown.
- [x] **Step 25** — Red: ‏`test/export-zip.test.js`. ‏`crc32("123456789") = 0xCBF43926`; ‏`utf8` עם עברית; ‏`zipStore`: חתימות `PK\x03\x04`, ‏`PK\x01\x02` ו-`PK\x05\x06`, דגל ‎0x0800, ‏CRC וגדלים נכונים, ‏`[Content_Types].xml` ראשון, פלט דטרמיניסטי. בתוך הבדיקה יש קורא ZIP קטן שפותח את הארכיון ומשווה את התוכן. בנוסף, ‏`unzip -t` כשהכלי זמין, ודילוג מתועד כשאינו. ‏(WF7.6, NFR7.7, NFR8.8)
- [x] **Step 26** — Green.
- [x] **Step 27** — Red: ‏`test/export-docx.test.js`, ‏`buildDocx(blocks, {title, asOf})`:
  - חלקים, Content Types ו-rels מלאים, וכל Target קיים (WF7.1).
  - XML מאוזן.
  - ‏`w:sectPr` ב-A4 לאורך.
  - ‏Heading1 עד 3, וממיפוי h4 עד h6 ל-Heading3.
  - ‏`w:bidi` בפסקה עברית, ו-`w:bidi w:val="0"` עם `jc=left` בפסקה באנגלית.
  - פיצול רצים לפי כתב, ו-`w:rtl` עם `w:bCs` ו-`w:iCs` בעברית מודגשת ונטויה.
  - יישור לוגי בארבעת הצירופים.
  - טבלה עם `bidiVisual`, ‏`tblGrid`, ‏`tcW` ו-`tblHeader`, והשלמה של תאים חסרים.
  - ‏`w:num` נפרד לכל רשימה ממוספרת עם `startOverride`, קינון עד 9 רמות, ו-☐/☑.
  - קוד ב-Consolas, LTR ובלי LRM.
  - תרשים עם כותרת ובלוק קוד.
  - תמונה כטקסט וקישור.
  - ‏hyperlink רק ל-http, https ו-mailto, עם 7 מקרים שליליים ו-2 חיוביים.
  - ‏`xml:space="preserve"`, וסדר אלמנטים ב-`pPr`, ‏`rPr` ו-`tblPr`.
  - ‏`xmlEscape` ותווי בקרה.
  - ‏`core.xml` בלי creator, עם title מוגבל ל-255 תווים ובלי `app.xml`.
  - 200 רשימות, 500 קישורים עם rId ייחודיים, ו-64 עמודות שמתמזגות.
  - קלט של 1MB בלי חריגה. ‏(BR3.7, BR3.9, BR3.10, BR3.11, NFR9.1, NFR9.4, NFR9.6, NFR7.6, NFR7.8 עד NFR7.12, FR3.8)
- [x] **Step 28** — Green: ‏`buildDocx` ו-`xmlEscape`.
- [x] **Step 29** — Refactor: פונקציות בנייה קבועות לסדר האלמנטים.
- [x] **Step 30** — Red: ‏`test/export-html.test.js`:
  - ‏`buildCleanHtml` (מחולץ מ-`index.html` דרך `load-app.js`): בלי `<script>` ובלי מאפייני אירוע, לפי הביטוי של NFR9.2 מחוץ ל-`pre` ו-`code`. ה-CSP הוא האלמנט הראשון ב-`head`. ‏`img-src` בלי `http:`. כותרת ו"נכון ל-". ‏`dir="rtl"`.
  - ‏`autoPrint`: סקריפט אחד, וה-SHA-256 של `PRINT_SCRIPT` (מחושב ב-`node:crypto`) שווה ל-`PRINT_SCRIPT_SHA256`. ה-CSP לפני הסקריפט. A4 לאורך.
  - גלופה עוינת עם `@import` ו-`url(javascript:)` לא עוברת.
  - ‏`buildLiveHtml`: בלי `btn-a11y` ו-`btn-export`, עם ראש ותאריך.
  - ‏(BR3.2, BR3.3, BR3.4, NFR9.2, NFR9.3, NFR9.8, FR3.3 עד FR3.5)
- [x] **Step 31** — Green: חילוץ קוד הייצוא הקיים לפונקציות `buildCleanHtml` ו-`buildLiveHtml` בפורמט של `load-app.js`, הוספת CSP, ראש ותאריך, ו-`PRINT_SCRIPT` עם הקבוע שלו.
- [x] **Step 32** — Red: בדיקות ל-`canDownload(env)` עם תלויות מוזרקות (חסר Blob, חסר `createObjectURL`, חסר `download`), ול-`isEmptyDoc`. ‏(NFR8.4, BR4.8)
- [x] **Step 33** — Green.
- [x] **Step 34** — Refactor: ‏`export-core.js` כולו, וכיסוי 90% ב-`--experimental-test-coverage` (NFR11.2).

### ו. Frontend behavior — ממשק (`a11y-ui.js`, ‏`export-ui.js`, ‏`index.html`, ‏`md-visual-ui.js`)

- [x] **Step 35** — Red (סטטי, ביחידה): ‏`test/v47-static.test.js`:
  - ‏`innerHTML` רק בשורות שמסומנות `// innerHTML-allowed:`.
  - אין `eval`, ‏`new Function`, ‏`fetch`, ‏`XMLHttpRequest`, ‏`sendBeacon` או `WebSocket`.
  - אין `console` עם `mdInput.value`.
  - אין hex מחוץ לבלוקי הטוקנים בקבצים החדשים ובכללי ה-CSS החדשים (מסומנים בהערות `/* v4.7 */`).
  - כל `animation` ו-`transition` חדשים בתוך `prefers-reduced-motion: no-preference`.
  - ‏`index.html`: אין `btn-export-*`, ‏`btn-print-doc` ו-`btn-theme-toggle` בסרגל, ויש `btn-a11y` ו-`btn-export`.
  - ‏`<html lang="he" dir="rtl">`.
  - ‏(NFR9.5, NFR9.7, NFR11.5, NFR6.1, NFR5.1, FR3.1, FR2.1)
- [x] **Step 36** — Red (e2e): ‏`e2e/v47-a11y-export.e2e.js`, חלק א, אייקונים ופאנלים (WF1):
  - סדר האייקונים וגלויים בשלוש הפריסות.
  - ‏`aria-*` נכונים.
  - פתיחה ב-Enter וב-Space, ופאנל אחד פתוח בכל רגע.
  - סגירה ב-Esc, בלחיצה בחוץ וב-×, וחזרת פוקוס.
  - חלון מודאלי חוסם פתיחה.
  - נקודת שינוי.
  - ‏(BR1.1 עד BR1.6, FR1)
- [x] **Step 37** — Green: ‏`a11y-ui.js`, רכיב הפאנל המשותף, האייקונים בכותרת והסרת `btn-theme-toggle`. ‏`data-theme` עובר ל-`<html>`, ובראש הדף סקריפט מוקדם שמונע הבהוב (WF2).
- [x] **Step 38** — Red (e2e) חלק ב, פאנל נגישות (WF2, WF3):
  - ערכת צבעים עם radiogroup וחיצים ב-RTL.
  - ‏`mdw_theme` ישן נשמר.
  - מתג ניגודיות עם `aria-checked` ו-`.hc`.
  - חמש רמות, השבתה בקצוות, ‏`--ax-zoom` ו-`body` zoom.
  - איפוס.
  - שמירה בין טעינות.
  - אזור חי עם ההודעות של FR2.11.
  - החלפת העדפה בפחות מ-100ms.
  - "דלג לתוכן" ראשון ב-Tab ומעביר לעורך, או לתצוגה בפריסת תצוגה בלבד.
  - ‏(BR2.1 עד BR2.5, BR2.9 עד BR2.12, NFR7.2, NFR10.3, FR2)
- [x] **Step 39** — Green: פאנל הנגישות, ‏`notify` והאזור החי, ו"דלג לתוכן".
- [x] **Step 40** — Red (e2e) חלק ג, הקראה (WF4). ‏`speechSynthesis` מדומה דרך `addInitScript`:
  - סדר הקטעים, הדגשה וגלילה.
  - פיצול קטע ארוך.
  - השהיה והמשך.
  - גלולת עצירה, וחזרת פוקוס אחרי עצירה ממנה.
  - Esc עוצר.
  - מסמך ריק.
  - בלי קול עברי, ובלי `speechSynthesis` (הכפתור מושבת).
  - ‏(BR2.6 עד BR2.8, NFR8.6, FR2.6 עד FR2.8)
- [x] **Step 41** — Green: ההקראה ב-`a11y-ui.js`.
- [x] **Step 42** — Red (e2e) חלק ד, פאנל ייצוא (WF5):
  - שישה אריחים בסדר, ופאנל שנסגר אחרי בחירה.
  - ‏`aria-busy` נצפה לפני אירוע ההורדה.
  - ייצוא אחד בכל פעם.
  - שמות קבצים.
  - מסמך ריק בכל ששת האריחים: בלי הורדה ובלי `print` (שמיוחס כ-stub).
  - הזרקת שגיאה מחזירה ל-idle ורושמת `console.error('[mdw-export]', …)`.
  - ‏`canDownload` שלילי משבית את האריחים.
  - סנכרון של העורך הוויזואלי לפני ייצוא.
  - פתיחה של ה-docx שהורד בקורא ה-ZIP של הבדיקה.
  - ‏MD עם `<div dir="rtl">`.
  - ‏HTML לצפייה נפתח בלי שגיאות CSP.
  - ייצוא Word בלי רשת (`setOffline`).
  - ביצועים: מסמך הדוגמה בפחות משנייה. מסמך של 5,000 שורות: Word ו-MD בפחות מ-2 שניות, ‏HTML בפחות משנייה, ומשימה ארוכה של פחות משנייה.
  - ‏(BR3.1 עד BR3.6, BR4.1, BR4.5 עד BR4.9, NFR7.1, NFR7.3 עד NFR7.5, NFR8.3, NFR8.7, NFR9.2, NFR11.4, FR3, FR4)
- [x] **Step 43** — Green: ‏`export-ui.js`, האריחים, ‏ExportJob עם yield, ראש ההדפסה (`.print-head`) וכללי `@media print`. ארבעת הכפתורים מוסרים מהסרגל.
- [x] **Step 44** — Red (e2e) חלק ה, עורך ויזואלי (WF8, R-06 עד R-10):
  - ‏`span[style]` שהיה קיים לפני הדבקה נשאר.
  - הדבקה בגוף, בתא ובפריט רשימה, ואחריה Ctrl+Z ו-Ctrl+Shift+Z.
  - ‏Ctrl+B עם `code=KeyB` ו-`key='נ'`.
  - Esc בזמן הרכבה (`isComposing`) לא משחרר.
  - ‏`releaseFocus` מדלג על `visibility:hidden`.
  - סדר העדיפות של Esc: מודאל, פאנל, הקראה, עורך.
  - ‏(BR5.1 עד BR5.5, BR2.13, FR5)
- [x] **Step 45** — Green: שינויים ב-`md-visual-ui.js` (צילום לפני ה-exec, ‏`e.code`, ‏`isComposing`, בדיקת נראות), ומאזין Esc ב-capture ב-`a11y-ui.js`. אם בגוף נוצרים span-ים והביטול נפגע, R-07 נרשם כמגבלה (WF8 שלב 6).
- [x] **Step 46** — Red (e2e) חלק ו, ‏reflow, ‏zoom, מקלדת ופוקוס:
  - ‏150% ב-400px: אין גלילה אופקית ואין פקד חתוך, גם עם כל פאנל פתוח.
  - בשני העורכים, הקלדה ולחיצה ממקמות את הסמן נכון.
  - חלון מודאלי בתוך המסך.
  - ‏`:focus-visible` של 3px לפחות.
  - שטח לחיצה של 32px לפחות.
  - Tab יוצא מכל פאנל.
  - ‏(BR7.2, BR7.3, BR7.11, NFR3.1, NFR4.1 עד NFR4.4, NFR10.4)
- [x] **Step 47** — Green: התאמות CSS. אם בדיקות הסמן נכשלות ב-`zoom`, מעבר לחלופה rem ותיעוד ב-BACKLOG.
- [x] **Step 48** — עדכון ה-e2e הקיימים שמשתמשים בכפתורים שהוסרו: ‏`live-html-roundtrip.e2e.js`, ‏`css-studio.e2e.js`, ‏`visual-editor.e2e.js` ו-`auto-direction.e2e.js`, לפי הצורך. הם פותחים את הפאנל ובוחרים אריח או ערכה, ומה שהם בודקים לא משתנה (NFR10.2).
- [x] **Step 49** — Refactor: ‏`a11y-ui.js` ו-`export-ui.js`. מחרוזות ב-`STR`, ‏`data-testid` לכל פקד חדש. כל ה-e2e ירוקים.

### ז. סביבה, בנייה ותצורה

- [x] **Step 50** — Red: הרחבת `test/service-worker.test.js` ו-`test/version-sync.test.js`: ארבעת הקבצים ב-`ASSETS`, גרסה 4.7.0 בכל המקומות, וגרסת המטמון `v4.7.0-build-…`. ‏(NFR8.1, NFR8.2)
- [x] **Step 51** — Green: ‏`sw.js`, ‏`scripts/build-dist.js` (FILES), ‏`APP_VERSION`, ‏`package.json` (גרסה, ‏script `coverage`, ונוסף `e2e/v47-a11y-export.e2e.js` ל-script `e2e`), וכל מקום ש-`version-sync` בודק.
- [x] **Step 52** — ‏`npm run dist` מצליח, ובדיקה ש-`dist/` כולל את ארבעת הקבצים ולא כולל את `docs/qa-checklist-v4.7.0.html`. ‏(BR6.6, NFR8.1)

### ח. רשימת ה-QA ותיעוד

- [x] **Step 53** — Red: ‏`test/qa-checklist.test.js`:
  - הקובץ קיים, עם `dir="rtl" lang="he"`.
  - תווית לכל פקד.
  - ‏`data-req` מכסה את FR1 עד FR6 ואת NFR1 עד NFR4, כולל ששת האריחים, ‏R-06 עד R-10 ו-NVDA/VoiceOver.
  - מחלקה ירוקה עם ✓ לסטטוס תקין.
  - מפתח `mdw_qa_v470`.
  - כפתור "שמור עותק".
  - הודעה כשאין מקום באחסון.
  - אין `fetch`, ויש ניגודיות AA (בחישוב של `MdA11y.contrast` על הטוקנים של הקובץ).
  - ‏(BR6.1 עד BR6.5, NFR1.3, NFR8.5, FR6)
- [x] **Step 54** — Green: ‏`docs/qa-checklist-v4.7.0.html`, קובץ עצמאי עם סקריפט פנימי לשמירה אוטומטית ול"שמור עותק". המצב המוטבע גובר רק אם הוא חדש יותר (BR6.5).
- [x] **Step 55** — ‏e2e לרשימת ה-QA (בתוך `v47-a11y-export.e2e.js`): סימון, טעינה מחדש ששומרת את המצב, ו"שמור עותק" שמוריד קובץ שבו המצב נטען.
- [x] **Step 56** — תיעוד: ‏`BACKLOG.md`:
  - סעיף 4 מסומן כהושלם.
  - מגבלות ידועות: תרשימים כקוד ב-Word, תמונות כקישור, עוגנים ונתיבים יחסיים כטקסט, סקירת מומחה, Firefox ו-Safari, ו-R-07 אם רלוונטי.
  - ‏`README.md`: פסקה קצרה על הפאנלים.
  - ‏`docs/ui-cross-cutting-guidelines.md` לא משתנה.
- [x] **Step 57** — הרצה מלאה: ‏`npm test` (כל הבדיקות, כולל 229 הקיימות), ‏`npm run coverage` (90% לשני המודולים), וכל ה-e2e (`npm run e2e` עם `NODE_PATH`). כולם ירוקים. ‏(NFR10.1, NFR11.2)

## מעקב: שלב מול דרישה

| שלבים | FR | BR | NFR |
|---|---|---|---|
| 3 עד 8 | FR2.2, FR2.4, FR2.10, FR2.12 | BR2.2, BR2.4, BR2.10, BR2.12, BR1.6 | NFR8.5 |
| 9 עד 14 | FR2.6, FR2.3 | BR2.6, BR7.1 | NFR2.1 עד NFR2.3, NFR8.6 |
| 15 עד 24 | FR3.7, FR3.9, FR4.1 עד FR4.4 | BR3.6, BR3.8, BR4.1 עד BR4.4 | NFR9.4 |
| 25 עד 29 | FR3.8 | BR3.7, BR3.9 עד BR3.11 | NFR7.6 עד NFR7.12, NFR8.8, NFR9.1, NFR9.6 |
| 30 עד 34 | FR3.3 עד FR3.5, FR4.8 | BR3.2 עד BR3.4, BR4.8 | NFR8.4, NFR9.2, NFR9.3, NFR9.8, NFR11.2 |
| 35 | FR2.1, FR3.1 | BR7.4, BR7.5 | NFR5.1, NFR6.1, NFR9.5, NFR9.7, NFR11.5 |
| 36, 37 | FR1 | BR1.1 עד BR1.6 | NFR4.1 |
| 38, 39 | FR2.1 עד FR2.5, FR2.9 עד FR2.12 | BR2.1 עד BR2.5, BR2.9 עד BR2.12 | NFR7.2, NFR10.3 |
| 40, 41 | FR2.6 עד FR2.8 | BR2.6 עד BR2.8 | NFR8.6 |
| 42, 43 | FR3, FR4 | BR3.1 עד BR3.6, BR4.1, BR4.5 עד BR4.9 | NFR7.1, NFR7.3 עד NFR7.5, NFR8.3, NFR8.7, NFR11.3, NFR11.4, NFR11.6 |
| 44, 45 | FR5 | BR5.1 עד BR5.5, BR2.13 | — |
| 46, 47 | FR2.4 | BR7.2, BR7.3, BR7.11 | NFR3.1, NFR4.1 עד NFR4.4, NFR10.4 |
| 48, 49 | FR3.1 | BR7.8 | NFR10.2 |
| 50 עד 52 | — | BR6.6, BR7.7 | NFR8.1, NFR8.2 |
| 53 עד 55 | FR6 | BR6.1 עד BR6.5 | NFR1.2, NFR1.3, NFR8.5 |
| 56, 57 | — | BR7.8, BR7.10 | NFR1.1, NFR1.4, NFR10.1, NFR11.2 |
