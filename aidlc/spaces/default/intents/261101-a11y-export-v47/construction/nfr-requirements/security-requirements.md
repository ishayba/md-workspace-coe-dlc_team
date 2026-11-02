# דרישות אבטחה ופרטיות — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: NFR9)
- `construction/functional-design/functional-spec.md` (functional-spec: WF5, WF7.4, WF7.5) ו-`rules.md` (rules: BR3.3, BR3.10, BR3.11)
- תשובות שלב זה: Q2, Q3, Q6, Q8
- הקוד הקיים: `md-visual.js` (`safeUrl`), ‏`index.html` (`escapeHtml`, ‏`CssStudio.sanitizeCss`)

## הקשר

האפליקציה רצה בדפדפן בלי שרת. אין התחברות, אין חשבונות ואין נתונים משותפים. כל התוכן הוא של המשתמש עצמו. הסיכון העיקרי הוא שקובץ מיוצא יעביר קוד עוין הלאה. למשל, מסמך Markdown עם `<script>` או קישור `javascript:` שמישהו שלח למשתמש, ושהמשתמש מייצא ומעביר לאחרים.

## איומים

| # | איום | איפה | בקרה |
|---|---|---|---|
| T1 | הזרקת סקריפט ל-HTML מיוצא דרך תוכן המסמך | HTML לצפייה, גיבוי PDF | ‏NFR9.2, ‏NFR9.3 |
| T2 | שבירת XML או הזרקה ל-docx דרך תווים מיוחדים | Word | ‏NFR9.1 |
| T3 | קישור עוין (`javascript:`, ‏`data:`) בקובץ מיוצא | כל הפורמטים | ‏NFR9.4 |
| T4 | דליפת מידע אישי במטא-דאטה | Word | ‏NFR9.6 |
| T5 | דליפת תוכן המסמך דרך רישום או רשת | אפליקציה | ‏NFR9.5, ‏NFR9.7 |
| T6 | CSS עוין מגלופה מותאמת בקובץ מיוצא (`url()`, ‏`@import`) | HTML | ‏NFR9.8 |
| T7 | תמונה חיצונית ב-HTML מיוצא שולחת בקשת רשת בכל פתיחה, וחושפת את כתובת ה-IP של הקורא לשרת התמונה | HTML לצפייה, גיבוי PDF | ‏NFR9.2: רק `https:` ו-`data:`. זה סיכון מקובל, כי כתובת התמונה נבחרה על ידי כותב המסמך, בדיוק כמו בדף אינטרנט רגיל. ‏`http:` חסום |

## דרישות

| ID | דרישה | אימות |
|---|---|---|
| NFR9.1 | כל טקסט שנכנס ל-XML של docx עובר `xmlEscape`: ‏`&` ל-`&amp;`, ‏`<`, ‏`>`, ‏`"` ו-`'`. תווי בקרה שאסורים ב-XML 1.0 (‎U+0000–U+0008, U+000B, U+000C, U+000E–U+001F, U+FFFE, U+FFFF) מוסרים | יחידה: קלט עם `<w:p>`, ‏`]]>` ו-`\u0001` יוצא כטקסט, וה-XML מאוזן |
| NFR9.2 | ב-HTML לצפייה בלבד אין אלמנט `<script>` ואין מאפייני אירוע. הבדיקה רצה על תגים בלבד, בביטוי `<[a-z][^>]*\son[a-z]+\s*=` מחוץ לבלוקי `<pre>` ו-`<code>`, כדי למנוע התרעות שווא על טקסט רגיל. ה-`<meta http-equiv="Content-Security-Policy">` הוא האלמנט הראשון ב-`<head>`, עם `default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data:` (‏T7: בלי `http:`) | יחידה: בדיקת הפלט; ‏e2e: פתיחת הקובץ בלי שגיאות CSP בקונסולה, והתוכן מוצג |
| NFR9.3 | בגיבוי ה-PDF יש בדיוק סקריפט אחד, זהה למחרוזת הקבועה `PRINT_SCRIPT`. ה-hash שלו הוא קבוע מקודד (`PRINT_SCRIPT_SHA256`) לצד המחרוזת, ולא מחושב בזמן ריצה, כי `crypto.subtle` אסינכרוני ואין בפרויקט שלב בנייה. ה-CSP: `default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; font-src data:; script-src 'sha256-<PRINT_SCRIPT_SHA256>'`, ומופיע ב-`<head>` לפני ה-`<script>`. שום דבר מתוכן המשתמש לא נכנס לסקריפט | יחידה: מחשבת SHA-256 של `PRINT_SCRIPT` ב-`node:crypto`, משווה לקבוע, ובודקת שיש סקריפט אחד |
| NFR9.4 | קישורים: ב-HTML הכלל הקיים `safeUrl`. ב-docx נוצר `w:hyperlink` רק ל-`http:`, ‏`https:` ו-`mailto:` שעברו `safeUrl`, וכל השאר טקסט. ב-rels ה-`Target` עובר `xmlEscape`. ב-Markdown הכתובת נשמרת כמו שכתב המשתמש, כי זה המקור שלו, בלי LRM בתוכה | יחידה. מקרים שליליים, שאסור שיופיעו כ-Target: ‏`javascript:alert(1)`, ‏`JaVaScRiPt:x`, ‏`java\tscript:x`, ‏` javascript:x`, ‏`data:text/html,x`, ‏`file:///etc/passwd`, ‏`vbscript:x`. מקרים חיוביים: ‏`https://a.b/c?d=1&e=2`, שמופיע עם `&amp;`, ו-`mailto:a@b.c` |
| NFR9.5 | בקוד החדש אין `eval`, ‏`new Function` ו-`setTimeout` עם מחרוזת. השמה ל-`innerHTML` מותרת רק לפי רשימת היתר: ‏`#preview-content` (הקוד הקיים) ואזורים שנבנים מקבועי `STR` שעוברים `escapeHtml`. כל שאר הכתיבה ל-DOM בקבצים החדשים נעשית ב-`textContent` וב-`createElement`. אין טעינת משאבים מבחוץ: אין fetch, ‏CDN או גופנים חיצוניים | בדיקה סטטית ביחידה: ‏`innerHTML` מופיע בקבצים החדשים רק בשורות שמסומנות `// innerHTML-allowed: <סיבה>` |
| NFR9.6 | ב-`docProps/core.xml` רק `dc:title` ו-`dcterms:created`/`modified` (מ-`asOf`). ‏`dc:title` עובר `xmlEscape` ומוגבל ל-255 תווים. ‏`dc:creator` ו-`cp:lastModifiedBy` ריקים. אין `docProps/app.xml`. אין שם משתמש, נתיב או שם מחשב באף חלק | יחידה |
| NFR9.7 | הרישום (`console.error`/`warn`) כולל רק סוג פורמט, שם השגיאה וההודעה הטכנית. לא נרשמים תוכן המסמך, כותרתו או שם הקובץ | סקירת קוד ובדיקה סטטית: אין `mdInput.value` בקריאות `console` |
| NFR9.8 | ‏CSS של גלופה מותאמת עובר `CssStudio.sanitizeCss` לפני שהוא נכנס לקובץ מיוצא, כמו היום. בנוסף, ה-CSP של NFR9.2 חוסם טעינה חיצונית גם אם משהו עבר | בדיקות `css-studio` הקיימות ירוקות, ובדיקה חדשה (T6): גלופה עם `@import url(https://x)` ועם `background:url(javascript:x)` לא מופיעה כך בפלט של ה-HTML לצפייה בלבד |
| NFR9.9 | ב-localStorage נשמרים רק ערכי העדפות (`mdw_theme`, ‏`mdw_a11y_hc`, ‏`mdw_a11y_zoom`), ובקובץ ה-QA רק סטטוסים והערות של הבודק (`mdw_qa_v470`) | סקירת קוד |

## מחוץ להיקף

- הצפנה או הגנה בסיסמה של קבצים מיוצאים.
- בדיקת קבצים שהמשתמש פותח (קיים כבר ב-`parseMarkdown`, בלי שינוי בגרסה הזו).
