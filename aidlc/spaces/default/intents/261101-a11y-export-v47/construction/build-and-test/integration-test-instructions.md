# הוראות בדיקות אינטגרציה ו-e2e — v4.7.0

## מקורות

- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions)
- `construction/code-generation/code-generation-plan.md` (code-generation-plan): שלבים 36 עד 49 ו-55
- `construction/code-generation/code-summary.md` (code-summary)

## גבולות שנבדקים

| גבול | קובץ |
|---|---|
| `a11y.js` ← `a11y-ui.js` ← DOM: העדפות, פאנלים, הקראה, אזור חי | `e2e/v47-a11y-export.e2e.js`, חלקים a, b, c, f |
| `export-core.js` ← `export-ui.js` ← הורדה: ששת האריחים, docx אמיתי שנפתח בקורא ZIP | חלק d |
| `md-visual-ui.js` ← עורך ויזואלי: R-06 עד R-10 וסדר ה-Esc | חלק e |
| רשימת QA ← `localStorage` ← "שמור עותק" | חלק g |
| ייצוא HTML חי ← פתיחה מחדש ← Markdown | `e2e/live-html-roundtrip.e2e.js` |
| התנהגויות קיימות אחרי השינוי: Studio, כיוון אוטומטי, עורך ויזואלי, v4.6 | `css-studio`, `auto-direction`, `visual-editor`, `v46-visual` |

## הרצה

כל הקבצים, אחד אחרי השני:

```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" npm run e2e
```

רק חלק אחד מהקובץ החדש:

```bash
PARTS=d NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v47-a11y-export.e2e.js
```

## יעד

- כל הקבצים: 0 כשלים.
- `problems: none`, כלומר אין שגיאות בדף ואין שגיאות בקונסול מעבר לשגיאה המוזרקת שהבדיקה מצפה לה.

## נתוני בדיקה

הבדיקות יוצרות את הנתונים בעצמן: מסמכים קטנים, מסמך של 5,000 שורות, טבלה עם 64 עמודות, ו-`speechSynthesis` ו-`print` מדומים. ההורדות נשמרות בתיקייה זמנית.
