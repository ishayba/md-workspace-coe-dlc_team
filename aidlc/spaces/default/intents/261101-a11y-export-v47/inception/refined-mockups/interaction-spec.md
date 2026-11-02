# מפרט אינטראקציה — v4.7.0 נגישות וייצוא

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements)
- `mockups.md` ו-`mockup-visual.html` בתיקייה הזו
- תשובות שלב זה: Q1 עד Q10
- הפורמט: `.kiro/knowledge/aidlc-design-agent/component-spec-template.md`

נקודות השבירה מותאמות לאפליקציה: עד 480px (נייד, פאנל לכל הרוחב), עד 720px (התוויות מוסתרות), ומעל 720px (מחשב).

---

## HeaderIconButton (אייקון נגישות / אייקון ייצוא)

| Field | Value |
|---|---|
| Component | HeaderIconButton |
| Description | כפתור קבוע בכותרת שפותח ומשייך פאנל נפתח |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| default | אייקון ותווית, `aria-expanded="false"` | טעינת הדף |
| hover | רקע `--bg-surface-subtle` | מעבר עכבר |
| focus | מסגרת 3px ‏`--focus-ring` (‏`:focus-visible`) | Tab |
| active (פאנל פתוח) | רקע `--highlight-bg`, מסגרת `--accent-primary`, ‏`aria-expanded="true"` | Enter, Space או לחיצה |
| changed (נגישות בלבד) | נקודה כתומה (`--dot-changed`). ה-`aria-label` הופך ל"נגישות — הוגדרו התאמות" | הגדרה שונה מברירת המחדל, או הקראה פועלת |
| loading (ייצוא בלבד) | סמל טעינה, תווית "מייצר קובץ…", ‏`aria-busy="true"` | ייצוא בתהליך |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| id | string | yes | — | ‏`btn-a11y` או `btn-export` |
| label | string | yes | — | "נגישות" או "ייצוא" |
| controls | string | yes | — | ה-id של הפאנל (`aria-controls`) |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| עד 480px | אייקון בלבד, ושטח לחיצה 32x32px. הכפתור נשאר בשורה הראשונה |
| עד 720px | אייקון בלבד (התווית מוסתרת, `aria-label` נשאר) |
| מעל 720px | אייקון ותווית |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` מקורי, עם `aria-haspopup="dialog"` (הפאנל הוא `dialog`, לא תפריט), ‏`aria-expanded` ו-`aria-controls` |
| Keyboard interaction | Tab להגעה, Enter או Space לפתיחה ולסגירה |
| Label / aria-label | `aria-label` בעברית תמיד, גם כשהתווית גלויה |
| Contrast ratio | 4.5:1 לטקסט, 3:1 לגבול ולמסגרת הפוקוס |
| Screen reader | "נגישות, כפתור, מכווץ" או "מורחב". בייצוא: "מייצר קובץ…" |
| Focus management | הפוקוס חוזר לכפתור בכל סגירה של הפאנל שלו |

### Usage Example

```
<button id="btn-a11y" class="hdr-icon" aria-haspopup="dialog" aria-expanded="false" aria-controls="panel-a11y" aria-label="נגישות">…</button>
```

---

## DropdownPanel (פאנל נגישות / פאנל ייצוא)

| Field | Value |
|---|---|
| Component | DropdownPanel |
| Description | פאנל שנפתח מתחת לאייקון. רק פאנל אחד פתוח בכל רגע |
| Category | layout |

### States

| State | Description | Trigger |
|---|---|---|
| closed | `hidden` | טעינה, Esc, לחיצה מחוץ לפאנל, ×, או בחירת אריח (ייצוא) |
| open | גלוי. הפוקוס עובר לפקד הראשון בפאנל | פתיחה מהאייקון |
| disabled tiles (ייצוא) | כל האריחים `aria-disabled="true"` | ייצוא בתהליך |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| id | string | yes | — | ‏`panel-a11y` או `panel-export` |
| labelledby | string | yes | — | כותרת הפאנל (`aria-labelledby`) |
| closeOnSelect | boolean | no | false | ‏true בפאנל הייצוא |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| עד 480px | נפרש לכל הרוחב מתחת לכותרת. בייצוא האריחים בטור אחד |
| 481px עד 720px | ‏320px, מעוגן לאייקון. בייצוא שני טורים |
| מעל 720px | ‏320px (ייצוא: 360px), מעוגן לאייקון, שני טורים |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `role="dialog"` לא מודאלי (`aria-modal="false"`) עם `aria-labelledby` |
| Keyboard interaction | Tab ו-Shift+Tab בתוך הפאנל ואל מחוצה לו (אין מלכודת). Esc סוגר |
| Label / aria-label | כותרת גלויה: "נגישות" או "ייצוא" |
| Contrast ratio | 4.5:1 לטקסט, 3:1 לגבולות |
| Screen reader | "נגישות, דיאלוג" בפתיחה |
| Focus management | בפתיחה: לפקד הראשון. בסגירה: לאייקון. כשחלון מודאלי פתוח, האייקונים לא נגישים מהמקלדת עד שהחלון נסגר (Q8 בשלב הדרישות, FR1.5) |

### Usage Example

```
<div id="panel-a11y" class="hdr-panel" role="dialog" aria-modal="false" aria-labelledby="panel-a11y-title" hidden>…</div>
```

---

## ColorSchemeSegmented (ערכת צבעים)

| Field | Value |
|---|---|
| Component | ColorSchemeSegmented |
| Description | בחירה בין אוטומטי, יום ולילה |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | ‏"◐ אוטומטי" מסומן (`aria-checked="true"`), או הערך מ-`mdw_theme` | טעינה |
| focus | מסגרת פוקוס על האפשרות המסומנת | Tab |
| selected | רקע `--selected-bg` וטקסט לבן (‏5.17:1) | לחיצה או חיצים |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| value | `system \| light \| dark` | yes | `system` | נכתב ל-`data-theme` על `<html>` |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| כל הרוחבים | שלושה מקטעים ברוחב שווה לכל רוחב הפאנל |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `radiogroup` עם שלושה `radio` |
| Keyboard interaction | Tab נכנס לאפשרות המסומנת (roving tabindex). חץ שמאלה הוא הבא, חץ ימינה הקודם (RTL), Home ו-End לקצוות. המעבר בוחר מיד |
| Label / aria-label | `aria-label="ערכת צבעים"` לקבוצה |
| Contrast ratio | 4.5:1 גם באפשרות המסומנת |
| Screen reader | "יום, לחצן בחירה, 2 מתוך 3, מסומן". האזור החי: "ערכת צבעים: יום" |
| Focus management | הפוקוס נשאר על האפשרות שנבחרה |

### Usage Example

```
<div role="radiogroup" aria-label="ערכת צבעים"><button role="radio" aria-checked="true" data-value="system">◐ אוטומטי</button>…</div>
```

---

## HighContrastSwitch (ניגודיות גבוהה)

| Field | Value |
|---|---|
| Component | HighContrastSwitch |
| Description | מתג להפעלת `.hc` על השורש |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| off | ‏`aria-checked="false"`, מסילה אפורה | ברירת מחדל |
| on | ‏`aria-checked="true"`, מסילה `--selected-bg`, והידית בצד השני | לחיצה, Space או Enter |
| focus | מסגרת פוקוס | Tab |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| checked | boolean | yes | false | נשמר ב-`mdw_a11y_hc` |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| כל הרוחבים | תווית מימין ומתג משמאל, בשורה אחת |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `switch`, עם `aria-checked` (ARIA 1.2, ראו FR2.3) |
| Keyboard interaction | Space או Enter מחליפים מצב |
| Label / aria-label | התווית הגלויה "ניגודיות גבוהה" מקושרת עם `aria-labelledby` |
| Contrast ratio | גבול המסילה 3:1 בשני המצבים |
| Screen reader | "ניגודיות גבוהה, מתג, פועל". האזור החי: "ניגודיות גבוהה הופעלה" או "כובתה" |
| Focus management | נשאר על המתג |

### Usage Example

```
<button role="switch" aria-checked="false" aria-labelledby="hc-label" id="ax-hc"></button>
```

---

## TextSizeStepper (גודל טקסט)

| Field | Value |
|---|---|
| Component | TextSizeStepper |
| Description | חמש רמות: 90, 100, 115, 130, 150 |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | ‏100% | ברירת מחדל |
| min | א− עם `aria-disabled="true"` | ‏90% |
| max | א+ עם `aria-disabled="true"` | ‏150% |
| focus | מסגרת פוקוס | Tab |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| level | `90 \| 100 \| 115 \| 130 \| 150` | yes | 100 | נשמר ב-`mdw_a11y_zoom` ונכתב ל-`--ax-zoom` |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| כל הרוחבים | שלושה פקדים בשורה. האחוז במרכז |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | שלושה `button`. כפתור האחוז הוא "איפוס גודל טקסט, כרגע 115%" |
| Keyboard interaction | Tab בין שלושת הכפתורים, Enter או Space להפעלה. כפתור מושבת נשאר בסדר הטאב עם `aria-disabled` |
| Label / aria-label | "הקטנת טקסט", "איפוס גודל טקסט", "הגדלת טקסט" |
| Contrast ratio | 4.5:1, ובמצב מושבת יש גם סמן טקסטואלי (`aria-disabled`) |
| Screen reader | האזור החי: "גודל טקסט 115%" |
| Focus management | נשאר על הכפתור שנלחץ |

### Usage Example

```
<button aria-label="הקטנת טקסט">א−</button><button aria-label="איפוס גודל טקסט, כרגע 100%">100%</button><button aria-label="הגדלת טקסט">א+</button>
```

---

## ReadAloudControls ו-StopReadingPill (הקראה)

| Field | Value |
|---|---|
| Component | ReadAloudControls, StopReadingPill |
| Description | הפעלה, עצירה והשהיה של הקראת המסמך בתצוגה המקדימה |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| idle | ‏"▶ הקראה" עם `aria-pressed="false"`. "השהיה" מושבת | ברירת מחדל |
| reading | ‏"■ עצירה" עם `aria-pressed="true"`. "השהיה" פעיל. הגלולה גלויה. האלמנט המוקרא עם מחלקה `.ax-reading`: מסגרת `--reading-ring` ורקע `--reading-bg`, קבועים בכל ערכה כי התצוגה המקדימה תמיד בהירה | לחיצה על ▶ |
| paused | "המשך" במקום "השהיה" | לחיצה על השהיה |
| unsupported | ▶ מושבת, ומתחתיו שורת הסבר | אין `speechSynthesis` |
| empty | הודעה "המסמך ריק", ההקראה לא מתחילה | מסמך ריק |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| root | element | yes | `#preview-content` | מקור האלמנטים להקראה |
| lang | string | yes | `he-IL` | שפת ההקראה |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| עד 480px | הגלולה מקוצרת ל-"■ עצירה". ה-`aria-label` המלא נשאר |
| מעל 480px | "■ עצירת הקראה" |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` עם `aria-pressed` |
| Keyboard interaction | Enter או Space. Esc עוצר את ההקראה מכל מקום בדף (כשאין פאנל פתוח. אם פאנל פתוח, Esc קודם סוגר את הפאנל) |
| Label / aria-label | "הקראת המסמך", "עצירת הקראה", "השהיית הקראה" או "המשך הקראה" |
| Contrast ratio | הגלולה: לבן על `--accent-warning-strong` ביחס 5:1 לפחות |
| Screen reader | האזור החי: "ההקראה התחילה" ו"ההקראה הסתיימה" |
| Focus management | הפוקוס לא זז בזמן ההקראה. הגלילה אוטומטית. אחרי עצירה מהגלולה הפוקוס עובר לאייקון הנגישות, כי הגלולה נעלמת |

### Usage Example

```
<button class="ax-stop-pill" aria-label="עצירת הקראה" hidden>■ עצירת הקראה</button>
```

---

## SkipLink (דלג לתוכן)

| Field | Value |
|---|---|
| Component | SkipLink |
| Description | הפקד הראשון בדף. מעביר פוקוס לאזור התוכן |
| Category | navigation |

### States

| State | Description | Trigger |
|---|---|---|
| hidden | מוסתר ויזואלית, אבל נגיש | ברירת מחדל |
| focus | גלוי בפינה, רקע `--focus-ring` וטקסט `--focus-ring-fg` (לבן ביום, כהה בלילה) | Tab ראשון |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| target | string | yes | `#md-input` | העורך. בפריסת "תצוגה מקדימה בלבד": `#preview-content` (H2 בדרישות) |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| כל הרוחבים | זהה |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `a` עם `href="#…"` |
| Keyboard interaction | Enter |
| Label / aria-label | "דלג לתוכן" |
| Contrast ratio | 4.5:1 |
| Screen reader | "דלג לתוכן, קישור" |
| Focus management | היעד מקבל פוקוס (עם `tabindex="-1"` כשצריך) |

### Usage Example

```
<a class="ax-skip" href="#md-input">דלג לתוכן</a>
```

---

## ExportTile (אריח ייצוא)

| Field | Value |
|---|---|
| Component | ExportTile |
| Description | כפתור ייצוא לפורמט אחד |
| Category | input |

### States

| State | Description | Trigger |
|---|---|---|
| default | תג, שם, שורת הסבר | פתיחת הפאנל |
| hover | גבול `--accent-primary` | עכבר |
| focus | מסגרת פוקוס 3px | Tab |
| disabled | ‏`aria-disabled="true"`, שקיפות, ושורת הסבר "ייצוא אחר בתהליך" או "הורדה לא זמינה" | ייצוא בתהליך או הורדה לא זמינה |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| format | `pdf \| html \| live \| print \| md \| docx` | yes | — | הפורמט |
| badge | string | yes | — | ‏PDF, ‏HTML, ‏PRINT, ‏MD או DOCX |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| עד 480px | טור אחד, האריח לכל הרוחב |
| מעל 480px | שני טורים |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `button` |
| Keyboard interaction | Tab בין האריחים לפי סדר הקריאה (ימין לשמאל, שורה אחרי שורה). Enter או Space מפעילים. הקישור "הורדת קובץ מוכן ל-PDF" הוא פקד נפרד ב-Tab |
| Label / aria-label | ‏`aria-label` מלא, למשל "ייצוא ל-Word, קובץ docx" |
| Contrast ratio | טקסט התג מול רקע התג 4.5:1 לפחות (ראו design-system-mapping) |
| Screen reader | השם ושורת ההסבר (`aria-describedby`) |
| Focus management | אחרי בחירה הפאנל נסגר והפוקוס חוזר לאייקון הייצוא |

### Usage Example

```
<button class="ex-tile" data-format="docx" aria-label="ייצוא ל-Word, קובץ docx" aria-describedby="ex-docx-desc"><span class="ex-badge">DOCX</span>…</button>
```

---

## LiveRegion ו-notify (אזור הודעות חי)

| Field | Value |
|---|---|
| Component | LiveRegion |
| Description | פונקציה אחת, `notify(text, {announce})`, שמציגה toast. כשההודעה משמעותית היא כותבת גם לאזור החי (Q9) |
| Category | feedback |

### States

| State | Description | Trigger |
|---|---|---|
| idle | ריק | ברירת מחדל |
| announcing | הטקסט מוחלף. הודעה זהה ברצף נשלחת שוב (ניקוי לפני כתיבה) | הודעה משמעותית מרשימת FR2.11 |

### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| text | string | yes | — | ההודעה בעברית |
| announce | boolean | no | false | ‏true להודעות שברשימת FR2.11 |

### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| כל הרוחבים | מוסתר ויזואלית |

### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `role="status"` עם `aria-live="polite"` ו-`aria-atomic="true"` |
| Keyboard interaction | אין |
| Label / aria-label | אין |
| Contrast ratio | לא רלוונטי (מוסתר) |
| Screen reader | מקריא את ההודעה בלי להזיז פוקוס |
| Focus management | אין שינוי |

### Usage Example

```
<div id="ax-live" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>
```

---

## מקלדת — סיכום גלובלי

| מקש | התנהגות |
|---|---|
| Tab הראשון בדף | "דלג לתוכן" |
| Esc | לפי סדר עדיפות: סוגר פאנל פתוח. אחרת עוצר הקראה. אחרת שחרור הפוקוס מהעורך הוויזואלי (התנהגות v4.6.0, עם בדיקת `isComposing`, ‏FR5.4) |
| Enter או Space על אייקון | פתיחה או סגירה של הפאנל |
| חיצים בערכת הצבעים | ב-RTL חץ שמאלה הוא הבא |
| Ctrl/Cmd+B ו-Ctrl/Cmd+I | מודגש ונטוי, גם בפריסה עברית (`e.code`, ‏FR5.3) |
