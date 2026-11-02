# הוראות בדיקות אבטחה — v4.7.0

## מקורות

- `construction/nfr-requirements/security-requirements.md` (T1 עד T7, NFR9.1 עד NFR9.9)
- `construction/code-generation/code-generation-plan.md` (code-generation-plan): שלבים 27, 30 ו-35
- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions), `construction/code-generation/code-summary.md` (code-summary)

## הרצה

```bash
node --test test/export-docx.test.js test/export-html.test.js test/v47-static.test.js
```

ובנוסף, בדיקה בדפדפן שקובץ ה-HTML לצפייה בלבד נפתח בלי הפרות CSP (חלק d):

```bash
PARTS=d NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v47-a11y-export.e2e.js
```

## מה נבדק

| איום | בדיקה |
|---|---|
| T1 הזרקת סקריפט | אין `<script>` ואין מאפייני אירוע ב-HTML לצפייה. ה-CSP הוא האלמנט הראשון. כותרת עוינת לא סוגרת את הסקריפט ב-HTML החי |
| T2 הזרקת XML | `xmlEscape` ותווי בקרה. ה-XML נשאר מאוזן |
| T3 קישור עוין | 7 קישורים שליליים (`javascript:`, `data:`, `file:` ועוד) לא הופכים ל-Target. 2 קישורים חיוביים כן |
| T4 מטא-דאטה | `core.xml` עם creator ריק, בלי `app.xml` |
| T5 דליפה | אין `fetch`, `eval` או `sendBeacon`, ואין `console` עם תוכן המסמך |
| T6 CSS עוין | `@import` ו-`url(javascript:)` חסומים |
| T7 תמונות | ב-`img-src` אין `http:` |
| NFR9.3 | `PRINT_SCRIPT_SHA256` מחושב מחדש ב-`node:crypto` ומושווה לקבוע |

## מחוץ להיקף

DAST מול שרת, כי אין שרת חי. גם סריקת תלויות לא רלוונטית, כי אין תלויות.
