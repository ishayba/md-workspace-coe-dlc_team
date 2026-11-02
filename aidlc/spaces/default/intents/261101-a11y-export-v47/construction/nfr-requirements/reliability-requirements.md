# דרישות אמינות — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: NFR8, NFR10)
- `construction/functional-design/functional-spec.md` (functional-spec: WF2, WF4, WF5) ו-`rules.md` (rules: BR2.8, BR2.12, BR4.7, BR7.7, BR7.8, BR7.11)
- תשובות שלב זה: Q4, Q8

## הקשר

אפליקציית PWA שעובדת בלי רשת. "זמינות" פירושה שכל היכולות עובדות גם בלי חיבור, ושכשל ביכולת אחת לא מפיל את האפליקציה.

## דרישות

| ID | דרישה | אימות |
|---|---|---|
| NFR8.1 | ארבעת הקבצים החדשים (`a11y.js`, ‏`a11y-ui.js`, ‏`export-core.js`, ‏`export-ui.js`) נמצאים ב-`ASSETS` של `sw.js` וב-`FILES` של `scripts/build-dist.js`. ‏`npm run dist` נכשל אם קובץ חסר (המנגנון הקיים) | יחידה: ‏`test/service-worker.test.js` מורחבת |
| NFR8.2 | גרסת המטמון ב-`sw.js` עולה ל-`md-workspace-offline-v4.7.0-build-<תאריך>-01` | יחידה: ‏`test/version-sync.test.js` |
| NFR8.3 | כל הייצואים, כולל docx, עובדים בלי רשת | e2e: ‏`context.setOffline(true)` ואז ייצוא Word |
| NFR8.4 | לפני הורדה נבדקים `Blob`, ‏`URL.createObjectURL` ו-`'download' in HTMLAnchorElement.prototype`. אם אחד חסר, אריחי ההורדה מושבתים עם ההסבר "ההורדה לא זמינה בדפדפן הזה" (FR4.7). הדפסה ו-PDF נשארים פעילים | יחידה על פונקציית הזיהוי, עם תלויות מוזרקות |
| NFR8.5 | כשל בכתיבה ל-localStorage (חסום או QuotaExceededError) לא זורק הלאה. ההעדפות עובדות בזיכרון. ברשימת ה-QA מוצגת ההודעה "לא ניתן לשמור אוטומטית, השתמשו ב'שמור עותק'" | יחידה: אחסון מדומה שזורק; בדיקת קובץ ה-QA |
| NFR8.6 | הקראה: בלי `speechSynthesis` הכפתור מושבת. בלי קול עברי ההקראה ממשיכה עם הודעה. קטע ארוך מ-200 תווים מתפצל לפי סוף משפט (`.` `?` `!` `:` ואז רווח), ואם אין סוף משפט, לפי הרווח האחרון לפני 200. ההדגשה נשארת על אותו אלמנט עד סוף כל חלקיו | יחידה: ‏`a11y.splitForSpeech` |
| NFR8.7 | חריגה בבניית קובץ לא משאירה את הממשק במצב busy. הנתיב `finally` מחזיר ל-idle (SM3) | יחידה ו-e2e: הזרקת שגיאה |
| NFR8.8 | הפלט דטרמיניסטי: אותו Markdown, אותה כותרת ואותו `asOf` נותנים docx זהה, בייט מול בייט | יחידה |
| NFR10.1 | כל בדיקות היחידה הקיימות (229) וכל קובצי ה-e2e הקיימים ירוקים | ‏`npm test` ו-e2e |
| NFR10.2 | בדיקות e2e שמשתמשות בכפתורים שהוסרו (`btn-export-*`, ‏`btn-print-doc`, ‏`btn-theme-toggle`) מתעדכנות: פותחות את הפאנל ובוחרות אריח או ערכה. מה שהן בודקות לא משתנה | סקירת diff של הבדיקות |
| NFR10.3 | ‏`mdw_theme` שנשמר בגרסה קודמת (`light`/`dark`) נשמר אחרי העדכון | יחידה ו-e2e |
| NFR10.4 | אם בדיקות ה-zoom (BR7.11) נכשלות, עוברים לחלופה rem בלי לחזור לתכנון, והחריגה מתועדת ב-BACKLOG | ‏e2e |
