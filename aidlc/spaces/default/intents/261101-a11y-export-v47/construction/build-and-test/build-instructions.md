# הוראות בנייה — v4.7.0

## מקורות

- `construction/code-generation/code-generation-plan.md` (code-generation-plan)
- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions)
- `construction/code-generation/code-summary.md` (code-summary)
- `package.json`, `scripts/build-dist.js`, `sw.js`

## תלויות

- **אין תלויות ריצה או בנייה בפרויקט** (zero-deps). לא מריצים `npm install`.
- **Node.js 20 ומעלה.** הבנייה האחרונה רצה על v24.15.0.
- **לבדיקות e2e בלבד:** Playwright 1.64.1, מותקן מחוץ לפרויקט בתיקייה `$HOME/.local/share/mdw-e2e`. ההתקנה (פעם אחת):

```bash
mkdir -p "$HOME/.local/share/mdw-e2e" && cd "$HOME/.local/share/mdw-e2e" && npm install playwright@1.64.1 && npx playwright install chromium
```

## סביבה

- אין משתני סביבה לאפליקציה.
- ל-e2e מגדירים `NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules"`.
- `server.js` מקומי. קובצי ה-e2e מפעילים אותו בעצמם דרך `test-support/server-utils.js`.

## בנייה

```bash
npm run dist
```

הפקודה יוצרת את `dist/`: 20 קבצים לריצה, כולל `a11y.js`, `a11y-ui.js`, `export-core.js` ו-`export-ui.js`. היא נכשלת אם `sw.js` מטמין קובץ שלא נמצא ברשימה. `docs/` לא נכלל.

## אימות הבנייה

1. `ls dist`: ארבעת הקבצים החדשים קיימים, ואין `dist/docs`.
2. `node dist/server.js`, ואז פתיחת הכתובת בדפדפן. בכותרת מופיעים האייקונים "נגישות" ו"ייצוא".
3. ב-DevTools, בלשונית Application, בחלק Cache Storage: מופיע `md-workspace-offline-v4.7.0-build-20261102-01`.

## תקלות נפוצות

| תקלה | פתרון |
|---|---|
| `ERROR: sw.js precaches files that are not in the dist list` | להוסיף את הקובץ ל-`FILES` ב-`scripts/build-dist.js` |
| גרסה ישנה נטענת בדפדפן | ה-service worker מחזיק מטמון ישן. רענון קשיח, או Unregister ב-DevTools |
| `Cannot find module 'playwright'` | חסר `NODE_PATH`, או ש-Playwright לא מותקן בתיקייה החיצונית |
| `START.command` לא נפתח ב-macOS | לבדוק את הרשאת ההרצה: `chmod +x START.command` |
