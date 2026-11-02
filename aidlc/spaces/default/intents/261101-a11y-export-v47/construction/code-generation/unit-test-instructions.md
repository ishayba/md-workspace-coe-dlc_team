# הוראות בדיקה — v4.7.0 נגישות וייצוא

## מקורות

- `code-generation-plan.md` (Testing Contract: ‏TDD, אסטרטגיה standard)
- ‏`construction/nfr-requirements/observability-requirements.md` (NFR11.1 עד NFR11.6) ו-`tech-stack-decisions.md`

## תשתית

- **יחידה:** ‏`node --test` המובנה (Node 20 ומעלה), בלי תלויות. כלי עזר: ‏`test-support/load-app.js` (מחלץ פונקציות מ-`index.html`), ‏`node:crypto` ו-`node:zlib` (לא בשימוש, ‏ZIP הוא STORE).
- **e2e:** Playwright 1.64.1 מותקן ב-`$HOME/.local/share/mdw-e2e`, ולא בפרויקט. ההרצה עם `NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules"`. קובצי ה-e2e מפעילים את `server.js` בעצמם, דרך `test-support/server-utils.js`.
- **כיסוי:** ‏`node --test --experimental-test-coverage`.

## פקודות של היחידה הזו (מוגבלות לקבצים של הגרסה)

בדיקות יחידה חדשות:

```bash
node --test test/a11y.test.js test/a11y-contrast.test.js test/export-blocks.test.js test/export-rules.test.js test/export-zip.test.js test/export-docx.test.js test/export-html.test.js test/v47-static.test.js test/qa-checklist.test.js
```

בדיקות יחידה קיימות שהגרסה מרחיבה:

```bash
node --test test/service-worker.test.js test/version-sync.test.js
```

כיסוי לשני המודולים הטהורים (יעד: 90% שורות לכל אחד, NFR11.2):

```bash
node --test --experimental-test-coverage --test-coverage-include=a11y.js --test-coverage-include=export-core.js --test-coverage-lines=90 test/a11y.test.js test/a11y-contrast.test.js test/export-blocks.test.js test/export-rules.test.js test/export-zip.test.js test/export-docx.test.js test/export-html.test.js
```

(‏`export-html.test.js` נוסף ב-Step 34, כי הבדיקות של `canDownload` ו-`isEmptyDoc` יושבות בו. בלעדיו הכיסוי של `export-core.js` יורד ל-98.41% ועדיין מעל הסף.)

אם גרסת Node לא תומכת ב-`--test-coverage-include` או ב-`--test-coverage-lines`, מריצים בלי הדגלים ובודקים בפלט את השורות של `a11y.js` ו-`export-core.js`. את הסף לא מורידים.

e2e חדש:

```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v47-a11y-export.e2e.js
```

e2e קיימים שמתעדכנים (Step 48):

```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/live-html-roundtrip.e2e.js
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/css-studio.e2e.js
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/visual-editor.e2e.js
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/auto-direction.e2e.js
```

הפקודה הראשונה רצה כבר ב-Step 2, לפני מחזור ה-Red הראשון. בשלב הזה הקבצים ריקים, ו-`node --test` מדווח 0 בדיקות בלי שגיאה.

## היקף לפי רכיב (אסטרטגיה standard: 5 עד 8 בדיקות לרכיב לפחות)

| קובץ בדיקה | רכיב | בערך |
|---|---|---|
| `test/a11y.test.js` | ‏A11yPrefs, מתאם אחסון, ‏`buildSegments`, ‏`splitForSpeech`, ‏`contrast` | 28 |
| `test/a11y-contrast.test.js` | זוגות טוקנים × 4 מצבים | 12 |
| `test/export-blocks.test.js` | ‏`parseBlocks`, ‏`parseRuns`, התאמה לקורפוס | 22 |
| `test/export-rules.test.js` | ‏LRM (נספח A), שם קובץ, תאריך, כותרת, ‏`toMarkdown` | 20 |
| `test/export-zip.test.js` | ‏CRC32, ‏UTF-8, ‏`zipStore` וקורא ZIP | 8 |
| `test/export-docx.test.js` | ‏`buildDocx` ו-`xmlEscape` | 26 |
| `test/export-html.test.js` | ‏`buildCleanHtml`, ‏`autoPrint`, ‏`buildLiveHtml`, ‏`canDownload`, ‏`isEmptyDoc` | 12 |
| `test/v47-static.test.js` | בדיקות סטטיות של אבטחה, טוקנים ותנועה | 9 |
| `test/qa-checklist.test.js` | רשימת ה-QA | 8 |
| `e2e/v47-a11y-export.e2e.js` | WF1 עד WF8, ‏reflow, ביצועים ורשימת QA | כ-45 |

בכל רכיב: מסלול תקין, ולפחות שני מקרי קצה או שגיאה (`phases/construction.md`).

## הדמיות ותלויות מוזרקות

- **אחסון:** אובייקט עם `getItem`/`setItem` שזורק כשצריך. בלי `localStorage` אמיתי ביחידה.
- **הורדה:** ‏`canDownload({Blob, URL, anchorProto})` עם תלויות מוזרקות.
- **הקראה ב-e2e:** ‏`page.addInitScript` מחליף את `speechSynthesis` במדומה ש-`speak` שלו קורא ל-`onend` אחרי 10ms, ורושם את הטקסטים. תרחיש נוסף: ‏`delete window.speechSynthesis`.
- **הדפסה ב-e2e:** ‏`window.print` מוחלף ב-stub שסופר קריאות.
- **שגיאת ייצוא:** ‏hook לבדיקה בלבד, `window.__mdwTestFailNextExport = true`, ש-`export-ui.js` בודק. הוא מסומן בהערה ולא משפיע על משתמש רגיל.
- **הורדה ב-e2e:** ‏`page.waitForEvent('download')` ואז `download.path()`, וקריאה עם קורא ה-ZIP של הבדיקה.

## נתוני בדיקה

- מסמכים קטנים בתוך הבדיקות.
- קורפוס ההתאמה: ‏`SAMPLE_MD` (מ-`css-studio.js`), ‏`samples/css-studio-sample.md` ותבניות התוכן מ-`index.html`.
- מסמך של 5,000 שורות שנוצר בבדיקה מתבנית מעורבת (כותרת, פסקה עם "3.5 Code Generation", רשימה, טבלה וקוד), חוזרת עד 5,000 שורות.
- קלט של 1MB נוצר בבדיקה, ולא נשמר בפרויקט.

## כללי TDD

- ב-Red כל בדיקה חדשה רצה ונכשלת, והפלט נרשם ביומן השלב (`memory.md`) עם הפקודה.
- ב-Green מממשים רק מה שנדרש כדי שהבדיקה תעבור.
- ב-Refactor הבדיקות נשארות ירוקות.
- אסור להחליש בדיקה, להוריד סף (90%, ‏4.5:1, ‏7:1, יעדי זמן) או לדלג על בדיקה כדי שתעבור. פער מדווח ולא מוסתר.
