# סיכום מימוש — v4.6.0 הרחבת ה-parser

## תוצאה

- כל 41 שלבי התוכנית סומנו כבוצעו.
- הסוויטה המלאה (`npm test`): **224 בדיקות, 224 עוברות, 0 נכשלות**. לפני העבודה היו 131 בדיקות ירוקות, כלומר נוספו 93.
- בדיקות ה-e2e בדפדפן (`npm run e2e`) **לא הורצו**. ראו "מה לא נבדק".

## קבצים שנוצרו

| קובץ | תוכן |
|---|---|
| `test/parser-v46-blocks.test.js` | 26 בדיקות: קו מפריד, תבליטי `-`/`+`, משימות, רשימות מקוננות, ציטוט רב-שורתי, יישור עמודות |
| `test/parser-v46-inline.test.js` | 16 בדיקות: קו חוצה, קישורים, תמונות, ורגרסיות אבטחה לכתובות |
| `test/v46-direction.test.js` | 21 בדיקות: קריטריון ה-RTL לכל תכונה |
| `test/v46-export-contract.test.js` | 8 בדיקות: חוזה ייצוא "HTML חי ← MD", כולל הרצת הבלוק מול DOM מדומה |

## קבצים ששונו

| קובץ | שינוי |
|---|---|
| `index.html` | `parseMarkdown()`: קו מפריד, ציטוט מאוחד, `-`/`+`, בונה רשימות אחד (קינון, משימות), placeholder לקוד/תמונות/קישורים, בדיקת כתובת, קו חוצה, יישור עמודות. `convertChild`: תוכן שורה, `hr`, רשימות מקוננות ומשימות, יישור. סרגל: חמישה כפתורים חדשים. CSS לתמונות ולפריט משימה. גרסה 4.6.0 |
| `md-visual.js` | ממיר: `del`, קישורים, תמונות, עטיפת קבוצות (`renderGroup`), קינון ומספור לכל רמה, משימות, `hr`, יישור מהכותרת, `GUARD` מורחב, `safeUrl` מיוצא |
| `md-visual-ui.js` | פקודות `strike`, `link`, `image`, `hr`, `task`; `Tab`/`Shift+Tab` ברשימה מזיחים; `:scope > hr` ב-`normalizeDom` |
| `css-studio.js` | שישה אלמנטים בקטלוג (`a`, `img`, `hr`, `del`, `task`, `ul-nested`), קבוצה `media`, וסעיף "תחביר נוסף" ב-`SAMPLE_MD` |
| `samples/css-studio-sample.md` | זהה בית-בית ל-`SAMPLE_MD` |
| `test/md-visual.test.js`, `test/css-studio.test.js`, `test/visual-contract.test.js` | בדיקות חדשות, וארבע ההחלפות המתוכננות בלבד בבדיקות קיימות (ראו להלן) |
| `package.json`, `sw.js`, `README.md`, `MVP_SPEC.md`, `BACKLOG.md` | גרסה 4.6.0, רשומת שינויים, עדכון הסעיפים שהושלמו |

## החלטות מימוש עיקריות

- **כל הקוד החדש של ה-parser בתוך `parseMarkdown()`**, וללא שורה `    }` בהזחה של 4 רווחים, כדי ש-`test-support/load-app.js` ימשיך לחלץ את הפונקציה.
- **שלב 4c:** קוד בתוך שורה, תמונות וקישורים הופכים ל-placeholder לפני המודגש והנטוי, ומשוחזרים אחריהם. כך `*` או `_` בכתובת לא נשברים, ואין קישור בתוך `` `קוד` ``. התמונה נשמרת כ-HTML מוכן (alt וכתובת כבר escaped), והקישור שומר רק את הכתובת.
- **כתובות:** `http`, `https`, `mailto` או נתיב יחסי (בלי scheme לפני `/` `?` `#` הראשונים, ובלי `//` או `\\` בתחילה). הכלל זהה ב-`index.html`, ב-`md-visual.js` (`safeUrl`) ובייצוא.
- **רשימות:** בונה אחד על שורות רצופות (גם עם שורות ריקות ביניהן, כמו בדיפולט הקודם), עומק לפי `floor(הזחה/2)`, וחסם של רמה אחת בכל פעם. רשימה שטוחה נשארת בדיוק `<ul><li>a</li><li>b</li></ul>`.
- **הממיר:** סימנים שעוטפים כמה ריצות (קישור, קו חוצה) נכתבים פעם אחת סביב הקבוצה (`renderGroup`), אחרת `~~**bold** and *it*~~` היה מתפצל ל-round-trip לא יציב. הבדיקה האקראית (300 מסמכים) תפסה את זה.
- **ייצוא "HTML חי":** קוד בתוך template literal. הבדיקה מעריכה את הבלוק כמו הדפדפן (`new Function` על ה-literal), מקמפלת אותו (`vm.Script`), ומריצה אותו מול DOM מדומה שנבנה מ-`md-visual.js`. תפסה בפועל באג מהסוג של v4.3.2: הערה עם `\n` בתוך ה-literal שברה את הסקריפט.

## בדיקות קיימות ששונו בכוונה (לפי הטבלה בתוכנית)

| בדיקה | לפני | אחרי |
|---|---|---|
| `lists: nested lists ...` (כותרת וקביעה) | `'* a\n* b\n* c\n'` | `'* a\n  * b\n* c\n'` |
| `things that cannot be represented ...` | `'link u end\n'` | `'[link](http://x) u ![y](x) end\n'` |
| אותה בדיקה, `<hr>` | `'a\n\nb\n'` | `'a\n\n---\n\nb\n'` |
| כותרת הבדיקה | "nested lists are flattened" | "nested lists keep their levels ..." |

בנוסף הורחבה (בלי להחליש) הבדיקה `line-start markers ...`: נוספו מקרים, ונוסף `<hr>` לביטוי שאוסר קריאה מחדש כתחביר.

## כשלי Red שתועדו לכל תכונה

פקודות הריצה לפי `unit-test-instructions.md`. השורות הן שורות ה-`✖` של הרצת Red, לפני המימוש.

**קו מפריד (SC-3)** — `node --test test/parser-v46-blocks.test.js test/md-visual.test.js`: 6 כשלים
```
✖ things that cannot be represented are reduced to their text; app chrome is ignored
✖ line-start markers get a zero-width guard so text is not re-read as headings, lists, quotes, tables or wrappers
✖ round trip keeps the rendering — hr
✖ round trip — 300 random documents built from the corpus
✖ hr: ---, *** and ___ (three or more) become <hr> outside a paragraph
✖ hr: Hebrew text around a rule keeps both paragraphs
```

**תבליטי `-`/`+` (SC-4)** — אותה פקודה: 5 כשלים
```
✖ round trip keeps the rendering — dashPlus
✖ round trip — 300 random documents built from the corpus
✖ bullets: "-" and "+" render exactly like "*"
✖ bullets: a list that mixes the three markers is one list
✖ bullets: Hebrew items and inline formatting inside "-" items
```

**משימות (SC-5)** — אותה פקודה: 5 כשלים
```
✖ task items: the checkbox state is written back as [ ] / [x]
✖ task items: text that merely starts with "[ ] " gets a guard so it is not re-read as a task
✖ tasks: "[ ]" and "[x]" items become disabled checkboxes (checked only for x)
✖ tasks: all three bullet markers and an upper-case X work
✖ tasks: Hebrew text and inline formatting inside a task
```

**רשימות מקוננות (SC-7)** — אותה פקודה: 10 כשלים
```
✖ lists: nested lists keep their levels, wrapped paragraphs unwrapped, empty items dropped
✖ round trip keeps the rendering — nestedList
✖ round trip keeps the rendering — nestedMixed
✖ round trip — 300 random documents built from the corpus
✖ nesting: three levels build one tree inside the parent <li>
✖ nesting: an ordered list inside a bullet list, and back to the top level
✖ nesting: no depth limit (five levels)
✖ nesting: siblings after a deeper level close the open levels
✖ nesting: Hebrew items, tasks and "-" markers can be nested
✖ nesting: an over-indented first item or a skipped level does not break the structure
```

**קו חוצה (SC-6)** — `node --test test/parser-v46-inline.test.js test/md-visual.test.js test/parser-div-dir.test.js`: 4 כשלים
```
✖ strikethrough: <del>, <s> and <strike> are written as ~~x~~; plain "~~" in text is neutralised
✖ strike: ~~x~~ becomes <del>x</del>
✖ strike: works inside list items and table cells
✖ strike: combines with bold and italic in either nesting order
```

**קישורים ותמונות (SC-1, SC-2)** — אותה פקודה: 12 כשלים
```
✖ links: plain text that looks like a link is neutralised, brackets in link text are replaced
✖ round trip keeps the rendering — links
✖ round trip keeps the rendering — images
✖ round trip — 300 random documents built from the corpus
✖ links: http, https, mailto and relative addresses become <a href>
✖ links: Hebrew link text, inline formatting inside the text, and ampersands in the address
✖ links: * and _ inside the address are not turned into emphasis
✖ links: inside list items and table cells
✖ links (security): javascript:, data:, vbscript: and protocol-relative addresses stay visible text
✖ images: ![alt](src) becomes <img src alt> for allowed sources
✖ images: an image can sit inside a link
✖ images (security): quotes and markup in alt text stay escaped; * in alt is not emphasis
```

**ציטוט רב-שורתי (SC-8)** — `node --test test/parser-v46-blocks.test.js test/md-visual.test.js`: 3 כשלים
```
✖ quote: consecutive "> " lines are one blockquote with <br> between the lines
✖ quote: a blank line separates blockquotes; text after a quote is its own paragraph
✖ quote: Hebrew lines and inline formatting inside a multi-line quote
```

**יישור עמודות (SC-9)** — `node --test test/parser-v46-blocks.test.js test/md-visual.test.js test/parser-table-last-row.test.js`: 4 כשלים
```
✖ tables: column alignment of the header cells is written back to the separator row
✖ table: :--- / :---: / ---: align every th and td of the column
✖ table: columns without colons keep plain th/td, and alignment can be mixed with plain columns
✖ table: alignment works for Hebrew cells and the last row at the end of the document
```

**RTL** — `node --test test/v46-direction.test.js`: כשל אחד בהרצה הראשונה
```
✖ RTL — SC-9 align: every emitted tag is direction-covered or inline, and the Hebrew text is rtl
  AssertionError: <thead> is neither in the direction selector nor inline
```
הכשל היה בבדיקה עצמה: `thead`/`tbody`/`tr` הם מכלים שמחזיקים רק `th`/`td`, והתאים כן בסלקטור. הם נוספו לרשימת התגים שאינם צריכים `dir` משלהם. `applyAutoDirection` לא שונה.

**קטלוג ומסמך דוגמה** — `node --test test/css-studio.test.js test/md-visual.test.js`: כשל אחד
```
✖ catalog covers every element the current parser can emit
  AssertionError: missing element: a
```

**ייצוא וסרגל** — `node --test test/v46-export-contract.test.js test/visual-contract.test.js`: 10 כשלים
```
✖ export block: handles each new construct (hr, nesting, tasks, strike, links, images, alignment)
✖ export: a horizontal rule comes back as ---
✖ export: nested lists keep their levels and numbering; tasks keep their state
✖ export: bold, italic, code, strike, links and images are kept inside paragraphs, lists, headings, cells and quotes
✖ export: multi-line quotes and column alignment survive
✖ export: the Hebrew sample document of the CSS studio comes back unchanged
✖ the editor offers a code/visual mode switch, a visual toolbar, the editing surface and the preview/code switch
✖ v4.6.0 toolbar commands are wired: every data-vcmd button has a COMMANDS entry
✖ v4.6.0 link and image commands validate the address with the shared rule before inserting it
✖ v4.6.0 Tab / Shift+Tab inside a list indent / outdent (they are no longer blocked), and <hr> is lifted out of a <p>
```
במהלך ה-Green נתפסו עוד שני כשלים אמיתיים: `SyntaxError: Invalid or unexpected token` (הערה עם `\n` בתוך ה-template literal), והבדיקה הקיימת `the visual editor UI stays offline ...` שנכשלה כי ערך ברירת המחדל של ה-`prompt` היה `https://`. שניהם תוקנו במימוש, בלי לשנות את הבדיקה הקיימת.

## כיסוי בדיקות

- 4 קבצים חדשים (71 בדיקות: 26 + 16 + 21 + 8) ו-3 קבצים מעודכנים (22 בדיקות נוספו בהם, כולל ערכי קורפוס חדשים). סך הכול 224 בדיקות בסוויטה (היו 131).
- כל תכונה: בדיקות parser (כולל עברית), בדיקת ממיר, ערך בקורפוס ה-round-trip (נכנס אוטומטית ל-300 המסמכים האקראיים), וכיסוי RTL.
- רגרסיית אבטחה ממוקדת (רצפת `bugfix`): `javascript:`, `JaVaScRiPt:`, `data:`, `vbscript:`, `file:`, `//host`, `\\host`, כתובת שמתחילה במרכאה, הזרקת מאפיין דרך מרכאות ב-alt ובכתובת, ו-`<img>` בתוך כתובת.
- בדיקות `parser-div-dir`, `parser-table-last-row`, `parser-italic-in-lists` ו-`auto-direction` עוברות ללא שינוי. כלל `table[dir="ltr"] th { text-align: left }` נשאר 4 פעמים.

## סטיות מהתוכנית

1. **סדר Red ← Green לא נשמר בשלושה מקומות.** (א) `GUARD` הורחב ל-`- `/`+ ` כבר בשלב 4, ולכן מקרי ה-`GUARD` של שלב 6 לא נכשלו, אבל בדיקות ה-parser של אותו שלב כן נכשלו. (ב) קוד קישורים, תמונות וקו חוצה בממיר נכתב יחד בשלב 16, כי הוא תלוי באותו מבנה של קבוצות; לכן בדיקות הממיר של שלבים 18 ו-21 עברו כבר ב-Red, ובדיקות ה-parser ובדיקות הקורפוס של אותם שלבים כן נכשלו. (ג) בדיקת ה-RTL ובדיקות הקטלוג נכשלו רק חלקית, כמתואר למעלה.
2. **שלב 30-32 (RTL):** לא נדרש שינוי במימוש, כפי שהתוכנית צפתה.
3. **שני מקרי אבטחה בבדיקות שלי תוקנו** אחרי שנכשלו: `java&#10;script:x` ו-`&#106;avascript:x` הם נתיב יחסי תקין ובטוח (ה-`&` עובר escape ל-`&amp;`, וה-`#` פותח fragment לפני ה-`:`). הבדיקה שונתה כך שהיא קובעת את ההתנהגות הנכונה, ולא להפך. אלה בדיקות חדשות שלי, לא בדיקות קיימות.
4. **בדיקת הייצוא** משווה רינדור אחרי כיווץ שורות ריקות רצופות, כי הייצוא הקיים מפריד בלוקים בארבע שורות חדשות.
5. **CSS קטן שלא היה בתוכנית:** `img { max-width: 100% }` ו-`li.task-list-item { list-style: none }` בתצוגה בלבד (לא בקבצי הייצוא).
6. **פקודת `sed -i` על קובץ התוכנית נחסמה** על ידי ה-hook, ולכן סימוני התיבות נעשו אחד-אחד בכלי העריכה.

## מה לא נבדק

- **דפדפן אמיתי:** `npm run e2e` לא הורץ (דורש Playwright). לא אומתו: כפתורי הסרגל החדשים, `prompt` לכתובת, `Tab`/`Shift+Tab` ברשימה ב-Chromium, יצירת `hr` ב-`contenteditable`, והצבת `dir` בפועל ב-DOM.
- `e2e/visual-editor.e2e.js` שורה 99 מצפה לשני ציטוטים נפרדים אחרי Enter. פלט הממיר לא השתנה לשני אלמנטים נפרדים, ולכן סביר שהבדיקה עדיין עוברת, אבל התיאור שלה ("each quote line is its own block") מיושן. נרשם ב-`BACKLOG.md` לשלב Build and Test.
- ייצוא "HTML חי" נבדק מול DOM מדומה ובקומפילציה בלבד, לא בדפדפן (`e2e/live-html-roundtrip.e2e.js` לא הורץ).

## Loop-back 1

תיקון שני כשלי e2e בעורך הוויזואלי (Ctrl+B לא מסיר הדגשה; `span` עם `style` נשאר אחרי הדבקה). שלבים 42–45.

### קבצים ששונו
- `md-visual-ui.js`: מטפל `keydown` של העורך מטפל עכשיו ב-Cmd/Ctrl+B ו-Cmd/Ctrl+I (רק בלי Shift ובלי Alt, עם `preventDefault` ו-`run(() => exec('bold'|'italic'))`); פונקציה חדשה `unwrapPastedSpans()` שנקראת במטפל ההדבקה ומפרקת רק `span[style]` מחוץ לאיים (`[data-island]`, `.island-editor`) ומשאירה את התוכן. `Tab`, Undo/Redo ושאר הקיצורים לא נגעו.
- `test/visual-contract.test.js`: שתי בדיקות חוזה חדשות.
- `e2e/visual-editor.e2e.js`: לא שונה.

### שלב Red (נרשם)
```
✖ Loop-back 1: Cmd/Ctrl+B and Cmd/Ctrl+I are handled by the editor itself (no shift/alt), via run()
✖ Loop-back 1: paste unwraps styled <span> elements the browser adds, keeping their text
ℹ tests 14 / pass 12 / fail 2
```
(בהרצה הראשונה, מיד אחרי הכתיבה, הקובץ עוד לא נקלט והופיעו 12 בדיקות ירוקות; ההרצה החוזרת הציגה את שני הכשלים.)

### תוצאות
- `npm test`: 226 עוברות, 0 נכשלות (היו 224).
- e2e: `css-studio` 42/0, `live-html-roundtrip` ROUNDTRIP OK, `auto-direction` 25/0, `visual-editor` 69/0 (כולל "Ctrl+B toggles it off again" ו-"only the plain-text flavour is inserted"), `v46-visual` 33/0. אין שגיאות עמוד או קונסול.

### סטיות
- שלב Green לא הורץ בנפרד על הקובץ הבודד; הריצה הראשונה אחרי המימוש הייתה `npm test` המלא (שכולל אותו). שלב Refactor: לא נדרש שינוי נוסף, הניקוי כבר בפונקציה נפרדת.
- `traceability.json` לא עודכן: התיקון אינו SC חדש.

## Revision 1 — נגישות לשינויים של v4.6.0, ותכנון v4.7.0

שלבים 46–50. הסעיף נוסף אחרי האישור, לבקשת המשתמש בשער ("בצע את 1 ואת השאר הוסף לתכנון גרסה 4.7"), והוא מתייחס למסמך "הנחיות רוחביות: נגישות וייצוא" (`docs/ui-cross-cutting-guidelines.md`, נשמר כמו שהוא). שלבים 1–45 כבר היו בנויים ומאומתים, וסומנו מחדש בלבד אחרי שהחזרה לאחור איפסה את תיבות הסימון.

### קבצים ששונו
- `index.html`: `aria-label` בעברית לארבעת הכפתורים שחסרו להם (`link` "קישור", `image` "תמונה", `task` "פריט משימה", `hr` "קו מפריד"); ל-`strike` כבר היה. ה-`title` והטקסט הנראה נשארו. ה-parser מוסיף ל-`<input type="checkbox">` של משימה `aria-label` שמתאר מצב ("משימה פתוחה" / "משימה שהושלמה").
- `md-visual-ui.js`: פונקציה חדשה `releaseFocus()` ו-`Escape` במטפל `keydown` של העורך (רק בלי מקשי עזר), שמעבירה פוקוס לפקד הנראה והפעיל הראשון שאחרי העורך, ואם אין כזה מסירה פוקוס מהעורך (WCAG 2.1.2). עורך האיים (`.island-editor`) ממשיך לטפל ב-`Escape` שלו, כי החזרה המוקדמת עבורו קודמת. תיבת סימון שהכפתור "משימה" יוצר בעורך מקבלת גם היא `aria-label` ומתעדכן כשהיא מסומנת.
- `test/visual-contract.test.js`: שלוש בדיקות חוזה חדשות.
- `test/parser-v46-blocks.test.js`: הקבועים `TASK_OFF` ו-`TASK_ON` (ה-HTML המדויק של פריט משימה) עודכנו וכוללים את ה-`aria-label`. זה השינוי המבוקש; כל שאר ההשוואות נשארו בלי שינוי, ושום בדיקה לא נמחקה או הוחלשה.
- `e2e/v46-visual.e2e.js`: סעיף חדש 8b (5 בדיקות): `Escape` בפריט רשימה ובתא טבלה, `aria-label` של תיבת סימון בעורך ובתצוגה, ו-`aria-label` בחמשת הכפתורים. `e2e/visual-editor.e2e.js` לא שונה.
- `BACKLOG.md`: סעיף חדש 4 "v4.7.0 — נגישות וייצוא לפי ההנחיות הרוחביות" (שני האייקונים והפאנלים, שבעת רכיבי פאנל הנגישות, חמשת פורמטי הייצוא כולל `.docx` אמיתי, כללי הייצוא, קריטריוני קבלה, ו-R-06, R-07, R-08). פריט ה-e2e בסעיף 1ב סומן `[x]`, והערת הכותרת עודכנה. `test/version-sync.test.js` ירוקה.
- `docs/ui-cross-cutting-guidelines.md`: נבדק שקיים; לא שונה.

### שלב Red (נרשם)
הפקודה: `node --test test/visual-contract.test.js test/parser-v46-blocks.test.js` (43 בדיקות, 36 עברו, 7 נכשלו):
```
✖ tasks: "[ ]" and "[x]" items become disabled checkboxes (checked only for x)
✖ tasks: all three bullet markers and an upper-case X work
✖ tasks: Hebrew text and inline formatting inside a task
✖ nesting: Hebrew items, tasks and "-" markers can be nested
✖ Revision 1: every new v4.6.0 toolbar button has a Hebrew aria-label without emoji
✖ Revision 1: the task checkbox built by the parser and by the editor carries a Hebrew state aria-label
✖ Revision 1: Escape inside the editor releases focus to the next focusable control (no keyboard trap, WCAG 2.1.2)
```

### תוצאות
- `npm test`: 229 עוברות, 0 נכשלות (היו 226; נוספו 3 בדיקות חוזה). ה-round-trip, כולל 300 המסמכים האקראיים, לא השתנה: `md-visual.js` קורא את מצב תיבת הסימון מ-`checked` ומתעלם מ-`aria-label`.
- e2e, כל קובץ בנפרד: `css-studio` 42/0, `live-html-roundtrip` ROUNDTRIP OK, `visual-editor` 69/0, `auto-direction` 25/0, `v46-visual` 38/0 (33 קודמות ועוד 5 חדשות). אין שגיאות עמוד או קונסול.

### סטיות
- שלב Green לא הורץ בנפרד אחרי המימוש; הריצה הראשונה הייתה `npm test` המלא. שלב Refactor: לא נדרש שינוי נוסף.
- הרחבתי את `e2e/v46-visual.e2e.js` (לא נדרש במפורש) כדי שהתנהגות `Escape` בדפדפן לא תישען רק על בדיקת חוזה שקוראת טקסט.
- תיבות הסימון בעורך מקבלות `aria-label` גם בעת יצירתן ב-`md-visual-ui.js`; הדבר לא הופיע במפורש בשלב 47, ונוסף כדי שהתווית תהיה עקבית בין התצוגה לעורך.
- `traceability.json` לא עודכן: אין SC חדש.

### מה לא נבדק, ומגבלה חשובה
הבדיקות האוטומטיות מאמתות שהתוויות, שחרור המקלדת וההתנהגות בדפדפן Chromium קיימים. הן לא מבססות עמידה מלאה ב-WCAG 2.1 AA או בת״י 5568. לשם כך נדרשות בדיקה ידנית עם קורא מסך (NVDA, VoiceOver) וסקירה של מומחה נגישות. לא נבדקו: Safari ו-Firefox, ניגודיות צבעים, וחוויית קורא מסך בפועל (למשל איך מוקראת תיבת סימון `disabled`).
