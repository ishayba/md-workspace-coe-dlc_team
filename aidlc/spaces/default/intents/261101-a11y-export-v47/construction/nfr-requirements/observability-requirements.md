# דרישות תצפית ויכולת בדיקה — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: NFR11)
- `construction/functional-design/functional-spec.md` (functional-spec: §1) ו-`rules.md` (rules: BR7.9)
- תשובות שלב זה: Q5, Q6

## הקשר

אפליקציה בלי שרת ובלי טלמטריה. לכן "תצפית" כאן היא שני דברים: רישום מקומי שעוזר לאתר תקלה בדפדפן של המשתמש, ויכולת לבדוק כל לוגיקה באוטומציה. אין SLI, ‏SLO או התראות, כי אין שירות שאפשר לנטר.

## דרישות

| ID | דרישה | אימות |
|---|---|---|
| NFR11.1 | `a11y.js` ו-`export-core.js` נטענים ב-node דרך `require()`, בלי `window` ובלי `document`, ומחזירים את ה-API שלהם (UMD) | יחידה |
| NFR11.2 | כיסוי שורות של 90% לפחות לכל אחד משני המודולים, נמדד ב-`node --test --experimental-test-coverage`. נוסף script בשם `npm run coverage`, וב-Build and Test נבדק הסף | ‏`npm run coverage` |
| NFR11.3 | לקבצי ה-UI (`a11y-ui.js`, ‏`export-ui.js`) אין רצפת כיסוי. הם מכוסים בקובץ e2e חדש, `e2e/v47-a11y-export.e2e.js`, שבודק כל זרימת עבודה WF1 עד WF8 לפחות פעם אחת | ‏e2e |
| NFR11.4 | רישום: שגיאת ייצוא נרשמת ב-`console.error('[mdw-export]', format, err.name, err.message)`. שגיאות הקראה ואחסון נרשמות ב-`console.warn('[mdw-a11y]', …)`. אין רישום בהצלחה. אין רישום של תוכן (NFR9.7) | ‏e2e: הזרקת שגיאה ובדיקת הודעת הקונסולה |
| NFR11.5 | אין שליחה החוצה: אין `fetch`, ‏`XMLHttpRequest`, ‏`sendBeacon` או `WebSocket` בקוד החדש | בדיקה סטטית ביחידה |
| NFR11.6 | ‏e2e רץ גם עם `--offline` (NFR8.3) וגם בלי, ונכשל על כל שגיאת קונסולה שלא צפויה | ‏e2e: מאזין `page.on('console')` |
