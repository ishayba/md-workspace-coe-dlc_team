## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-31
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | e2e/visual-editor.e2e.js, e2e/live-html-roundtrip.e2e.js; כפתורי הסרגל החדשים, prompt לכתובת, Tab/Shift+Tab ברשימה, יצירת hr ב-contenteditable | בדיקות הדפדפן (`npm run e2e`) לא הורצו. כל ההתנהגות האינטראקטיבית החדשה, ייצוא "HTML חי" בדפדפן אמיתי והצבת `dir` בפועל ב-DOM נבדקו רק מול DOM מדומה ובדיקות מבנה. 224 הבדיקות שרצו עברו (הרצתי `npm test`), אבל הן לא מוכיחות את ההתנהגות בדפדפן. | להריץ `npm run e2e` בשלב Build and Test לפני שחרור 4.6.0, ולהתייחס אליו כתנאי שחרור. | Resolved (reviewer) |
| R-02 | Minor | construction/code-generation/code-summary.md > "סטיות מהתוכנית" סעיף 1 | סדר Red→Green לא נשמר בשלושה מקומות: `GUARD` הורחב כבר בשלב 4, קוד הממיר לקישורים/תמונות/קו חוצה נכתב יחד בשלב 16, ובדיקות הממיר של שלבים 18 ו-21 עברו כבר ב-Red. ההשפעה מתונה: לבדיקות ה-parser והקורפוס של אותם שלבים כן היה כשל Red מתועד, ובדיקת ה-round-trip האקראית (300 מסמכים) מכסה את הממיר. עדיין, לבדיקות הממיר הנפרדות אין הוכחת Red עצמאית. | לקבל את הסטייה כמתועדת. אין צורך בשינוי קוד; אפשר להוסיף mutation ידני קצר (כיבוי ענף ב-`renderGroup`) לוודא שהבדיקות אכן נכשלות. | Accepted risk |
| R-03 | Minor | index.html:1206 ו-2334; md-visual.js:173 (`safeUrl`) | כלל אימות הכתובות (http/https/mailto/יחסי, דחיית `//` ו-`\`, דחיית כל scheme אחר) מומש בשלושה עותקים: ב-parser, בבלוק הייצוא (בתוך template literal עם escaping כפול) ובממיר. הקריאה בקוד תקינה והבדיקות מכסות `javascript:`, `data:`, `vbscript:`, `file:` ו-`//host`, והבדיקה מעריכה את בלוק הייצוא. עם זאת, שלושה עותקים עלולים להיסחף בעתיד, ובייצוא כל שינוי ב-escaping (`\/`, `\\`) שביר. | לשמור על בדיקת השוויון בין העותקים (הערכת הבלוק ב-`v46-export-contract`) ולהוסיף בה השוואת פלט לאותו קורפוס כתובות, כדי שסטייה תיתפס. | Accepted risk |
| R-04 | Minor | test/md-visual.test.js (4 החלפות מתוכננות) | הבדיקות הקיימות שונו לפי הטבלה בתוכנית בלבד (רשימות מקוננות, `<hr>`, קישור/תמונה שהצטמצמו לטקסט), והורחבו ללא החלשה. ההשפעה על התנהגות: רשימות מקוננות כבר לא משוטחות, וזה שינוי התנהגות מכוון (SC-7). | להזכיר בהערות השחרור שמסמכים עם הזחה ברשימות ייוצאו כעת עם קינון. | Accepted risk |
| R-05 | Minor | traceability.json | חיישן העקיבות נכשל כי `inception/requirements-analysis/requirements.md` לא קיים (שלב שדולג), ולכן קבוצת המזהים העליונה ריקה. זה צפוי ולא פגם בתוצר. אין לי ראיה לפער מול SC-1..SC-9: סיכום הקוד ממפה כל תכונה לבדיקות parser, ממיר, קורפוס ו-RTL. | לאשר את החריגה בשער; אין צורך בתיקון. | Accepted risk |
| R-06 | Minor | md-visual-ui.js > `unwrapPastedSpans()` (שורות 204-211) | הפונקציה מסירה כל `span[style]` בעורך (מחוץ לאיים), לא רק את אלו שנוצרו בהדבקה. המרת ה-Markdown ב-`collectRuns` (md-visual.js:201-208) ממפה `span` עם `font-weight: bold` או `font-style: italic` ל-strong/em, ולכן span כזה שהיה קיים לפני ההדבקה היה מאבד עיצוב. בפועל זה לא צפוי: `styleWithCSS` מוגדר `false` (md-visual-ui.js:681), כך שהדגשה והטיה יוצרות `<b>` ו-`<i>` ולא span, והמרת Markdown-ל-HTML מפיקה strong/em. ההסרה אינה נבדקת בבדיקה שמכסה span עם סגנון מודגש שקדם להדבקה. | להוסיף בדיקת חוזה קטנה שמוכיחה ש-span מעוצב שקדם להדבקה לא מתקיים, או לצמצם את ההסרה ל-spans שאינם נושאים `font-weight`, `font-style` או `text-decoration`. אפשר גם לתעד את ההנחה בהערת הקוד. | Unresolved |
| R-07 | Minor | md-visual-ui.js > `unwrapPastedSpans()` | הסרת ה-spans היא שינוי DOM ישיר מחוץ ל-`execCommand`, ולכן היא לא נרשמת בהיסטוריית ה-undo של הדפדפן. Undo אחרי הדבקה עלול להתייחס ל-DOM ששונה. `keepSelection` שומר את גבולות הבחירה ומחזיר אותם, אבל גבול שנמצא בתוך span שהוסר עלול להיבלע בבלוק ה-`try/catch`, כך שהסמן יישאר במקום אחר. | לוודא ידנית או בבדיקת e2e שהמשך undo אחרי הדבקה עובד ושהסמן נשאר בסוף הטקסט שהודבק. אם יש בעיה, לקבל זאת כמגבלה מתועדת. | Unresolved |
| R-08 | Minor | md-visual-ui.js:645 > מטפל keydown של Cmd/Ctrl+B/I | התנאי תלוי ב-`e.key` לטינית. במקלדת עברית פעילה `e.key` הוא אות עברית, ולכן הקיצור לא יטופל בעורך ויישאר לדפדפן, שלפי הרקע של ה-loop-back אינו אמין. אין סיכון לטוגל כפול, כי `preventDefault` נקרא רק כשהתנאי מתקיים. מקשי Tab, undo/redo ועורכי האיים אינם מושפעים: הבדיקה של `.island-editor` קודמת לתנאי, ו-Shift/Alt מוציאים את הצירוף. | לשקול התאמה גם לפי `e.code` (`KeyB`, `KeyI`), כדי שהקיצור יעבוד גם בפריסת מקלדת עברית. אפשר לדחות לגרסה הבאה. | Unresolved |
| R-09 | Minor | md-visual-ui.js > מטפל `keydown` של העורך, ענף `Escape` | ענף ה-`Escape` קורא ל-`preventDefault()` ול-`releaseFocus()` בלי לבדוק `e.isComposing`. בזמן הקלדה עם IME (למשל שפות מזרח אסיה) מקש Escape מבטל את הקומפוזיציה, וכאן הוא גם יוציא את הפוקוס מהעורך. במקלדת עברית רגילה אין השפעה. | להוסיף `!e.isComposing` לתנאי של Escape, או לרשום בסעיף §4 ב-BACKLOG.md ל-v4.7.0. אין צורך לחסום את הגרסה. | New |
| R-10 | Minor | md-visual-ui.js > `releaseFocus()` | בחירת הפקד הבא מסננת לפי `disabled`, `tabindex="-1"` ו-`getClientRects().length`. פקד עם `visibility:hidden` עדיין מחזיר מלבנים ועלול להיבחר, ואז `focus()` לא יזיז את הפוקוס והמשתמש נשאר בעורך. בדף הנוכחי לא נמצא מקרה כזה. בדיקת ה-e2e (38/0, סעיף 8b) מאמתת את המסלול הרגיל בלבד. | להוסיף בדיקה ש-`document.activeElement` אכן עזב את העורך, ואם לא, לעבור לפקד הבא או לבצע `blur()`. אפשר לדחות ל-v4.7.0. | New |

> R-01 Earlier decision: Accepted risk

> R-06 Reviewer note: הקוד של `unwrapPastedSpans()` לא השתנה בסבב הזה: היא עדיין מסירה כל `span[style]` בעורך מחוץ לאיים. הסעיף נרשם עכשיו ב-BACKLOG.md §4.6 ל-v4.7.0. לא חוסם.

> R-07 Reviewer note: הסרת ה-`span` נעשית ישירות ב-DOM מחוץ ל-`execCommand`, ולכן אינה בהיסטוריית הביטול. נרשם ב-BACKLOG.md §4.6 ל-v4.7.0. לא חוסם.

> R-08 Reviewer note: המטפל של Cmd/Ctrl+B ו-Cmd/Ctrl+I עדיין בודק רק `e.key` (`b`/`i`/`B`/`I`). במקלדת עברית הוא לא מופעל, והקיצור המובנה של הדפדפן ממשיך לפעול כמו לפני v4.6.0. נרשם ב-BACKLOG.md §4.6 ל-v4.7.0. לא חוסם.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npm test` | 229 pass, 0 fail | תואם לצפוי. כולל שלוש בדיקות החוזה החדשות ואת קבועי `TASK_OFF`/`TASK_ON` המעודכנים. |
| `npm run e2e` (עם `NODE_PATH` של Playwright) | css-studio 42/0, ROUNDTRIP OK, auto-direction 25/0, visual-editor 69/0, v46-visual 38/0 | תואם לצפוי. התנהגות Chromium אומתה, כולל Escape (סעיף 8b). Safari ו-Firefox וקורא מסך לא נבדקו, וכך נאמר בפירוש ב-BACKLOG.md. |

### Summary

חמשת הכפתורים החדשים בסרגל קיבלו `aria-label` בעברית ובלי אימוג'י (האימוג'י נשאר בטקסט הנראה בלבד, והתווית מכילה את המילה הנראית). תוויות תיבות המשימה הן מחרוזות קבועות ("משימה פתוחה" / "משימה שהושלמה"), ולכן אין סיכון הזרקה. הן נקבעות גם ב-`parseMarkdown` וגם ב-`toggleTask` בעורך, והמצב נקרא עדיין מ-`checked`. `Escape` במקום הנכון בסדר המטפלים: קודם בדיקת עורך האי, אחר כך B/I ו-Escape, ו-Tab, undo ו-redo לא הושפעו. הטענות לגבי נגישות זהירות: גם `code-summary.md` וגם `unit-test-instructions.md` אומרים במפורש שבדיקות אוטומטיות אינן מבססות עמידה ב-WCAG 2.1 AA או בת״י 5568. סעיף §4 ב-BACKLOG.md משקף נאמנה את הפריטים שנדחו: האייקונים, פאנל הנגישות, פאנל הייצוא, כללי הייצוא וקריטריוני הקבלה. R-06, R-07 ו-R-08 עדיין תקפים כהערות Minor ורשומים ב-§4.6.
