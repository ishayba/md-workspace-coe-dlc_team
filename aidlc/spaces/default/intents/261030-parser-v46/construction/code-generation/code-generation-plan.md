# תוכנית מימוש — v4.6.0 הרחבת ה-parser

## Summary

- Builds: תשע תכונות Markdown חדשות ב-parser, בממיר העורך הוויזואלי, בקטלוג של CSS Studio, בייצוא "HTML חי ← MD" ובסרגל העורך; ב-Loop-back 1, קיצורי Cmd/Ctrl+B ו-Cmd/Ctrl+I שלא תלויים בדפדפן, והדבקה בלי `span` עם סגנון
- Touches: `index.html` (parseMarkdown, convertChild, סרגל), `md-visual.js`, `md-visual-ui.js`, `css-studio.js`, `samples/css-studio-sample.md`, בדיקות ב-`test/`, קבצי גרסה
- Tests: כ-45 בדיקות יחידה ב-`node --test` (4 קבצים חדשים ו-3 מעודכנים), כולל בדיקת RTL ובדיקות round-trip לכל תכונה ורגרסיית אבטחה לכתובות; ב-Loop-back 1 עוד 2 בדיקות חוזה לקיצורי מקלדת ולהדבקה, ואימות בכל חמשת קובצי ה-e2e

## מקורות

- הצהרת הכוונה: `ideation/intent-capture/intent-statement.md` (SC-1 עד SC-9 וקריטריון RTL)
- החלטות: `ideation/approval-handoff/decision-log.md` (D-10 עד D-13)
- אין `requirements.md` ו-`unit-of-work.md`, כי השלבים האלה דולגו בתוכנית שאושרה. העבודה היא איטרציה אחת, בלי Units.

## החלטות תכנון

| נושא | החלטה | מקור |
|---|---|---|
| כתובות בקישורים ובתמונות | מתקבלים רק `http:`, `https:`, `mailto:` (בלי תלות באותיות גדולות/קטנות) או נתיב יחסי, כלומר בלי scheme לפני `/`, `?` או `#` הראשונים. כתובת שמתחילה ב-`//` נדחית, כי היא בפועל חיצונית. כתובת שנדחתה נשארת טקסט גלוי | SC-1, SC-2, D-10 |
| הגנה על כתובות | קישורים ותמונות מומרים ל-placeholder לפני שלבי המודגש והנטוי, ומשוחזרים אחריהם, כדי ש-`*` או `_` בכתובת לא ישברו אותה. בתוך `` `קוד` `` לא נוצר קישור | SC-1, SC-2 |
| קו מפריד | שורה שכולה `---`, `***` או `___` (שלושה תווים ויותר) הופכת ל-`<hr>`. הזיהוי רץ לפני שלבי המודגש והנטוי ולפני סימון התבליטים, ו-`hr` מתווסף לרשימת תגי הבלוק של שלב הפסקאות | SC-3, D-11 |
| תבליטים | `*`, `-` ו-`+` מרונדרים כאותה רשימת תבליטים. רשימה שטוחה נשארת בדיוק כמו היום, `<ul><li>a</li><li>b</li></ul>` | SC-4 |
| משימות | `[*+-] [ ] ` ו-`[*+-] [x] ` (גם `X`) מרונדרים כ-`<li class="task-list-item"><input type="checkbox" disabled> טקסט</li>`, ועם `checked` כשמסומן | SC-5 |
| קינון | שני רווחים לכל רמה, ברקורסיה ובלי הגבלת עומק. רשימה פנימית נבנית בתוך ה-`li` של ההורה, בשורה אחת. מעבר בין `ul` ל-`ol` באותה רמה פותח רשימה חדשה | SC-7, D-12 |
| קו חוצה | `~~טקסט~~` הופך ל-`<del>טקסט</del>` | SC-6 |
| ציטוט רב-שורתי | שורות `> ` עוקבות הופכות לבלוק `<blockquote>` אחד, עם `<br>` בין השורות. שורה ריקה מפרידה בין בלוקים | SC-8 |
| יישור עמודות | `:---` → `style="text-align:left"`, `---:` → `right`, `:---:` → `center`, על כל ה-`th` וה-`td` של העמודה. `---` בלי נקודתיים מייצר תאים בלי מאפיינים, כמו היום | SC-9 |
| פורמט הפלט של הממיר | `* ` לתבליטים, `* [ ] ` ו-`* [x] ` למשימות, שני רווחים לכל רמת קינון, `---` לקו מפריד, `~~` לקו חוצה | round-trip |
| טקסט שנראה כמו תחביר | הממיר מנטרל טקסט רגיל שהיה הופך לתחביר: `](` מקבל תו רוחב-אפס באמצע, וכך גם `~~`. `GUARD` מורחב ל-`- `, `+ ` ולשורות `---`, `***`, `___` | round-trip |
| קינון בעורך הוויזואלי | `Tab` ברשימה מזיח פנימה, ו-`Shift+Tab` מוציא החוצה. Chromium יוצר `ul` כאח של ה-`li` ולא בתוכו, ולכן הממיר מתייחס ל-`ul`/`ol` שיושב ישירות בתוך רשימה כרשימה מקוננת תחת ה-`li` שלפניו | SC-7 |
| RTL | אין צורך לשנות את `applyAutoDirection`, כי `li`, `ul` ו-`ol` כבר בסלקטור, ותגי השורה החדשים יורשים את הכיוון. הבדיקה ב-Node מאמתת שכל בלוק חדש מכוסה בסלקטור, שטקסט עברי מזוהה כ-`rtl` ושה-round-trip יציב עם עברית. ה-`dir` עצמו מוצב ב-DOM, ובדיקה מלאה שלו היא בבדיקות ה-e2e בדפדפן | RTL, D-13 |

## בדיקות קיימות שישתנו בכוונה

| קובץ | שורה בערך | היום | אחרי |
|---|---|---|---|
| `test/md-visual.test.js` | 72 | רשימה מקוננת משוטחת: `'* a\n* b\n* c\n'` | `'* a\n  * b\n* c\n'` |
| `test/md-visual.test.js` | 78 | קישור ותמונה הופכים לטקסט: `'link u end\n'` | `'[link](http://x) u ![y](x) end\n'` |
| `test/md-visual.test.js` | 79 | `<hr>` נעלם: `'a\n\nb\n'` | `'a\n\n---\n\nb\n'` |
| `test/md-visual.test.js` | 70 | כותרת הבדיקה "nested lists are flattened" | כותרת שמתארת קינון |

כל שינוי כזה נעשה בשלב Red של התכונה שלו, ונכשל לפני המימוש.

## Testing Contract
```json
{
  "version": 1,
  "methodology": "tdd",
  "source": "project",
  "ordering": "for every applicable testable layer, write failing tests first (Red), implement the minimum to pass (Green), then refactor while green.",
  "scope": "bugfix",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "- **Methodology**: TDD\n- **Ordering**: for every applicable testable layer, write failing tests first (Red), implement the minimum to pass (Green), then refactor while green."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Include a targeted regression for the bug or vulnerability.",
      "Keep the existing test suite green."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "tdd",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - Red: write the failing tests and record the failing command output.",
      "Data model / database behavior - Green: implement only enough behavior to pass.",
      "Data model / database behavior - Refactor: improve the implementation while tests stay green.",
      "Repository / data access - Red: write the failing tests and record the failing command output.",
      "Repository / data access - Green: implement only enough behavior to pass.",
      "Repository / data access - Refactor: improve the implementation while tests stay green.",
      "Business logic - Red: write the failing tests and record the failing command output.",
      "Business logic - Green: implement only enough behavior to pass.",
      "Business logic - Refactor: improve the implementation while tests stay green.",
      "API / endpoint - Red: write the failing tests and record the failing command output.",
      "API / endpoint - Green: implement only enough behavior to pass.",
      "API / endpoint - Refactor: improve the implementation while tests stay green.",
      "Frontend behavior - Red: write the failing tests and record the failing command output.",
      "Frontend behavior - Green: implement only enough behavior to pass.",
      "Frontend behavior - Refactor: improve the implementation while tests stay green.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:5095360c6d8f1c7f7f2b176ceb71d255326c57e7f08a4d527476c0bc9ae35a42",
  "contract_sha256": "sha256:52c58132eb8cad323e8bac89b179994fa53dc960560cfc48e272ca7383f5f8b6"
}
```

## שכבות שלא רלוונטיות

- **Data model / database**, **Repository / data access**, **API / endpoint**: אין בפרויקט מסד נתונים, שכבת גישה לנתונים או API שמושפעים. ממשק ה-API של `server.js` (גלופות) לא משתנה. השכבות האלה מושמטות.
- **Business logic**: `parseMarkdown()` ב-`index.html`, הממיר `md-visual.js`, וקטלוג `ELEMENTS` ו-`SAMPLE_MD` ב-`css-studio.js`.
- **Frontend behavior**: ייצוא "HTML חי ← MD" (`convertChild`), סרגל העורך הוויזואלי ו-`md-visual-ui.js`.

## שלבים

### הכנה

- [x] **Step 1** — מבנה הפרויקט: אין קבצי ייצור חדשים. כל הבדיקות החדשות נכנסות ל-`test/`, ולא נוספות תלויות.
- [x] **Step 2** — אימות מריץ הבדיקות: להריץ `node --test test/parser-table-last-row.test.js` ולוודא שהוא עובר, ואז להריץ את כל הסוויטה ולתעד שכל 131 הבדיקות ירוקות לפני השינוי. הפקודה המדויקת לכל שלב Red ו-Green מתועדת ב-`unit-test-instructions.md`.

### Business logic — תכונה 1: קו מפריד (SC-3)

- [x] **Step 3** — Red: ב-`test/parser-v46-blocks.test.js`, בדיקות ל-`---`, `***` ו-`___` (וגם `-----`) שמייצרות `<hr>` מחוץ ל-`<p>`, ולכך ש-`--` ו-`- - -` לא מייצרים `<hr>`. ב-`test/md-visual.test.js`: לשנות את שורה 79 ל-`'a\n\n---\n\nb\n'`, להוסיף ל-`GUARD` מקרים של `---`, `***` ו-`___`, ולהוסיף לקורפוס ערך `hr`. להריץ ולתעד את הכשל.
- [x] **Step 4** — Green: ב-`parseMarkdown()`, זיהוי שורת קו מפריד מיד אחרי עטיפות הכיוון, לפני שלב הכותרות, והוספת `hr` ל-`blockTagLineRe`. ב-`md-visual.js`, `case 'hr'` מחזיר `'---'`, ו-`GUARD` מזהה שורות של קו מפריד.
- [x] **Step 5** — Refactor: לוודא ש-`* * *` לא מתנגש עם סימון התבליטים, ולהריץ שוב.

### Business logic — תכונה 2: תבליטים `-` ו-`+` (SC-4)

- [x] **Step 6** — Red: בדיקות ש-`- a\n- b` ו-`+ a\n+ b` מייצרים בדיוק `<ul><li>a</li><li>b</li></ul>`, ושרשימה שמערבבת סימנים היא רשימה אחת. ב-`md-visual.test.js`, מקרי `GUARD` ל-`- x` ו-`+ x`, וערך קורפוס `dashPlus`. להריץ ולתעד את הכשל.
- [x] **Step 7** — Green: להרחיב את ה-placeholder של התבליט (4b) ל-`[*+-] `. ב-`GUARD` להוסיף `- ` ו-`+ `.
- [x] **Step 8** — Refactor: לוודא שהבדיקות ב-`parser-italic-in-lists.test.js` נשארות בלי שינוי, ולהריץ שוב.

### Business logic — תכונה 3: משימות (SC-5)

- [x] **Step 9** — Red: בדיקות ש-`- [ ] a` ו-`- [x] b` (גם `* [X]` ו-`+ [ ]`) מייצרים `li.task-list-item` עם `<input type="checkbox" disabled>`, ועם `checked` כשמסומן. ב-`md-visual.test.js`: `<li class="task-list-item"><input type="checkbox" disabled checked> b</li>` → `* [x] b`, וערך קורפוס `tasks`. להריץ ולתעד את הכשל.
- [x] **Step 10** — Green: בבניית פריט רשימה ב-`parseMarkdown()`, לזהות `[ ] ` או `[x] ` בתחילת הפריט. ב-`collectItems` ב-`md-visual.js`, לקרוא את `input[type=checkbox]` ולהוסיף `[ ] ` או `[x] `.
- [x] **Step 11** — Refactor: להריץ שוב.

### Business logic — תכונה 4: רשימות מקוננות (SC-7)

- [x] **Step 12** — Red: בדיקות לשלוש רמות (`* a\n  * b\n    * c`) שמייצרות `<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>`, ל-`ol` בתוך `ul`, ולחזרה לרמה העליונה. ב-`md-visual.test.js`: לשנות את שורה 72 ל-`'* a\n  * b\n* c\n'` ואת כותרת הבדיקה, להוסיף מקרה של Chromium (`<ul><li>a</li><ul><li>b</li></ul></ul>` → `'* a\n  * b\n'`), וערכי קורפוס `nestedList` ו-`nestedMixed`. להריץ ולתעד את הכשל.
- [x] **Step 13** — Green: להחליף את שלבים 7a ו-7b ב-`parseMarkdown()` בבונה רשימות אחד, לפי שורות, שמחשב את רמת ההזחה (שני רווחים לרמה) ובונה את העץ בשורה אחת. הבונה כתוב בתוך `parseMarkdown()`, כי `test-support/load-app.js` מחלץ רק את הפונקציה עצמה. ב-`md-visual.js`, `collectItems` מחזיר `{ text, depth, ordered, task }`, ו-`listBlock` מזיח ומספר מחדש בכל רמה.
- [x] **Step 14** — Refactor: לאחד את הטיפול בתבליטים, במשימות ובקינון בפונקציה אחת. לוודא שאין שורה `    }` בהזחה של 4 רווחים בתוך `parseMarkdown()`, ולהריץ שוב.

### Business logic — תכונה 5: קו חוצה (SC-6)

- [x] **Step 15** — Red: ב-`test/parser-v46-inline.test.js`, בדיקות ש-`~~x~~` מייצר `<del>x</del>`, גם בתוך פריט רשימה ותא טבלה, ושצירוף עם `**` עובד. ב-`md-visual.test.js`: `<del>`, `<s>` ו-`<strike>` → `~~x~~`, טקסט רגיל `a ~~ b` לא הופך לקו חוצה, וערך קורפוס `strike`. להריץ ולתעד את הכשל.
- [x] **Step 16** — Green: ב-`parseMarkdown()`, שלב inline `~~(.+?)~~` → `<del>`. ב-`md-visual.js`, דגל `del` בריצות, `~~` ב-`renderRun`, השוואת `del` בתנאי המיזוג, ניטרול `~~` בטקסט רגיל, ותו רוחב-אפס בין סימני `~` צמודים.
- [x] **Step 17** — Refactor: להריץ שוב.

### Business logic — תכונה 6: קישורים (SC-1)

- [x] **Step 18** — Red: בדיקות ש-`[a](https://x.y)`, `[a](mailto:p@q.r)`, `[a](docs/p.md)` ו-`[a](#s)` מייצרים `<a href>`. רגרסיית אבטחה: `javascript:`, `JaVaScRiPt:`, `data:`, `vbscript:` ו-`//evil.example` לא מייצרים `<a>` ונשארים טקסט, ואין שום מאפיין `on*=`. `*` ו-`_` בכתובת לא נשברים. בתוך `` `קוד` `` לא נוצר קישור. ב-`md-visual.test.js`: לשנות את שורה 78, להוסיף ש-`<a href="javascript:x">t</a>` → `t`, שטקסט רגיל `[a](b)` מנוטרל, וערך קורפוס `links`. להריץ ולתעד את הכשל.
- [x] **Step 19** — Green: ב-`parseMarkdown()`, בדיקת הכתובת כפי שמוגדרת בהחלטות התכנון, המרה ל-placeholder לפני שלבי המודגש והנטוי, ושחזור אחריהם. ב-`md-visual.js`, ריצה עם `href` שמפיקה `[text](url)` רק לכתובת מותרת, וניטרול `](` בטקסט רגיל.
- [x] **Step 20** — Refactor: להוציא את בדיקת הכתובת לפונקציה פנימית אחת ב-`parseMarkdown()`, ופונקציה מקבילה ב-`md-visual.js`, ולהריץ שוב.

### Business logic — תכונה 7: תמונות (SC-2)

- [x] **Step 21** — Red: בדיקות ש-`![alt](icon.svg)` ו-`![a](https://x/y.png)` מייצרים `<img src alt>`, ש-`![x](javascript:alert(1))` ו-`![x](data:image/png,...)` לא מייצרים `<img>`, ושמרכאות ב-alt נשארות escaped. ב-`md-visual.test.js`: `<img src="x" alt="y">` → `![y](x)`, תמונה עם כתובת אסורה → טקסט ה-alt, וערך קורפוס `images`. להריץ ולתעד את הכשל.
- [x] **Step 22** — Green: ב-`parseMarkdown()`, זיהוי `![...](...)` לפני קישורים, עם אותה בדיקת כתובת. ב-`md-visual.js`, ריצה מסוג `img`.
- [x] **Step 23** — Refactor: להריץ שוב, כולל `test/parser-div-dir.test.js`, ולוודא שבדיקות האבטחה הקיימות בו עוברות.

### Business logic — תכונה 8: ציטוט רב-שורתי (SC-8)

- [x] **Step 24** — Red: בדיקות ש-`> a\n> b` מייצר `<blockquote>a<br>b</blockquote>` אחד, וש-`> a\n\n> b` מייצר שני בלוקים. ב-`md-visual.test.js`: `<blockquote>a<br>b</blockquote>` → `'> a\n> b\n'`, וערך קורפוס `quoteMulti`. להריץ ולתעד את הכשל.
- [x] **Step 25** — Green: ב-`parseMarkdown()`, לאחד שורות `&gt; ` עוקבות לבלוק אחד. הממיר כבר מפיק שורות `> ` נפרדות, ולכן לא נדרש בו שינוי מעבר לאימות.
- [x] **Step 26** — Refactor: להריץ שוב.

### Business logic — תכונה 9: יישור עמודות (SC-9)

- [x] **Step 27** — Red: בדיקות ש-`| :--- | :---: | ---: |` מייצר `style="text-align:left"`, `center` ו-`right` על כל ה-`th` וה-`td` בעמודה, ושהבדיקות ב-`test/parser-table-last-row.test.js` נשארות בלי שינוי. ב-`md-visual.test.js`: יישור מה-`th` חוזר לשורת המפריד, וערך קורפוס `tableAlign`. להריץ ולתעד את הכשל.
- [x] **Step 28** — Green: בשלב הטבלאות ב-`parseMarkdown()`, לקרוא את `lines[1]`. ב-`tableBlock` ב-`md-visual.js`, לקרוא את `text-align` מה-`style` של תאי הכותרת.
- [x] **Step 29** — Refactor: לוודא שהכלל `table[dir="ltr"] th { text-align: left }` נשאר 4 פעמים ב-`index.html` (בדיקה ב-`auto-direction.test.js`), ולהריץ שוב.

### Business logic — RTL לכל התכונות (קריטריון RTL)

- [x] **Step 30** — Red: ב-`test/v46-direction.test.js`, לכל תכונה מסמך עם טקסט עברי. הבדיקה מאמתת שכל בלוק חדש שנוצר (`li`, `ul`, `ol`, `blockquote`, `td`, `th`, `p`) נמצא בסלקטור של `applyAutoDirection` (שנקרא מ-`index.html`), ש-`detectTextDirection` על הטקסט שלו מחזיר `rtl`, ושה-round-trip דרך `md-visual.js` יציב. להריץ ולתעד את הכשל.
- [x] **Step 31** — Green: לתקן מה שנכשל. הצפי הוא שאין צורך לשנות את `applyAutoDirection`. אם בלוק כלשהו לא מכוסה, להוסיף אותו לסלקטור.
- [x] **Step 32** — Refactor: להריץ שוב.

### Business logic — קטלוג ומסמך דוגמה

- [x] **Step 33** — Red: ב-`test/css-studio.test.js`, להוסיף לרשימת `needed` את `a`, `img`, `hr`, `del`, `task` ו-`ul-nested`. בדיקות הסנכרון וה-probe הקיימות ייכשלו עד שהדוגמה תעודכן. להריץ ולתעד את הכשל.
- [x] **Step 34** — Green: ב-`ELEMENTS` להוסיף `a` (selector `a`), `img`, `hr`, `del`, `task` (`li.task-list-item`) ו-`ul-nested` (`li > ul`), כל אחד עם תווית בעברית ו-`probe`. להוסיף קבוצה `media` ("קישורים ותמונות") ל-`GROUP_LABELS`. ב-`SAMPLE_MD` להוסיף סעיף "תחביר נוסף" עם קישור, תמונה (`icon.svg`), קו מפריד, תבליטי `-` ו-`+`, משימות, קו חוצה, רשימה מקוננת בשלוש רמות, ציטוט רב-שורתי וטבלה מיושרת, ולשקף אותו בדיוק ב-`samples/css-studio-sample.md`.
- [x] **Step 35** — Refactor: לעדכן את ההערה מעל `SAMPLE_MD`, לוודא שהדוגמה עוברת round-trip בקורפוס של `md-visual.test.js`, ולהריץ שוב.

### Frontend behavior — ייצוא "HTML חי ← MD" וסרגל העורך

- [x] **Step 36** — Red: ב-`test/v46-export-contract.test.js`, לחלץ מ-`index.html` את גוף `convertChild` (קוד בתוך template literal, עם escape כפול) ולאמת שהוא מטפל ב-`hr`, ברשימות מקוננות, במשימות, ב-`del`, ב-`a`, ב-`img` וביישור עמודות. ב-`test/visual-contract.test.js`, להוסיף לרשימת הפקודות `strike`, `link`, `image`, `hr` ו-`task`, ולאמת ש-`Tab` ברשימה כבר לא חסום ומפעיל `indent`. להריץ ולתעד את הכשל.
- [x] **Step 37** — Green: ב-`convertChild`, פונקציית inline פנימית שמפיקה `**`, `*`, `` ` ``, `~~`, `[t](u)` ו-`![a](s)` לתוכן של `p`, `li`, כותרות, תאים וציטוטים, עם escape כפול לפי הכלל שמתועד ב-MVP_SPEC v4.3.2. בנוסף: `hr` → `---`, רשימות מקוננות מוזחות, `[ ] ` ו-`[x] `, ויישור בשורת המפריד. בסרגל ב-`index.html` נוספים כפתורים `data-vcmd` ל-`strike`, `link`, `image`, `hr` ו-`task`. ב-`md-visual-ui.js` נוספים `COMMANDS` מתאימים: `strike` עם `strikeThrough`; `link` ו-`image` עם `prompt` ובדיקת כתובת לפני ההכנסה; `hr` עם `insertBlock`; `task` שמוסיף checkbox לפריטי הרשימה הנבחרים. `Tab` ו-`Shift+Tab` ברשימה מפעילים `indent` ו-`outdent`, ו-`normalizeDom` מוציא `hr` מתוך `p`.
- [x] **Step 38** — Refactor: לוודא שמעבר בין תאי טבלה עם `Tab` לא נפגע, להריץ שוב, ולהריץ `node --check` על הסקריפט שחולץ מהייצוא כדי לוודא שאין שגיאת תחביר. זה הבאג שקרה ב-v4.3.2.

### תצורת סביבה ובנייה

- [x] **Step 39** — עדכון הגרסה ל-v4.6.0 בכל המקומות ש-`test/version-sync.test.js` בודק: `package.json`, ה-title, ה-footer וה-`APP_VERSION` ב-`index.html`, ה-`CACHE` ב-`sw.js`, `README.md` ו-`MVP_SPEC.md`. להריץ את `test/version-sync.test.js` ואת `test/service-worker.test.js`.

### תיעוד ועקיבות

- [x] **Step 40** — תיעוד: רשומת "שינויים מ-v4.5.0 → v4.6.0" ב-`MVP_SPEC.md`. ב-`BACKLOG.md`, לסמן את סעיף 1 כהושלם ולעדכן את 1ב (רשימות מקוננות, ציטוט רב-פסקאות). לפני העריכה, לבדוק מה הבדיקה ב-`version-sync.test.js` מחפשת ב-BACKLOG, כדי לא לשבור אותה. לעדכן גם את הערת הכותרת ב-`md-visual.js`, שמונה את התחביר הנתמך.
- [x] **Step 41** — עקיבות: לכתוב את `code-summary.md` ואת `traceability.json` לשלב הזה, עם מיפוי של SC-1 עד SC-9 ו-SC-RTL לקובצי הבדיקה והמימוש.

### Loop-back 1 — תיקון שני כשלי e2e בעורך הוויזואלי

החזרה הזו נוספה לבקשת המשתמש ("Retry with fix") אחרי שלב Build and Test. הרקע מתועד ב-`construction/build-and-test/test-results.md`, תחת `## Loop-Back Log`. שתי בדיקות ב-`e2e/visual-editor.e2e.js` נכשלו, גם בגרסה הקודמת: (1) Ctrl+B לא מסיר הדגשה, כי העורך נשען על קיצור המקלדת המובנה של הדפדפן, והוא לא פועל ב-headless על macOS; (2) אחרי הדבקה נשאר בעורך `<span style="font-family:...">` שהדפדפן הוסיף. אסור לשנות את שתי בדיקות ה-e2e האלה. הן ההוכחה שהתיקון עובד.

- [x] **Step 42** — Red: ב-`test/visual-contract.test.js`, שתי בדיקות חוזה על `md-visual-ui.js`. הראשונה: יש מטפל `keydown` שמזהה `b` ו-`i` יחד עם `metaKey` או `ctrlKey` (בלי `shiftKey` ובלי `altKey`), קורא ל-`preventDefault` ומפעיל `bold` או `italic` דרך `run`. השנייה: מטפל ההדבקה מסיר מהעורך `span` עם מאפיין `style` שנוצר בהדבקה, ומשאיר את הטקסט שלו. להריץ `node --test test/visual-contract.test.js` ולתעד את הכשל.
- [x] **Step 43** — Green: ב-`md-visual-ui.js`, במטפל ה-`keydown` הקיים של העורך, להוסיף טיפול ב-Cmd/Ctrl+B ו-Cmd/Ctrl+I: `preventDefault`, `run(() => exec('bold'))` או `exec('italic')`, ועדכון מצב הכפתורים. במטפל ההדבקה, אחרי הכנסת הטקסט הפשוט, להסיר כל `span` עם `style` בתוך העורך ולהשאיר את התוכן שלו. כך ה-DOM תואם למה שהממיר מפיק, ושום מאפיין אחר לא משתנה. להריץ שוב את הפקודה.
- [x] **Step 44** — Refactor: לוודא ש-Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, `Tab` בטבלה ו-`Tab` ברשימה לא נפגעו. אם מתאים, להוציא את ניקוי ה-`span` לפונקציה קטנה. להריץ `npm test`.
- [x] **Step 45** — אימות בדפדפן ותיעוד: להריץ את כל חמשת קובצי ה-e2e (`NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" npm run e2e`), ולוודא ששתי הבדיקות שנכשלו עוברות עכשיו ושאף בדיקה אחרת לא נשברה. להוסיף ל-`code-summary.md` סעיף על החזרה הזו, כולל שורות ה-Red שנכשלו, ולעדכן את `traceability.json` אם צריך.

### Revision 1 — הנחיות נגישות לשינויים של v4.6.0, ותכנון v4.7.0

המשתמש ביקש בשער האישור: "בצע את 1 ואת השאר הוסף לתכנון גרסה 4.7". הבקשה מתייחסת למסמך "הנחיות רוחביות: נגישות וייצוא" (גרסה 1.0, 10 באוקטובר 2026) שצירף. אפשרות 1 היא ליישם רק את ההנחיות שנוגעות לשינויים של v4.6.0. כל השאר, כלומר פאנל הנגישות המלא, פאנל הייצוא ושני האייקונים בכותרת, עובר לגרסה 4.7.0.

- [x] **Step 46** — Red: ב-`test/visual-contract.test.js`, שלוש בדיקות חוזה: (1) לכל אחד מחמשת הכפתורים החדשים (`strike`, `link`, `image`, `hr`, `task`) יש `aria-label` בעברית, בלי אמוג'י; (2) תיבת הסימון של פריט משימה, שה-parser מייצר ב-`index.html`, נושאת `aria-label` בעברית שמתאר את המצב ("משימה פתוחה" או "משימה שהושלמה"); (3) ב-`md-visual-ui.js`, לחיצה על `Escape` בתוך פריט רשימה או תא טבלה מעבירה את הפוקוס מהעורך לכפתור הבא בסדר הטאב, כך שהמקלדת לא נלכדת (WCAG 2.1.2). להריץ `node --test test/visual-contract.test.js test/parser-v46-blocks.test.js` ולתעד את הכשל.
- [x] **Step 47** — Green: להוסיף `aria-label` בעברית לחמשת הכפתורים ב-`index.html`. להוסיף ל-`<input type="checkbox" disabled>` של המשימות `aria-label` שמתאר את המצב, ולעדכן את בדיקות ה-parser של המשימות כך שיכללו אותו, בלי לשנות את שאר המבנה. להוסיף ל-`md-visual-ui.js` טיפול ב-`Escape` שמשחרר את הפוקוס מהעורך. הממיר (`md-visual.js`) מתעלם מה-`aria-label`, ויש לוודא שה-round-trip לא משתנה. להריץ שוב.
- [x] **Step 48** — Refactor ואימות: להריץ `npm test` ואת כל חמשת קובצי ה-e2e (`NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules"`), כל אחד בנפרד, ולוודא שהכול ירוק.
- [x] **Step 49** — תכנון v4.7.0: לשמור את המסמך שצורף ב-`docs/ui-cross-cutting-guidelines.md`, כמו שהוא. להוסיף ל-`BACKLOG.md` סעיף "v4.7.0 — נגישות וייצוא לפי ההנחיות הרוחביות", עם הפריטים שלא יושמו: שני האייקונים הקבועים בכותרת והתנהגות הפאנלים (סעיף 1 במסמך); פאנל נגישות עם שבעת הרכיבים (סעיף 2.1: ערכת צבעים, ניגודיות גבוהה, גודל טקסט, הקראה, דלג לתוכן, איפוס, אזור הודעות חי); פאנל ייצוא עם חמשת הפורמטים (סעיף 3.1), כולל Word אמיתי (`.docx`, OOXML) במקום ה-`.doc` הקיים; כללי הייצוא (סעיף 3.2: LRM לטקסט מעורב, שמות קבצים, היקף לפי מה שמוצג); וקריטריוני הקבלה (סעיף 4). להוסיף גם את הערות הסוקר שנדחו (R-06, R-07, R-08) כפריטים לשיפור. להשאיר את הבדיקה `the backlog file exists and tracks the parser-extension follow-up` ב-`test/version-sync.test.js` ירוקה.
- [x] **Step 50** — תיעוד: להוסיף ל-`code-summary.md` סעיף על Revision 1, כולל שורות ה-Red שנכשלו ותוצאות ה-e2e.

## עקיבות שלבים ← קריטריונים

| קריטריון | שלבים |
|---|---|
| SC-1 קישורים | 18–20, 34, 36–37 |
| SC-2 תמונות | 21–23, 34, 36–37 |
| SC-3 קו מפריד | 3–5, 34, 36–37 |
| SC-4 תבליטים `-`/`+` | 6–8, 34 |
| SC-5 משימות | 9–11, 34, 36–37 |
| SC-6 קו חוצה | 15–17, 34, 36–37 |
| SC-7 רשימות מקוננות | 12–14, 34, 36–37 |
| SC-8 ציטוט רב-שורתי | 24–26, 34 |
| SC-9 יישור עמודות | 27–29, 34, 36–37 |
| SC-RTL | 30–32 |
| עיצוב ב-CSS Studio ומסמך הדוגמה (Q3) | 33–35 |
| תקשורת בסיום (Q7) | 39–40 |
| Loop-back 1: היעד E2E-SUITE מ-Build and Test | 42–45 |
| Revision 1: הנחיות נגישות לשינויי v4.6.0, ותכנון v4.7.0 | 46–50 |

## סיכונים

| סיכון | מענה |
|---|---|
| שבירת `parseMarkdown()` לחילוץ בבדיקות | כל קוד חדש נכתב בתוך `parseMarkdown()`, בלי שורה `    }` בהזחה של 4 רווחים |
| שגיאת escape בקוד הייצוא, כמו שקרה ב-v4.3.2 | `node --check` על הסקריפט שחולץ, בשלב 38 |
| שינוי בבדיקת 300 המסמכים האקראיים | ערכי קורפוס חדשים משנים את המסמכים שנוצרים. כל כשל כזה הוא באג אמיתי ב-round-trip, ולא מחלישים את הבדיקה |
| בדיקות e2e בדפדפן (`npm run e2e`) | הן לא חלק מ-`node --test`, ודורשות Playwright. `e2e/visual-editor.e2e.js` שורה 99 מצפה לשני ציטוטים נפרדים אחרי Enter. ייתכן שיהיה צורך לעדכן אותה, וזה יבדק בשלב Build and Test |
