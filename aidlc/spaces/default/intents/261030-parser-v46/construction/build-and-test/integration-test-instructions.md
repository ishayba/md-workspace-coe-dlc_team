# הוראות בדיקות אינטגרציה ודפדפן — v4.6.0

אסטרטגיית הבדיקות היא Minimal, ולכן לפי הגדרת השלב אין בה קובץ אינטגרציה נפרד. הקובץ נוצר בכל זאת, כי הסוקר בשלב הקוד (R-01) קבע שבדיקת הדפדפן היא תנאי שחרור. בדיקות ה-e2e בודקות את האינטגרציה בין ה-parser, העורך הוויזואלי, התצוגה והייצוא בדפדפן אמיתי.

## Framework Setup

- Playwright 1.64.1 ו-Chromium 156, מותקנים לפי `build-instructions.md`. כל קובץ e2e מפעיל את `server.js` על פורט אקראי.

## How to Run

כל החבילה:
```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" npm run e2e
```

קובץ אחד (מומלץ, כי `npm run e2e` עוצר בכשל הראשון):
```bash
NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v46-visual.e2e.js
```

| קובץ | מה הוא בודק |
|---|---|
| `e2e/css-studio.e2e.js` | עורך העיצוב |
| `e2e/live-html-roundtrip.e2e.js` | ייצוא HTML חי וייצוא חוזר ל-MD (עטיפות כיוון) |
| `e2e/auto-direction.e2e.js` | כיוון אוטומטי |
| `e2e/visual-editor.e2e.js` | העורך הוויזואלי (v4.5.0) |
| `e2e/v46-visual.e2e.js` | **חדש:** רינדור התחביר החדש, RTL על הבלוקים החדשים, חמשת הכפתורים החדשים, `Tab` ו-`Shift+Tab` ברשימות, שחרור המקלדת עם `Escape` (סעיף 8b), וייצוא HTML חי ← MD של התחביר החדש |

## Coverage Targets

- כל ההתנהגות האינטראקטיבית החדשה של v4.6.0 מכוסה ב-`e2e/v46-visual.e2e.js`.
- כל קבצי ה-e2e הקיימים נשארים כפי שהיו.

## Test Data

- מחרוזות Markdown ו-HTML שמוגדרות בתוך הבדיקות. תיקיית הגלופות של השרת היא תיקייה זמנית. קובצי הייצוא נכתבים לתיקייה הזמנית של המערכת.
