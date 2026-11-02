# ישויות — v4.7.0 נגישות וייצוא

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: FR1 עד FR6, NFR2, NFR11)
- `inception/refined-mockups/interaction-spec.md` ו-`design-system-mapping.md`
- תשובות שלב זה: `functional-design-questions.md`, ‏Q1 עד Q12
- הקוד הקיים, שמשמש במקום תכנון תחום (refactor, אין Units Generation ו-Domain Design): `index.html`, `md-visual-ui.js`

היחידה: יחידה אחת לכל הגרסה, `v47-a11y-export`.

## מודל הישויות (מקור האמת)

```yaml
entities:
  - name: A11yPrefs
    description: העדפות הנגישות של המשתמש, נשמרות בדפדפן
    attributes:
      - { name: theme, type: enum, required: true, allowed: [system, light, dark], default: system, constraints: "נשמר במפתח mdw_theme" }
      - { name: highContrast, type: boolean, required: true, default: false, constraints: "נשמר במפתח mdw_a11y_hc כ-1 או 0" }
      - { name: zoom, type: enum, required: true, allowed: [90, 100, 115, 130, 150], default: 100, constraints: "נשמר במפתח mdw_a11y_zoom" }
    entity_constraints:
      - "ערך לא חוקי שנקרא מהאחסון מוחלף בברירת המחדל"
      - "isDefault אמת רק כש-theme=system, highContrast=false ו-zoom=100"
    relationships:
      - { to: ReadingSession, cardinality: "1 to 0..1", direction: "A11yPrefs -> ReadingSession", note: "הקראה פעילה משפיעה על נקודת השינוי" }

  - name: ReadingSession
    description: הקראה אחת של המסמך בתצוגה המקדימה
    attributes:
      - { name: state, type: enum, required: true, allowed: [idle, reading, paused], default: idle }
      - { name: segments, type: list<Segment>, required: true, default: [] }
      - { name: index, type: integer, required: true, default: 0, min: 0 }
      - { name: voiceIsHebrew, type: boolean, required: true, default: false }
    entity_constraints:
      - "index קטן ממספר הקטעים כש-state אינו idle"
      - "לא נשמר בין כניסות"
    relationships:
      - { to: Segment, cardinality: "1 to 0..n", direction: "ReadingSession -> Segment" }

  - name: Segment
    description: יחידת הקראה אחת, שמקושרת לאלמנט גלוי בתצוגה המקדימה
    attributes:
      - { name: kind, type: enum, required: true, allowed: [heading, paragraph, listItem, task, quote, tableRow, codeNotice, diagramNotice] }
      - { name: text, type: string, required: true, constraints: "לא ריק אחרי trim" }
      - { name: target, type: element-ref, required: true, constraints: "האלמנט שמודגש וגולל לתצוגה" }

  - name: PanelState
    description: מצב הפאנלים בכותרת
    attributes:
      - { name: open, type: enum, required: true, allowed: [none, a11y, export], default: none }
      - { name: opener, type: element-ref, required: false, constraints: "האייקון שפתח, יעד החזרת הפוקוס" }
    entity_constraints:
      - "לכל היותר פאנל אחד פתוח"

  - name: ExportJob
    description: ייצוא אחד שהמשתמש הפעיל
    attributes:
      - { name: format, type: enum, required: true, allowed: [pdf, pdf-file, html, live, print, md, docx] }
      - { name: state, type: enum, required: true, allowed: [idle, busy, done, failed, rejected-empty], default: idle }
      - { name: fileName, type: ExportFileName, required: false, constraints: "לא קיים ל-pdf ול-print" }
      - { name: asOf, type: date, required: true, constraints: "התאריך המקומי בזמן ההפעלה" }
    entity_constraints:
      - "לכל היותר ExportJob אחד במצב busy"
    relationships:
      - { to: Block, cardinality: "1 to 0..n", direction: "ExportJob -> Block", note: "רק md ו-docx" }

  - name: Block
    description: בלוק מסמך שנבנה מטקסט ה-Markdown
    attributes:
      - { name: type, type: enum, required: true, allowed: [h1, h2, h3, h4, h5, h6, p, list, table, code, quote, hr, diagram, image, dirRegion] }
      - { name: runs, type: list<Run>, required: false, constraints: "ל-h*, p, quote ולפריטי רשימה ותאי טבלה" }
      - { name: ordered, type: boolean, required: false, constraints: "רק list" }
      - { name: items, type: list<ListItem>, required: false, constraints: "רק list; ListItem = runs, task (none|open|done), level 0..n" }
      - { name: header, type: list<Cell>, required: false, constraints: "רק table" }
      - { name: rows, type: list<list<Cell>>, required: false, constraints: "רק table" }
      - { name: align, type: list<enum>, required: false, allowed: [none, left, center, right], constraints: "רק table, באורך מספר העמודות" }
      - { name: text, type: string, required: false, constraints: "code ו-diagram: המקור כמו שהוא" }
      - { name: lang, type: string, required: false, constraints: "code" }
      - { name: alt, type: string, required: false, constraints: "image" }
      - { name: url, type: string, required: false, constraints: "image; עובר safeUrl" }
      - { name: dir, type: enum, required: false, allowed: [rtl, ltr], constraints: "dirRegion" }
      - { name: children, type: list<Block>, required: false, constraints: "dirRegion" }

  - name: Run
    description: קטע טקסט עם עיצוב אחיד בתוך בלוק
    attributes:
      - { name: text, type: string, required: true }
      - { name: bold, type: boolean, default: false }
      - { name: italic, type: boolean, default: false }
      - { name: strike, type: boolean, default: false }
      - { name: code, type: boolean, default: false }
      - { name: href, type: string, required: false, constraints: "רק כתובות ש-safeUrl מאשרת" }

  - name: ExportFileName
    description: שם הקובץ המיוצא
    attributes:
      - { name: base, type: string, required: true, max: 80, constraints: "כותרת אחרי ניקוי, או md-workspace" }
      - { name: date, type: string, required: true, constraints: "YYYY-MM-DD" }
      - { name: ext, type: enum, required: true, allowed: [html, md, docx] }

  - name: DocxPackage
    description: קובץ docx כ-ZIP במצב STORE
    attributes:
      - { name: parts, type: map<path, bytes>, required: true, constraints: "[Content_Types].xml, _rels/.rels, word/document.xml, word/styles.xml, word/numbering.xml, word/settings.xml, word/_rels/document.xml.rels, docProps/core.xml" }
      - { name: crc, type: map<path, uint32>, required: true }

  - name: QaChecklistItem
    description: פריט ברשימת הבדיקות ל-QA
    attributes:
      - { name: id, type: string, required: true, unique: true, constraints: "למשל QA-FR3.8-1" }
      - { name: requirement, type: string, required: true, constraints: "מזהה FR או NFR" }
      - { name: text, type: string, required: true }
      - { name: status, type: enum, allowed: [unchecked, pass, fail], default: unchecked }
      - { name: note, type: string, required: false }
    relationships:
      - { to: QaChecklistState, cardinality: "n to 1", direction: "QaChecklistItem -> QaChecklistState" }

  - name: QaChecklistState
    description: מצב הרשימה כולה, נשמר ב-localStorage ובעותק שמור
    attributes:
      - { name: storageKey, type: string, required: true, default: "mdw_qa_v470" }
      - { name: tester, type: string, required: false }
      - { name: updatedAt, type: datetime, required: false }
```

## סיכום

| ישות | תפקיד | איפה חיה |
|---|---|---|
| A11yPrefs | ערכה, ניגודיות וגודל | ‏`a11y.js` (ניתוח וניקוי ערכים), ‏`a11y-ui.js` (החלה על `<html>`) |
| ReadingSession, Segment | הקראה | ‏`a11y.js` (בניית קטעים מתיאור בלוקים), ‏`a11y-ui.js` (‏`speechSynthesis`) |
| PanelState | פאנל פתוח ויעד פוקוס | ‏`a11y-ui.js` (רכיב פאנל משותף) |
| ExportJob | ייצוא אחד ומצבו | ‏`export-ui.js` |
| Block, Run | מודל המסמך ל-MD ול-Word | ‏`export-core.js` |
| ExportFileName | שם הקובץ | ‏`export-core.js` |
| DocxPackage | קובץ ה-docx | ‏`export-core.js` (XML, ‏ZIP, ‏CRC32) |
| QaChecklistItem, QaChecklistState | רשימת ה-QA | ‏`docs/qa-checklist-v4.7.0.html` |
