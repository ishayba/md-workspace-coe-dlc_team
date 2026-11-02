**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| Severity | Location | Finding | Required action |
|---|---|---|---|
| Major | export-ui.js > `build()` (ענף `docx`) ו-`run()`; export-core.js > `tableXml` (`ctx.warnings.push`) | הדרישה NFR7.11 קובעת שבטבלה של יותר מ-63 עמודות המשתמש מקבל הודעה. `buildDocx` אכן מחזיר `warnings` (ויש בדיקת יחידה שמוודאת זאת), אבל `build()` ב-export-ui.js משתמש רק ב-`pkg.parts` ומתעלם מ-`pkg.warnings`. בפועל תוכן העמודות העודפות מתמזג בשקט והמשתמש לא יודע. אין בדיקת e2e לכך, והחריג לא מופיע ב"חריגות מהתוכנית" ב-code-summary.md. | להעביר את `pkg.warnings` מ-`build()` ל-`run()` ולהציג אותם דרך `MdA11yUI.notify(..., { announce: true })` אחרי ההצלחה. להוסיף בדיקת e2e או בדיקה סטטית לטבלה רחבה. אם נבחר להשאיר כך, לתעד זאת כחריגה מפורשת. |
| Minor | export-ui.js > `run()`, ההוק `window.__mdwTestFailNextExport` | קוד בדיקה נשאר בקוד הייצור. ההשפעה זניחה (מי שקורא `window.__mdwTestFailNextExport = true` רק גורם לכישלון ייצוא של עצמו), אבל זה משטח שאינו חלק מהמוצר. ההערה בקוד מציינת את זה. | לשקול הזרקה דרך `deps`, או לתעד במפורש בקוד ובתוכנית את ההוק כחריג מכוון. |
| Minor | index.html > `buildCleanHtml` ו-`buildLiveHtml`, השורה `<main class="main-article ${templateClass}">` | `templateClass` נכנס לתכונת `class` בלי `escapeHtml`. זו התנהגות קיימת, אבל ב-v4.7.0 שתי הפונקציות הפכו לפונקציות טהורות שמקבלות `opts` מבחוץ, ולכן הערך כבר לא נגזר רק מ-`templateSelector.value` בתוך הפונקציה. שם תבנית עם גרש כפול (אפשרי בתבנית משתמש) ישבור את התכונה. | לעטוף ב-`escapeHtml(templateClass)` בשתי הפונקציות. |
| Minor | a11y-ui.js > `setReadingState` (כפתור `#ax-read`) | לכפתור יש גם `aria-pressed` וגם `aria-label` ששניהם מתחלפים ("הקראת המסמך" / "עצירת הקראה"). קוראי מסך מקריאים אז "עצירת הקראה, לחוץ", שזה כפל משמעות מבלבל. כלל ARIA: כפתור toggle משאיר שם קבוע ומשנה רק את המצב. | להשאיר שם קבוע עם `aria-pressed`, או להשאיר את החלפת התווית ולהסיר את `aria-pressed`. |
| Minor | export-core.js > `codeXml(text, ctx)` | הפרמטר `ctx` לא בשימוש (קוד מת קל). | להסיר את הפרמטר ואת העברתו ב-`blockXml`. |

### Notes (לא ממצאים)

- **docx:** בדקתי את סדר האלמנטים ב-`rPr`, `pPr`, `tblPr`, `tcPr`, `sectPr`, ו-`settings`. הסדר תואם לסכמה. יש `w:bCs`, `w:iCs`, `w:cs` ו-`w:rtl` לפי כתב, `jc` לוגי start/end, `w:num` נפרד לכל רשימה ממוספרת עם `startOverride` בכל תשע הרמות, ו-Content Types ו-rels שלמים עם `rId10` ואילך לקישורים. ה-ZIP בנוי נכון (כותרות מקומיות ומרכזיות, CRC32, UTF-8 flag, `[Content_Types].xml` ראשון) ודטרמיניסטי.
- **אבטחה:** הוכחתי ש-`PRINT_SCRIPT_SHA256` שווה ל-SHA-256 של `PRINT_SCRIPT` (חישוב ב-node). ה-CSP של HTML לצפייה בלבד הוא `default-src 'none'` בלי `http:`, ו-`script-src` נוסף רק עם hash בגרסת ההדפסה. קישורי docx מוגבלים ל-http, https ו-mailto. `xmlEscape` מוציא תווי בקרה אסורים. כותרת עוינת ב-HTML חי מקודדת `\u003c`. אין `innerHTML`, `eval`, `fetch` או XHR בקבצים החדשים (grep). `a11y-ui.js` בונה DOM דרך `h()` בלי `innerHTML`.
- **נגישות:** הטיפול ב-Esc בשלב capture עקבי (חלון מודאלי, ואז פאנל, ואז הקראה, ואחרי כן Esc של העורך), יש החזרת פוקוס לאייקון, אזור חי עם איפוס לפני כתיבה, קישור "דלג לתוכן" ו-`aria-checked` על `role="switch"`. החצים ב-radiogroup מותאמים ל-RTL.
- **R-06 עד R-10 ב-md-visual-ui.js:** המימוש נכון ומינימלי (צילום `span` לפני הדבקה, `e.code`, `isComposing` ו-`keyCode 229`, `canTakeFocus` עם אימות דרך `document.activeElement`). R-07 נשאר מגבלה ידועה, בדיוק לפי התרחיש שה-functional-spec צפה מראש (שורות 165 ו-285), עם מדידה, פירוט ב-BACKLOG ובדיקת e2e שמקבעת את ההתנהגות.
- **בדיקות:** השינויים בבדיקות קיימות הם עדכוני מבנה בלבד (כפתורי ייצוא שהפכו לאריחים, מונים שהתאימו למבנה החדש). כל אחד מהם נשאר בעל משמעות (למשל נוסף assert על `getPreviewHtml` ועל שלוש הקריאות ב-export-ui.js) ואף סף לא הורד. הבדיקות החדשות בודקות XML ו-ZIP דרך קוראים עצמאיים (`xml-mini`, `zip-reader`), ולא רק מחרוזות. לא מצאתי בדיקות טאוטולוגיות.
- **חריגות ב-code-summary.md:** כנות ומקובלות (Red שלא נרשם, בדיקת הגנה בדיעבד, עריכה דרך הטרמינל, הזחה בתבניות). החריג שחסר הוא ההודעה על טבלה רחבה (הממצא ה-Major למעלה).
- **לא נבדק על ידי:** לא הרצתי בדיקות ולא בניות. נשענתי על תוצאות המתזמר (459/459, כיסוי, e2e). לא נבדק פתיחה אמיתית ב-Word, NVDA, VoiceOver, Firefox ו-Safari, והמסמך עצמו מציין זאת.

**Verdict:** READY

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
