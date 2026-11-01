# הוראות בדיקות אבטחה — v4.6.0

אסטרטגיית הבדיקות היא Minimal, אבל רצפת ה-`bugfix` דורשת רגרסיה ממוקדת. קישורים ותמונות מכניסים כתובות מהמשתמש ל-HTML, ולכן יש כאן בדיקות אבטחה (תקיפת XSS דרך כתובת).

## Framework Setup

- `node --test` (בדיקות יחידה) ו-Playwright (דפדפן), לפי `build-instructions.md`.

## How to Run

```bash
node --test test/parser-v46-inline.test.js test/parser-div-dir.test.js
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v46-visual.e2e.js
```

## What Is Checked

| בדיקה | איפה |
|---|---|
| `javascript:`, `JaVaScRiPt:`, `data:`, `vbscript:`, `file:` ו-`//host` לא מייצרים `<a>` או `<img>` | `test/parser-v46-inline.test.js` |
| אין מאפייני `on*=` בפלט | `test/parser-v46-inline.test.js` |
| HTML גולמי ממשיך לעבור escape (בדיקת האבטחה הקיימת) | `test/parser-div-dir.test.js` |
| הממיר לא מפיק קישור לכתובת אסורה | `test/md-visual.test.js` |
| כפתור הקישור בעורך דוחה `javascript:`, וכפתור התמונה דוחה `data:` | `e2e/v46-visual.e2e.js`, סעיפים 4 ו-5 |
| שלושת העותקים של כלל הכתובות (parser, ייצוא, ממיר) מתנהגים אותו דבר | `test/v46-export-contract.test.js` |

## Coverage Targets

- כל scheme שאינו `http`, `https`, `mailto` או נתיב יחסי נדחה בכל אחת מנקודות הכניסה: parser, ממיר, ייצוא וכפתורי העורך.

## Test Data

- מחרוזות תקיפה שמוגדרות בתוך הבדיקות. אין גישה לרשת.
