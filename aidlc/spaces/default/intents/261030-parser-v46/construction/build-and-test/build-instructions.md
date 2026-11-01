# הוראות בנייה — v4.6.0

מבוסס על `construction/code-generation/code-summary.md` ועל `construction/code-generation/unit-test-instructions.md`.

## Dependencies

- אין תלויות ריצה ואין תלויות פיתוח ב-`package.json`. אין `npm install` לפרויקט עצמו.
- נדרש Node.js 18 ומעלה (`"engines": { "node": ">=18" }`).
- **לבדיקות דפדפן בלבד (אופציונלי):** Playwright 1.64.1 ו-Chromium, מותקנים מחוץ לפרויקט:
  ```bash
  npm i --prefix "$HOME/.local/share/mdw-e2e" --no-save playwright@1.64.1
  "$HOME/.local/share/mdw-e2e/node_modules/.bin/playwright" install chromium
  ```
  התקנה גלובלית (`npm i -g`) נכשלה בגלל הרשאות ב-`/usr/local/lib`, ולכן ההתקנה נעשתה בתיקיית המשתמש. `package.json` לא משתנה.

## Environment Setup

- אין משתני סביבה חובה. `PORT` אופציונלי לשרת המקומי (ברירת המחדל 8080).
- לבדיקות הדפדפן: `NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules"`.

## Build Commands

הפרויקט הוא HTML ו-JavaScript בלי שלב קומפילציה או bundling. "הבנייה" היא בדיקת תחביר של כל הסקריפטים:

```bash
node --check md-visual.js && node --check md-visual-ui.js && node --check css-studio.js && node --check server.js && node --check sw.js
```

הסקריפט שבתוך `index.html` נבדק בבדיקות היחידה: `loadParser()` מריץ את `parseMarkdown`, ו-`test/v46-export-contract.test.js` מקמפל את בלוק הייצוא.

## Build Verification

- בדיקת התחביר עברה (`build-ok`).
- הפעלה מקומית: `node server.js`, ואז לפתוח `http://localhost:8080`.

## Troubleshooting

- `EACCES` בהתקנת Playwright גלובלית: להתקין עם `--prefix` לתיקיית המשתמש, כמו למעלה.
- `Playwright is not installed`: חסר `NODE_PATH`, או ש-Playwright לא הותקן.
