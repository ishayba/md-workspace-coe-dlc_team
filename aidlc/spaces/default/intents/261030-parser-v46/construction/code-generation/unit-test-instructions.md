# הוראות בדיקות יחידה — v4.6.0 הרחבת ה-parser

## מסגרת ותצורה

- מריץ הבדיקות: `node --test`, המובנה ב-Node.js 18 ומעלה. אין תלויות ואין קובץ תצורה. `package.json` מגדיר `"test": "node --test"`.
- סגנון: `node:test` ו-`node:assert/strict`, כמו בבדיקות הקיימות.
- הבדיקות טוענות את `parseMarkdown` מ-`index.html` דרך `loadParser()` ב-`test-support/load-app.js`, ואת הפונקציות `detectTextDirection` ושות' דרך `loadFunctions(names)`. את `md-visual.js` ואת `css-studio.js` טוענים עם `require`.
- מסירים את הקרדיט התחתון בהשוואות: `parseMarkdown(md).replace(/<div class="mdw-attribution-footer">[\s\S]*$/, '').trim()`.

## הרצת הבדיקות של העבודה הזו

הפקודה הזו מאומתת כבר בשלב 2, לפני שלב ה-Red הראשון. היא מריצה רק את קבצי הבדיקה שהעבודה הזו יוצרת או משנה:

```bash
node --test test/parser-v46-blocks.test.js test/parser-v46-inline.test.js test/v46-direction.test.js test/v46-export-contract.test.js test/md-visual.test.js test/css-studio.test.js test/visual-contract.test.js
```

לפי תכונה, בשלבי Red ו-Green:

| תכונה | פקודה |
|---|---|
| קו מפריד, תבליטים, משימות, קינון, ציטוט, יישור | `node --test test/parser-v46-blocks.test.js test/md-visual.test.js` |
| קו חוצה, קישורים, תמונות | `node --test test/parser-v46-inline.test.js test/md-visual.test.js test/parser-div-dir.test.js` |
| RTL | `node --test test/v46-direction.test.js` |
| קטלוג ומסמך דוגמה | `node --test test/css-studio.test.js test/md-visual.test.js` |
| ייצוא וסרגל | `node --test test/v46-export-contract.test.js test/visual-contract.test.js` |
| גרסה | `node --test test/version-sync.test.js test/service-worker.test.js` |

כדי להריץ בדיקה אחת לפי שם: `node --test --test-name-pattern="<שם הבדיקה>" test/parser-v46-blocks.test.js`

בשלב Build and Test רצה כל הסוויטה, כדי לוודא שהבדיקות הקיימות נשארו ירוקות.

## TDD

- **Red:** כותבים את הבדיקות, מריצים את פקודת התכונה, ומעתיקים לסיכום הקוד את שורות ה-`not ok` מהפלט.
- **Green:** מממשים רק מה שנדרש כדי שהבדיקות יעברו, ומריצים שוב.
- **Refactor:** משפרים את הקוד בלי לשבור, ומריצים שוב.

## כיסוי צפוי

- אסטרטגיית Minimal: בדיקה אחת לפחות לכל דרישה. יש תשע תכונות, קריטריון RTL ורגרסיית אבטחה, כ-45 בדיקות בסך הכול. זה יותר מטווח ה-5–15 של Minimal, כי Q12 דורשת בדיקת RTL לכל תכונה, וכל תכונה צריכה גם בדיקת parser וגם בדיקת ממיר.
- רגרסיה ממוקדת (רצפת `bugfix`): הבדיקות שדוחות כתובות `javascript:`, `data:`, `vbscript:` ו-`//` ב-`parser-v46-inline.test.js`.
- round-trip: כל ערך חדש בקורפוס של `md-visual.test.js` עובר את בדיקת היציבות לכל ערך, ואת בדיקת 300 המסמכים האקראיים.
- אין רף כיסוי שורות, כי ל-`bugfix` אין רצפת כיסוי.

## Mocking ו-stubbing

- אין צורך ב-mock. `parseMarkdown` ו-`md-visual.js` הם קוד טהור, בלי DOM.
- `applyAutoDirection` דורש DOM, ולכן בדיקת ה-RTL קוראת את הסלקטור שלו מ-`index.html` כטקסט, ומפעילה את `detectTextDirection` ישירות.
- את `convertChild` בודקים כחוזה מבני על הקוד שחולץ מ-`index.html`, ובנוסף מריצים `node --check` על הסקריפט המיוצא. ההתנהגות בדפדפן נבדקת ב-`e2e/live-html-roundtrip.e2e.js`, וזה לא חלק מ-`node --test`.

## נתוני בדיקה

- כל הנתונים הם מחרוזות Markdown ו-HTML שמוגדרות בתוך הבדיקות.
- כל תכונה נבדקת לפחות פעם אחת עם טקסט עברי.
- התמונה במסמך הדוגמה היא `icon.svg`, שכבר קיים בפרויקט, כדי לא להוסיף קבצים.

## Loop-back 1 — תיקון העורך הוויזואלי (שלבים 42–45)

פקודת שלבי ה-Red וה-Green של קיצורי המקלדת וההדבקה:

```bash
node --test test/visual-contract.test.js
```

פקודת האימות בדפדפן (שלב 45). היא פועלת רק כש-Playwright מותקן לפי `build-and-test/build-instructions.md`:

```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/visual-editor.e2e.js
```

- בדיקות החוזה החדשות קוראות את `md-visual-ui.js` כטקסט, כמו הבדיקות הקיימות ב-`test/visual-contract.test.js`. אין צורך ב-DOM.
- את ההתנהגות בפועל מאמתים בשתי בדיקות ה-e2e שנכשלו קודם. אסור לשנות אותן.

## Revision 1 — נגישות (שלבים 46–50)

פקודת שלבי ה-Red וה-Green:

```bash
node --test test/visual-contract.test.js test/parser-v46-blocks.test.js
```

- בדיקות החוזה קוראות את `index.html` ואת `md-visual-ui.js` כטקסט. בדיקות ה-parser מאמתות את ה-`aria-label` של תיבת הסימון בפלט של `parseMarkdown()`.
- יש לוודא שה-round-trip לא משתנה: `node --test test/md-visual.test.js`.
- בשלב 48 מריצים בנוסף את כל חמשת קובצי ה-e2e, כל אחד בנפרד, עם `NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules"`.
- מגבלה: הבדיקות האלה מאמתות שהתוויות ושחרור המקלדת קיימים, אבל לא מאמתות עמידה מלאה ב-WCAG או בת״י 5568. לזה דרושה בדיקה ידנית עם קורא מסך, כמו NVDA או VoiceOver.
