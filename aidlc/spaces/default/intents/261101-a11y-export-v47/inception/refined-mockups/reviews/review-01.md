**Reviewer:** aidlc-product-lead-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| Severity | Location | Finding | Required action |
|---|---|---|---|
| Major | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/interaction-spec.md > SkipLink (States, focus) וגם design-system-mapping.md > טבלה 3 (`--focus-ring`) | ה-SkipLink מוגדר ברקע `--focus-ring` עם טקסט לבן ועם יחס ניגודיות 4.5:1. בלילה `--focus-ring` הוא `#93c5fd`, ובניגודיות גבוהה בלילה `#fde047`. לבן על שניהם הוא בערך 1.5:1 עד 2:1. הטענה בטבלה סותרת את הערכים, והמוקאפ מציג רק את מצב היום. | להגדיר צבע טקסט מטוקן לדילוג (למשל טקסט כהה בלילה), או רקע נפרד לקישור הדילוג. לציין את היחס המחושב לכל ערכה, כולל `.hc`. |
| Major | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/design-system-mapping.md > טבלה 3 (`--focus-ring`, שורת היחסים) וגם mockups.md > מסך 5 | מסגרת האלמנט המוקרא נמצאת בתצוגה המקדימה, שנשארת לבנה בכל ערכה (FR2.5). היחסים שנטענו (6.70:1 ביום, 8.11:1 בלילה) חושבו מול רקע הממשק. מול לבן, `#93c5fd` ו-`#fde047` הם בערך 1.3:1 עד 1.9:1, ולכן לא עומדים ב-3:1 (NFR2, WCAG 1.4.11). במוקאפ המסגרת נראית רק בזכות הרקע הכהה של `--highlight-bg`. | להוסיף טוקן נפרד למסגרת ההקראה בתוך התצוגה המקדימה (עם יחס 3:1 לפחות מול לבן), או לקבוע שהמסגרת נשענת על הרקע המסומן ולחשב את היחס שלו. לתקן את טבלת היחסים. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/mockup-visual.html > מסך 2 (כפתור ×, כפתורי א−/א+/הקראה/השהיה) | המוקאפ צובע גבולות של פקדים חדשים בפאנל ב-`--border-strong` (`#cbd5e1`, כ-1.48:1). זה סותר את design-system-mapping §2, שקובע `--border-control` לכל פקד חדש. במסך הם נראים חיוורים, והאישור עלול לבסס ציפייה שגויה. | להחליף במוקאפ ל-`--border-control` בכפתור ×, בכפתורי הגודל ובכפתורי ההקראה. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/design-system-mapping.md > סעיף 2 ו-3 (טוקני לילה) | הבדיקה כיסתה בעיקר את מצב היום. טוקנים בלילה שלא נבדקו: לבן על `--accent-primary` (`#3b82f6`) הוא כ-3.7:1 באפשרות המסומנת בבקרה המפולחת (הספק דורש 4.5:1). `--text-muted` (`#94a3b8`) על `--bg-surface-subtle` (`#334155`) הוא כ-4.1:1. | להוסיף לטבלת היחסים את זוגות הלילה האלה, ולתקן ערכים שנמצאים מתחת ל-4.5:1 (NFR2). |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/interaction-spec.md > HeaderIconButton (ARIA role, `aria-haspopup="true"`) | ‏`aria-haspopup="true"` מציין תפריט. הפאנל הוא `role="dialog"`, ולכן הערך הנכון הוא `dialog`. הקריינות שנכתבה ("כפתור, מכווץ") גם לא מזכירה חלון קופץ. | לשנות ל-`aria-haspopup="dialog"` במפרט ובדוגמת הקוד, ולעדכן את תיאור הקריינות. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/mockup-visual.html > מסך 4 (toast ושורת ההסבר) וגם mockups.md > מסך 4 | המסך מציג יחד את מצב הטעינה (`aria-busy`) ואת הודעת ההצלחה, אבל לפי FR4.6 אלה שני מצבים עוקבים. שם הקובץ בתוך ה-toast מוצג עם סדר מילים הפוך (`docx.2026-11-01-...`), כי שם הקובץ לא עטוף ב-`<bdi>`. זה בדיוק בעיית הכיוון ש-FR4.3 נועד לפתור. | לפצל את מסך 4 לשני מצבים (4א טעינה, 4ב הצלחה), או לציין בכיתוב שהם עוקבים. לעטוף את שם הקובץ ב-`<bdi dir="ltr">`. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/mockup-visual.html > סעיף כללי (מצבים) וגם mockups.md > "מצבים לכל מסך" | המצבים ריק, שגיאה, אריחים מושבתים והקראה לא נתמכת מתוארים רק בטבלת טקסט. הם לא מוצגים ויזואלית, למרות בקשת המשתמש למוקאפ מוחשי למי שמאשר. | להוסיף למוקאפ הוויזואלי מסך או רצועה קטנה שמראים את ארבעת המצבים (הודעת "המסמך ריק", toast שגיאה, אריחים מושבתים, הסבר "הדפדפן לא תומך בהקראה"). |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/inception/refined-mockups/mockups.md > מסך 2 (תרשים ASCII של גודל הטקסט) | התרשים מציג `[א+] 115% [א−]`, ובמוקאפ הוויזואלי א− מימין ו-א+ משמאל. הסדר שונה בין המסמכים, ובפאנל RTL הוא משפיע על הציפייה ועל סדר הטאב. | ליישר את התרשים למוקאפ (או להפך) ולציין את הסדר בספק הרכיב TextSizeStepper. |

### סיכום

כיסוי FR1 עד FR4 מלא: כל הדרישות מיוצגות במסכים ובמפרט האינטראקציה, והתשובות Q1–Q10 עקביות בין המוקאפ הוויזואלי, mockups.md ו-interaction-spec. אין סתירות בדרישות. המוקאפ הוויזואלי קריא לצופה לא טכני, עם תגיות הפניה ומקרא. שני ממצאי Major הם ניגודיות בלילה וב-`.hc` (קישור הדילוג ומסגרת ההקראה על רקע לבן). לשניהם יש תיקון ברור ואינם חוסמים את העיצוב. שאר הממצאים הם Minor.

**Verdict:** READY

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
