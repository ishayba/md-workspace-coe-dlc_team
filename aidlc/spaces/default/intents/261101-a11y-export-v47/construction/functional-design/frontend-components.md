# רכיבי ממשק — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements)
- ‏`inception/refined-mockups/interaction-spec.md` (מצבים, ARIA ומקלדת לכל רכיב). המסמך הזה לא חוזר על הפרטים ומוסיף מבנה, מצב ותלויות
- ‏`functional-spec.md` ו-`rules.md` בתיקייה הזו

## 1. היררכיה

```
<html data-theme class="hc?" style="--ax-zoom">
└─ body
   ├─ a.ax-skip                          (SkipLink, BR2.9)
   ├─ div#ax-live[role=status]           (LiveRegion, BR2.11)
   ├─ (body { zoom: var(--ax-zoom) }, ‏BR7.11. אין עטיפה נוספת)
   │  ├─ header.app-header
   │  │  ├─ .brand-group                 (קיים)
   │  │  └─ .header-actions
   │  │     ├─ .nav-pill-group           (קיים, בלי ארבעת כפתורי הייצוא)
   │  │     ├─ span.hdr-sep
   │  │     └─ .hdr-icons
   │  │        ├─ button.ax-stop-pill    (StopReadingPill, BR2.7)
   │  │        ├─ button#btn-a11y        (HeaderIconButton + נקודה, BR1.6)
   │  │        ├─ div#panel-a11y         (DropdownPanel)
   │  │        │  ├─ ColorSchemeSegmented
   │  │        │  ├─ HighContrastSwitch
   │  │        │  ├─ TextSizeStepper
   │  │        │  ├─ ReadAloudControls
   │  │        │  └─ a.ax-reset
   │  │        ├─ button#btn-export      (HeaderIconButton + aria-busy)
   │  │        └─ div#panel-export       (DropdownPanel)
   │  │           └─ ExportTile ×6 (+ קישור גיבוי PDF)
   │  ├─ .secondary-bar                  (קיים, בלי btn-theme-toggle)
   │  └─ main.workspace-main             (קיים)
   │     └─ #preview-content
   │        └─ div.print-head            (ראש להדפסה בלבד, BR4.2)
   └─ חלונות מודאליים קיימים            (בתוך body, ולכן מוגדלים יחד עם המסך)
```

## 2. מצב ותלויות

| רכיב | מצב שהוא קורא | מצב שהוא כותב | נשען על |
|---|---|---|---|
| HeaderIconButton (נגישות) | PanelState, ‏A11yPrefs.isDefault, ‏ReadingSession.state | ‏PanelState | ‏`MdA11y.isDefault` |
| HeaderIconButton (ייצוא) | PanelState, ‏ExportJob.state | ‏PanelState | — |
| DropdownPanel | PanelState | PanelState | — |
| ColorSchemeSegmented | A11yPrefs.theme | A11yPrefs.theme | ‏`MdA11y.normalizePrefs` |
| HighContrastSwitch | A11yPrefs.highContrast | אותו | — |
| TextSizeStepper | A11yPrefs.zoom | אותו | ‏`MdA11y.nextZoom`, ‏`MdA11y.ZOOM_LEVELS` |
| ReadAloudControls, StopReadingPill | ReadingSession | ReadingSession | ‏`MdA11y.buildSegments`, ‏`speechSynthesis` |
| ExportTile | ExportJob.state | ExportJob | ‏`MdExport.*`, ‏`buildCleanHtml`, ‏`buildLiveHtml`, ‏`downloadFile` |
| LiveRegion | — | — | ‏`notify(text, {announce})` |
| SkipLink | layout של `#workspace-main` | — | — |

אין מצב גלובלי חדש מעבר לשלושת האובייקטים: `prefs`, ‏`panel` ו-`reading` ב-`a11y-ui.js`, ו-`job` ב-`export-ui.js`. ‏`showToast` הקיים עובר דרך `notify`, ואת הקריאות הקיימות לא משנים.

## 3. שינויים ברכיבים קיימים

| רכיב קיים | שינוי | סיבה |
|---|---|---|
| ‏`#btn-export-interactive-html`, ‏`#btn-export-clean-html`, ‏`#btn-export-word`, ‏`#btn-print-doc` | מוסרים מהסרגל. הלוגיקה עוברת לפונקציות | FR3.1 |
| ‏`#btn-theme-toggle` | מוסר. ‏`mdw_theme` עובר לטיפול של A11yPrefs | FR2.1, FR2.2 |
| ‏`<body data-theme>` | עובר ל-`<html>` | FR2.1 |
| ‏`--text-muted` (יום), ‏`--border-strong` ו-`--text-muted` (לילה) | ערכים חדשים לפי `design-system-mapping.md` | NFR2 |
| ‏`md-visual-ui.js` — paste | WF8 | FR5.1, FR5.2 |
| ‏`md-visual-ui.js` — keydown | ‏`e.code` ו-`isComposing` | FR5.3, FR5.4 |
| ‏`md-visual-ui.js` — `releaseFocus` | בדיקת נראות אמיתית | FR5.5 |
| ‏`e2e/*` שמשתמשים בכפתורים שהוסרו | פותחים את פאנל הייצוא ובוחרים אריח | NFR10 |

## 4. תוויות ומחרוזות

כל המחרוזות החדשות בעברית מרוכזות בראש `a11y-ui.js` ו-`export-ui.js` כאובייקט `STR`, כדי שיהיה קל לבדוק אותן ולתקן ניסוח.
