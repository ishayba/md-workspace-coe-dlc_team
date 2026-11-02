# דרישות נגישות — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: NFR1 עד NFR6)
- `construction/functional-design/functional-spec.md` (functional-spec) ו-`rules.md` (rules: BR7.1 עד BR7.5, BR7.10)
- ‏`inception/refined-mockups/design-system-mapping.md` ו-`accessibility-checklist.md`
- תשובות שלב זה: Q7

הקובץ הזה נוסף מעבר לרשימת התוצרים של השלב, כי הנגישות היא עיקר הגרסה ולא נכנסת לאף אחת מהקטגוריות הרגילות.

## דרישות

| ID | דרישה | אימות |
|---|---|---|
| NFR1.1 | יעד: WCAG 2.1 AA ות״י 5568. בדיקות אוטומטיות מכסות את כל 24 הקריטריונים שב-`accessibility-checklist.md` שאפשר לבדוק באוטומציה | יחידה ו-e2e |
| NFR1.2 | בדיקה ידנית עם NVDA ו-VoiceOver לפי רשימת ה-QA | רשימת ה-QA |
| NFR1.3 | רשימת ה-QA (`docs/qa-checklist-v4.7.0.html`) מכסה את FR1 עד FR6 ואת NFR1 עד NFR4 | יחידה (BR6.2) |
| NFR1.4 | סקירה של מומחה נגישות חיצוני נרשמת ב-BACKLOG כמגבלה ידועה, בלי שזה יחסום את הגרסה | סקירת BACKLOG |
| NFR2.1 | ‏`a11y.contrast(fg, bg)` מחשב יחס WCAG (luminance יחסי, ‏sRGB) | יחידה מול ערכים ידועים: שחור על לבן 21, ‏`#767676` על לבן 4.54 |
| NFR2.2 | הבדיקה עוברת על רשימת זוגות קבועה, שנגזרת מ-`design-system-mapping.md`, ביום, בלילה, ב-`.hc` ביום וב-`.hc` בלילה. ספים: טקסט 4.5:1, וב-`.hc` ‏7:1; גבולות, פוקוס ורכיבים גרפיים 3:1. ערכי הטוקנים נקראים מה-CSS ב-`index.html`, ולא מועתקים לבדיקה | יחידה |
| NFR2.3 | הזוגות: טקסט ראשי ומשני על `--bg-app`, ‏`--bg-surface` ו-`--bg-surface-subtle`; ‏`--focus-ring` מול `--bg-app` ו-`--bg-surface`; ‏`--focus-ring-fg` על `--focus-ring`; לבן על `--selected-bg`, ‏`--accent-warning-strong` ו-`--badge-*`; ‏`--border-control` ו-`--dot-changed` מול `--bg-surface`; ‏`--reading-ring` מול לבן; טקסט הגלופה `#1f2937` על `--reading-bg` | יחידה |
| NFR3.1 | ב-150% ורוחב 400px: ‏`document.documentElement.scrollWidth <= clientWidth` במסך הראשי, כשכל פאנל פתוח. אף פקד בכותרת לא חתוך (`getBoundingClientRect` בתוך החלון) | ‏e2e |
| NFR4.1 | כל פקד חדש מגיע ב-Tab ומופעל ב-Enter או Space. בערכת הצבעים החיצים פועלים (BR2.1) | ‏e2e |
| NFR4.2 | ‏`:focus-visible` מציג outline של 3px לפחות, עם `--focus-ring` | ‏e2e: ‏`getComputedStyle` |
| NFR4.3 | אין מלכודת: מכל פאנל אפשר לצאת ב-Tab וב-Esc | ‏e2e |
| NFR4.4 | שטח לחיצה של 32x32px לפחות לכל פקד חדש בכותרת ובפאנלים | ‏e2e |
| NFR5.1 | כל `animation` ו-`transition` חדשים נמצאים בתוך `@media (prefers-reduced-motion: no-preference)`, ו-`.hc` מבטל אותם | יחידה: בדיקה סטטית על ה-CSS |
| NFR6.1 | בכללי ה-CSS החדשים ובארבעת הקבצים החדשים אין ערך hex, אלא רק בבלוקים של הגדרות טוקנים (`:root`, ‏`[data-theme="dark"]`, ‏`.hc`). הקוד המיוצא (תבניות HTML ו-docx) לא נכלל בבדיקה, כי הוא לא משתמש בטוקני הממשק (BR2.5) | יחידה: בדיקה סטטית |
