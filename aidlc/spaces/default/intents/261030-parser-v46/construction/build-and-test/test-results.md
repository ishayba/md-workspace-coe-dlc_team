# תוצאות בנייה ובדיקות — v4.6.0

הרצה אחרונה: 2026-11-01T20:03:16Z (אחרי Loop-back 1 ו-Revision 1). סביבה: macOS (arm64), Node.js 18 ומעלה, Chromium 156.0.8078.4 דרך Playwright 1.64.1, headless.

מבוסס על `construction/code-generation/code-generation-plan.md`, `construction/code-generation/unit-test-instructions.md` ו-`construction/code-generation/code-summary.md`.

## Build Status

**הצלחה.** `node --check` עבר על `md-visual.js`, `md-visual-ui.js`, `css-studio.js`, `server.js` ו-`sw.js` (פלט: `build-ok`).

## Unit Test Results

| פקודה | סך הכול | עברו | נכשלו | דולגו |
|---|---|---|---|---|
| `node --test test/parser-v46-blocks.test.js test/parser-v46-inline.test.js test/v46-direction.test.js test/v46-export-contract.test.js test/md-visual.test.js test/css-studio.test.js test/visual-contract.test.js` (מתוך unit-test-instructions) | 165 | 165 | 0 | 0 |
| `npm test` (כל הסוויטה) | 229 | 229 | 0 | 0 |

לפני הגרסה היו 131 בדיקות, וכולן עדיין עוברות.

## E2E (Browser) Test Results

פקודה: `NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" npm run e2e`. הפקודה הסתיימה ב-exit 0, כלומר כל השרשרת ירוקה.

| קובץ | עברו | נכשלו | הערה |
|---|---|---|---|
| `e2e/css-studio.e2e.js` | 42 | 0 | |
| `e2e/live-html-roundtrip.e2e.js` | OK | 0 | `ROUNDTRIP OK` |
| `e2e/auto-direction.e2e.js` | 25 | 0 | |
| `e2e/visual-editor.e2e.js` | 69 | 0 | שתי הבדיקות שנכשלו בהרצה הראשונה (Ctrl+B והדבקה) עוברות אחרי Loop-back 1. הקובץ לא שונה |
| `e2e/v46-visual.e2e.js` | 38 | 0 | כל ההתנהגות החדשה של v4.6.0, כולל שחרור המקלדת עם `Escape` (סעיף 8b) |

## Failure Details

אין כשלים בהרצה הזו.

בהרצה הראשונה (2026-10-31) נכשלו שתי בדיקות ב-`e2e/visual-editor.e2e.js`. האבחון והתיקון מתועדים ב-`## Loop-Back Log` למטה:
- **"Ctrl+B toggles it off again":** העורך נשען על קיצור המקלדת של הדפדפן, והוא לא פועל ב-headless על macOS. התיקון: מטפל `keydown` משלנו ל-Cmd/Ctrl+B ול-Cmd/Ctrl+I.
- **"only the plain-text flavour is inserted":** הדפדפן עטף טקסט מודבק ב-`<span style>`. התיקון: `unwrapPastedSpans()` אחרי ההדבקה.

## Coverage Report

ל-`node --test` אין דוח כיסוי בתצורה הזו, ובתוכנית לא הוגדר רף כיסוי (ל-`bugfix` אין רצפת כיסוי).

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-SUITE | Testing Contract, scope_floor | הסוויטה הקיימת ירוקה | 229/229 | `npm test` | build-and-test | Met |
| TC-REQ | Testing Contract, strategy_volume | בדיקה אחת לפחות לכל דרישה | SC-1 עד SC-9 ו-SC-RTL מכוסים | `cross-unit-traceability.md` | build-and-test | Met |
| TC-COMP | Testing Contract, strategy_volume | בדיקת happy-path לכל רכיב | parser, ממיר, קטלוג, ייצוא וסרגל מכוסים | 165/165 בפקודת unit-test-instructions | build-and-test | Met |
| TC-REGR | Testing Contract, scope_floor | רגרסיה ממוקדת (XSS דרך כתובת) | כתובות אסורות נדחות בכל נקודות הכניסה | `security-test-instructions.md`, `e2e/v46-visual.e2e.js` סעיפים 4–5 | build-and-test | Met |
| D-13 | decision-log, RTL | בדיקת RTL עם עברית לכל תכונה | יחידה ודפדפן עוברים | `test/v46-direction.test.js`, `e2e/v46-visual.e2e.js` סעיף 2 | build-and-test | Met |
| R-01 | סקירת code-generation | התנהגות v4.6.0 נבדקת בדפדפן אמיתי | 38/38 | `e2e/v46-visual.e2e.js` | build-and-test | Met |
| E2E-SUITE | `npm run e2e` | כל בדיקות הדפדפן הקיימות עוברות | כל חמשת הקבצים ירוקים, exit 0 | למעלה | build-and-test | Met |
| A11Y-V46 | בקשת המשתמש (Revision 1), `docs/ui-cross-cutting-guidelines.md` | `aria-label` בעברית לכפתורים החדשים, תווית מצב לתיבות המשימה, ו-`Escape` שמשחרר את המקלדת | קיימים ונבדקו | `test/visual-contract.test.js`, `test/parser-v46-blocks.test.js`, `e2e/v46-visual.e2e.js` סעיף 8b | build-and-test | Met |

היעד A11Y-V46 מאמת שהתוויות ושחרור המקלדת קיימים. הוא לא מאמת עמידה מלאה ב-WCAG 2.1 AA או בת״י 5568. לזה דרושות בדיקה ידנית עם קורא מסך (NVDA או VoiceOver) וסקירה של מומחה נגישות, והן מתוכננות ל-v4.7.0 (`BACKLOG.md` סעיף 4).

## Loop-Back Log

### Loop-back 1 — 2026-11-01T18:54:18Z

- **Diagnosis:** היעד E2E-SUITE הוא Not Met. שתי בדיקות ב-`e2e/visual-editor.e2e.js` נכשלות ב-Chromium 156: (1) "Ctrl+B toggles it off again", כי העורך נשען על קיצור המקלדת המובנה של הדפדפן, והוא לא פועל ב-headless על macOS; (2) "only the plain-text flavour is inserted", כי הדפדפן עוטף טקסט מודבק ב-`<span style="font-family:...">`. שני הכשלים קיימים גם בגרסה הקודמת (db998b7), ולא נגרמו ב-v4.6.0. ה-Markdown תקין בשני המקרים.
- **Root-cause stage:** code-generation, בקוד העורך הוויזואלי (`md-visual-ui.js`) מ-v4.5.0. הסיבה לא קשורה ל-Unit, כי העבודה בלי Units.
- **Planned fix:** (1) מטפל `keydown` משלנו ל-Cmd/Ctrl+B ול-Cmd/Ctrl+I שמפעיל את הפקודה, כך שהקיצור לא תלוי בדפדפן או במערכת ההפעלה; (2) בהדבקה, להכניס טקסט פשוט כצמתי טקסט ופסקאות בלי סגנונות שהדפדפן מוסיף, או להסיר `span` עם `style` אחרי ההכנסה. בדיקות יחידה לחוזה, ו-`npm run e2e` מלא.
- **Estimated impact:** מאמץ: בערך 20–30 שורות ב-`md-visual-ui.js` ו-2–3 בדיקות. עלות כספית: אין, כל הכלים כבר מותקנים. סיכון: נמוך. המגע הוא בקיצורי מקלדת ובהדבקה של העורך הוויזואלי, ומריצים שוב את כל חמשת קובצי ה-e2e.
