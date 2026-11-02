# כללים עסקיים — v4.7.0 נגישות וייצוא

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements)
- `inception/refined-mockups/interaction-spec.md`, ‏`design-system-mapping.md`
- תשובות שלב זה: Q1 עד Q12

## הכללים (מקור האמת)

```yaml
rules:
  # BR1 — אייקונים ופאנלים
  - { id: BR1.1, statement: "שני אייקונים בכותרת, נגישות ואחריו ייצוא, גלויים בכל פריסה", category: constraint, applies_to: PanelState, trigger: "טעינה ושינוי פריסה", logic: "IF הדף נטען THEN שני הכפתורים קיימים בסדר הזה וגלויים", violation: "בדיקה נכשלת", source: FR1.1 }
  - { id: BR1.2, statement: "לכל אייקון aria-label בעברית, aria-haspopup=dialog ו-aria-expanded שמשקף את הפאנל", category: constraint, applies_to: PanelState, trigger: "כל שינוי ב-open", logic: "IF open=X THEN aria-expanded של האייקון X הוא true ושל האחר false", violation: "בדיקה נכשלת", source: FR1.2 }
  - { id: BR1.3, statement: "הפאנלים סגורים בטעינה, ולכל היותר אחד פתוח", category: constraint, applies_to: PanelState, trigger: "פתיחה", logic: "IF נפתח פאנל X ופאנל Y פתוח THEN Y נסגר קודם", violation: "—", source: FR1.3 }
  - { id: BR1.4, statement: "סגירה ב-Esc, בלחיצה מחוץ לפאנל, ב-× או בבחירת אריח. הפוקוס חוזר לאייקון", category: policy, applies_to: PanelState, trigger: "אחד מארבעת האירועים", logic: "IF הפאנל נסגר THEN open=none ו-opener.focus()", violation: "—", source: FR1.4 }
  - { id: BR1.5, statement: "כשחלון מודאלי פתוח, הפאנלים לא נפתחים והפוקוס נשאר בחלון", category: policy, applies_to: PanelState, trigger: "פתיחת פאנל", logic: "IF יש חלון מודאלי גלוי THEN בקשת הפתיחה נדחית", violation: "הבקשה מתעלמת", source: FR1.5 }
  - { id: BR1.6, statement: "נקודת שינוי על אייקון הנגישות כש-!isDefault או כשהקראה פועלת, עם aria-label חלופי", category: calculation, applies_to: A11yPrefs, trigger: "שינוי העדפה או מצב הקראה", logic: "IF !isDefault OR state!=idle THEN הנקודה גלויה ו-aria-label='נגישות — הוגדרו התאמות'", violation: "—", source: FR1.6 }

  # BR2 — העדפות נגישות והקראה
  - { id: BR2.1, statement: "theme נכתב ל-data-theme על <html>. ב-system ה-CSS לפי prefers-color-scheme", category: calculation, applies_to: A11yPrefs, trigger: "בחירה בבקרה המפולחת", logic: "IF theme נבחר THEN html[data-theme]=theme", violation: "—", source: FR2.1 }
  - { id: BR2.2, statement: "מעבר מגרסה קודמת: mdw_theme=light|dark נשמר, אחרת system", category: validation, applies_to: A11yPrefs, trigger: "טעינה", logic: "IF הערך השמור הוא light או dark או system THEN משתמשים בו ELSE system", violation: "ערך אחר מוחלף ב-system", source: FR2.2 }
  - { id: BR2.3, statement: "ניגודיות גבוהה מוסיפה .hc לשורש. role=switch עם aria-checked", category: calculation, applies_to: A11yPrefs, trigger: "החלפת המתג", logic: "IF highContrast THEN html.classList כולל hc", violation: "—", source: FR2.3 }
  - { id: BR2.4, statement: "חמש רמות גודל. הגדלה והקטנה זזות רמה אחת ונעצרות בקצה. לחיצה על האחוז מחזירה ל-100", category: calculation, applies_to: A11yPrefs, trigger: "א+, א− או האחוז", logic: "IF בקצה THEN הכפתור aria-disabled והרמה לא משתנה ELSE רמה הבאה; --ax-zoom=רמה/100", violation: "—", source: FR2.4 }
  - { id: BR2.5, statement: "zoom חל על כל המסך. ערכה וניגודיות חלות על הממשק והעורך ולא על התצוגה המקדימה ולא על קבצים מיוצאים", category: policy, applies_to: A11yPrefs, trigger: "כל שינוי", logic: "IF בונים קובץ מיוצא THEN לא נקראים טוקני הממשק", violation: "בדיקה נכשלת", source: "FR2.5, FR3.10" }
  - { id: BR2.6, statement: "ההקראה בונה קטעים מהבלוקים הגלויים בתצוגה המקדימה לפי הסדר. טבלה בשורות 'כותרת: ערך'. קוד ותרשים רק מוכרזים", category: calculation, applies_to: ReadingSession, trigger: "לחיצה על ▶", logic: "FOR כל בלוק גלוי: heading/p/li/blockquote -> טקסט (aria-label קודם ל-innerText); task -> 'משימה פתוחה/סגורה: '+טקסט; tr -> צירוף 'כותרת: ערך'; pre -> 'בלוק קוד'; diagram -> 'תרשים'", violation: "קטע ריק מדולג", source: FR2.6 }
  - { id: BR2.7, statement: "כפתור עצירה בכותרת גלוי כל עוד state!=idle", category: constraint, applies_to: ReadingSession, trigger: "שינוי state", logic: "IF state!=idle THEN הגלולה גלויה ELSE מוסתרת", violation: "—", source: FR2.7 }
  - { id: BR2.8, statement: "בלי קול עברי: הודעה והמשך בקול ברירת מחדל. בלי speechSynthesis: הכפתור מושבת עם הסבר. מסמך ריק: הודעה בלי הקראה", category: validation, applies_to: ReadingSession, trigger: "הפעלת הקראה", logic: "IF !speechSynthesis THEN disabled; ELSE IF segments ריק THEN הודעה; ELSE IF אין קול he THEN הודעה והמשך", violation: "הודעה בעברית", source: FR2.8 }
  - { id: BR2.9, statement: "דלג לתוכן הוא הפקד הראשון ומעביר פוקוס לעורך, או לתצוגה המקדימה בפריסת תצוגה בלבד", category: policy, applies_to: PanelState, trigger: "הפעלת הקישור", logic: "IF layout=preview THEN focus(#preview-content) ELSE focus(העורך הפעיל)", violation: "—", source: FR2.9 }
  - { id: BR2.10, statement: "איפוס מחזיר system, highContrast=false, zoom=100 ועוצר הקראה", category: policy, applies_to: A11yPrefs, trigger: "קישור האיפוס", logic: "THEN A11yPrefs=ברירות מחדל; ReadingSession.state=idle", violation: "—", source: FR2.10 }
  - { id: BR2.11, statement: "הודעות משמעותיות נכתבות לאזור החי, בנוסף ל-toast", category: policy, applies_to: "notify", trigger: "שינוי ערכה, ניגודיות, גודל; התחלה וסיום הקראה; איפוס; ייצוא הצליח או נכשל", logic: "IF announce THEN live.textContent='' ואז הטקסט", violation: "—", source: FR2.11 }
  - { id: BR2.12, statement: "A11yPrefs נשמרים במפתחות mdw_theme, mdw_a11y_hc, mdw_a11y_zoom. אם האחסון לא זמין, בזיכרון בלבד בלי שגיאה", category: policy, applies_to: A11yPrefs, trigger: "כל שינוי", logic: "TRY setItem CATCH התעלמות", violation: "—", source: FR2.12 }
  - { id: BR2.13, statement: "סדר עדיפות ל-Esc: הרכבת IME, חלון מודאלי פתוח, פאנל פתוח, הקראה פעילה, ואז שחרור הפוקוס מהעורך הוויזואלי", category: policy, applies_to: PanelState, trigger: "keydown Escape, מאזין יחיד ב-capture על document ב-a11y-ui.js", logic: "IF isComposing OR keyCode==229 THEN כלום; ELSE IF חלון מודאלי גלוי THEN לא מטפלים (החלון סוגר את עצמו, וההקראה ממשיכה); ELSE IF open!=none THEN סגירה + stopPropagation; ELSE IF reading THEN עצירה + stopPropagation; ELSE לא מטפלים, ומאזין העורך הקיים משחרר פוקוס", violation: "—", source: "FR1.4, FR2.6, FR5.4" }

  # BR3 — פאנל הייצוא
  - { id: BR3.1, statement: "שישה אריחים בסדר PDF, HTML לצפייה, HTML חי, הדפסה, Markdown, Word. הפאנל נסגר אחרי בחירה. ארבעת כפתורי הייצוא הישנים יוצאים מהסרגל. 'שמור MD' נשאר", category: constraint, applies_to: ExportJob, trigger: "פתיחה ובחירה", logic: "IF אריח נבחר THEN סגירת הפאנל ואז הפעלת הייצוא", violation: "—", source: "FR3.1, FR3.2" }
  - { id: BR3.2, statement: "PDF פותח הדפסה עם הנחיה. הגיבוי מוריד HTML שפותח הדפסה בעצמו, A4 לאורך, print-color-adjust: exact", category: policy, applies_to: ExportJob, trigger: "אריח PDF או קישור הגיבוי", logic: "pdf -> הודעה ואז window.print(); pdf-file -> HTML עם סקריפט הדפסה יחיד וקבוע", violation: "—", source: FR3.3 }
  - { id: BR3.3, statement: "HTML לצפייה בלבד: קובץ אחד, RTL, בלי סקריפטים, ערכי צבע סופיים. גיבוי ה-PDF הוא אותה בנייה עם autoPrint, שמוסיף סקריפט אחד קבוע (window.print בטעינה) ושום דבר מתוכן המשתמש", category: constraint, applies_to: ExportJob, trigger: "אריח HTML או קישור הגיבוי", logic: "בלי autoPrint: אין <script ואין on*= ; עם autoPrint: בדיוק <script> אחד, זהה למחרוזת הקבועה", violation: "בדיקה נכשלת", source: "FR3.4, NFR9" }
  - { id: BR3.4, statement: "HTML חי שומר את ההתנהגות הקיימת ולא כולל את אייקוני הנגישות והייצוא", category: constraint, applies_to: ExportJob, trigger: "אריח HTML חי", logic: "הפלט לא מכיל btn-a11y ו-btn-export", violation: "בדיקה נכשלת", source: FR3.5 }
  - { id: BR3.5, statement: "הדפסה מסתירה כותרת, סרגלים, פאנלים ועורך, ומונעת שבירה של טבלאות, קוד ותרשים", category: constraint, applies_to: ExportJob, trigger: "@media print", logic: "break-inside: avoid ל-table, pre, .mermaid-diagram-container", violation: "—", source: FR3.6 }
  - { id: BR3.6, statement: "Markdown עטוף ב-<div dir=\"rtl\" lang=\"he\">, מתחיל בכותרת ושורת 'נכון ל-', ונבנה מהבלוקים", category: calculation, applies_to: Block, trigger: "אריח Markdown", logic: "פלט = div פתיחה + '# '+כותרת + 'נכון ל-'+תאריך + serialize(blocks עם LRM) + '</div>'", violation: "—", source: FR3.7 }
  - { id: BR3.7, statement: "docx אמיתי שנפתח בלי הודעת תיקון: חלקים, Content Types ו-rels מלאים (WF7.1); w:bidi בפסקאות עבריות; פיצול רצים לפי כתב, עם w:rtl ו-w:bCs/w:iCs לעברית; w:bidiVisual, tblGrid, tcW ו-tblHeader בטבלאות; יישור לוגי start/end; w:num נפרד לכל רשימה ממוספרת; סדר אלמנטים לפי הסכימה; xml:space=preserve; Arial (ascii, hAnsi, cs); A4 לאורך", category: constraint, applies_to: DocxPackage, trigger: "אריח Word", logic: "WF7.1 עד WF7.6", violation: "בדיקת יחידה נכשלת", source: "FR3.8, Q5, Q6" }
  - { id: BR3.8, statement: "Markdown ו-Word נבנים מאותה רשימת בלוקים, ולכן הטקסט בהם זהה", category: constraint, applies_to: Block, trigger: "בניית ייצוא", logic: "parseBlocks נקראת פעם אחת לכל פורמט מאותו מקור", violation: "בדיקה נכשלת", source: FR3.9 }
  - { id: BR3.9, statement: "תרשים: ב-MD המקור כמו שהוא; ב-Word כותרת 'תרשים (Mermaid), קוד המקור' ובלוק קוד LTR", category: policy, applies_to: Block, trigger: "בלוק diagram", logic: "type=diagram -> לפי הפורמט", violation: "—", source: "FR3.8, Q3" }
  - { id: BR3.10, statement: "תמונה ב-Word: טקסט החלופה וקישור, בלי הטמעה ובלי בקשת רשת", category: policy, applies_to: Block, trigger: "בלוק image", logic: "type=image -> פסקה '[תמונה: alt]'. קישור (בתמונה ובכל רץ) נוצר רק ל-http, https ו-mailto שעברו safeUrl; עוגן ונתיב יחסי נשארים טקסט בלבד", violation: "כתובת לא בטוחה או לא חיצונית נשארת טקסט", source: "FR3.8, Q4" }
  - { id: BR3.11, statement: "כל טקסט שנכנס ל-XML של docx עובר escaping. קישורים רק אחרי safeUrl. אין טעינת משאבים מבחוץ", category: validation, applies_to: DocxPackage, trigger: "בניית XML", logic: "& < > \" ' מוחלפים; תווי בקרה לא חוקיים ב-XML 1.0 מוסרים", violation: "בדיקה נכשלת", source: NFR9 }

  # BR4 — כללי ייצוא
  - { id: BR4.1, statement: "היקף הייצוא הוא המסמך הנוכחי עם הגלופה שנבחרה. לפני קריאת המקור מסנכרנים את העורך הוויזואלי. הכותרת היא #doc-title, אחריה ה-h1 הראשון, ואחר כך md-workspace", category: policy, applies_to: ExportJob, trigger: "כל ייצוא", logic: "visualUI.flush(); מקור = mdInput.value (md, docx) או #preview-content (html, live, pdf, print); title = docTitle.trim() || h1 ראשון || 'md-workspace'", violation: "—", source: FR4.1 }
  - { id: BR4.2, statement: "בכל קובץ כותרת ושורה 'נכון ל-DD.MM.YYYY'. בהדפסה ראש שמוצג רק ב-print", category: calculation, applies_to: ExportJob, trigger: "כל ייצוא", logic: "asOf בפורמט DD.MM.YYYY", violation: "—", source: "FR4.2, Q9" }
  - { id: BR4.3, statement: "LRM סביב כל ביטוי לטיני או מספרי ביחידת טקסט (פסקה, כותרת, פריט, תא) שיש בה עברית, רק ב-MD וב-Word. ביחידה בלי עברית: LTR מפורש. לא בקוד, בתרשים, ב-href וב-alt", category: calculation, applies_to: Run, trigger: "סריאליזציה ל-md ול-docx, אחרי parseRuns, על text של רצים שאינם קוד", logic: "ביטוי = W(SEP W)* כש-W=[A-Za-z0-9]+ ו-SEP=אחד מ-[._/:+#-] או רווח יחיד, כשמשני צדדיו W. תווי חיבור בקצה (נקודה, מקף, נקודתיים) לא נכללים. IF ביחידה יש [\\u0590-\\u05FF] THEN כל ביטוי נעטף ב-U+200E משני צדדיו. אידמפוטנטי: ביטוי שכבר צמוד ל-U+200E לא נעטף שוב. מקרים בנספח A ב-functional-spec", violation: "—", source: FR4.3 }
  - { id: BR4.4, statement: "שם קובץ <כותרת>-<YYYY-MM-DD>.<סיומת>. מוסרים \\ / : * ? \" < > | ותווי בקרה, רווחים ל-'-', עד 80 תווים. ריק -> md-workspace", category: calculation, applies_to: ExportFileName, trigger: "כל ייצוא שמוריד קובץ", logic: "base=clean(title)||'md-workspace'", violation: "—", source: FR4.4 }
  - { id: BR4.5, statement: "דחיית ההורדה על ידי המשתמש אינה שגיאה", category: policy, applies_to: ExportJob, trigger: "הורדה", logic: "אין זיהוי של דחייה ואין הודעת שגיאה", violation: "—", source: FR4.5 }
  - { id: BR4.6, statement: "בזמן יצירה: אייקון הייצוא aria-busy=true ותווית 'מייצר קובץ…', האריחים aria-disabled, הודעה באזור החי. בין סימון busy לבנייה יש yield (שני requestAnimationFrame), כדי שהמצב יצויר ויוכרז. בסיום: חזרה והודעת הצלחה עם שם הקובץ. ב-pdf וב-print חוזרים ל-idle מיד אחרי window.print(), בלי הודעת הצלחה", category: policy, applies_to: ExportJob, trigger: "התחלה וסיום", logic: "busy -> yield -> build -> done|failed -> idle", violation: "—", source: FR4.6 }
  - { id: BR4.7, statement: "שגיאה: הודעה קצרה בעברית (toast ואזור חי), חזרה ל-idle. הורדה לא זמינה: האריחים מושבתים עם הסבר", category: policy, applies_to: ExportJob, trigger: "חריגה או חוסר תמיכה", logic: "CATCH -> failed -> notify", violation: "—", source: FR4.7 }
  - { id: BR4.8, statement: "מסמך ריק או רק רווחים: 'המסמך ריק', בלי קובץ ובלי חלון הדפסה, בכל ששת האריחים", category: validation, applies_to: ExportJob, trigger: "לפני כל ייצוא", logic: "IF mdInput.value.trim()=='' THEN rejected-empty", violation: "הודעה", source: FR4.8 }
  - { id: BR4.9, statement: "לכל היותר ייצוא אחד בבת אחת", category: constraint, applies_to: ExportJob, trigger: "בקשת ייצוא", logic: "IF קיים job במצב busy THEN הבקשה נדחית", violation: "התעלמות", source: FR4.6 }

  # BR5 — הערות הסקירה
  - { id: BR5.1, statement: "unwrapPastedSpans מטפלת רק ב-span[style] שלא היו בצילום שנלקח לפני ה-exec של ההדבקה", category: constraint, applies_to: "העורך הוויזואלי", trigger: "אחרי הדבקה, באותו טיק", logic: "added = spans אחרי - spans לפני; IF added ריק THEN אין שינוי DOM ELSE unwrap(added)", violation: "בדיקה נכשלת", source: FR5.1 }
  - { id: BR5.2, statement: "ענפי ההדבקה הקיימים נשמרים (insertText לתא, רשימה וכותרת; insertHTML לגוף). כשלא נוספו span-ים אין שינוי DOM נוסף, וההדבקה היא צעד ביטול אחד", category: policy, applies_to: "העורך הוויזואלי", trigger: "paste", logic: "e2e: הדבקה בגוף, בתא וברשימה; Ctrl/Cmd+Z מחזיר את המצב שלפני; Ctrl/Cmd+Shift+Z מחזיר את ההדבקה (Chromium). אם בגוף נוצרים span-ים והביטול נפגע, נרשם כמגבלה ב-BACKLOG", violation: "בדיקה נכשלת או מגבלה מתועדת", source: "FR5.2, Q10" }
  - { id: BR5.3, statement: "Ctrl/Cmd+B ו-I מזוהים לפי e.code (KeyB, KeyI) וגם לפי e.key", category: validation, applies_to: "העורך הוויזואלי", trigger: keydown, logic: "IF (ctrl||meta) AND (code=KeyB OR key in b/B) THEN bold", violation: "—", source: FR5.3 }
  - { id: BR5.4, statement: "Esc בעורך לא פועל בזמן הרכבת IME", category: validation, applies_to: "העורך הוויזואלי", trigger: keydown, logic: "IF e.isComposing OR keyCode==229 THEN return", violation: "—", source: FR5.4 }
  - { id: BR5.5, statement: "releaseFocus בוחרת פקד שבאמת מקבל פוקוס", category: validation, applies_to: "העורך הוויזואלי", trigger: "Esc", logic: "מדלגים על visibility:hidden, display:none, disabled, inert; מוודאים activeElement אחרי focus()", violation: "ממשיכים לפקד הבא", source: FR5.5 }

  # BR6 — רשימת QA
  - { id: BR6.1, statement: "docs/qa-checklist-v4.7.0.html עצמאי, RTL, עברית ונגיש", category: constraint, applies_to: QaChecklistState, trigger: "בדיקת יחידה", logic: "html[dir=rtl][lang=he], תווית לכל פקד", violation: "בדיקה נכשלת", source: FR6.1 }
  - { id: BR6.2, statement: "כל FR1 עד FR6 ו-NFR1 עד NFR4 מופיעים לפחות בפריט אחד, כולל ששת האריחים, R-06 עד R-10 וקורא מסך", category: constraint, applies_to: QaChecklistItem, trigger: "בדיקת יחידה", logic: "כל מזהה ברשימת הכיסוי מופיע ב-data-req", violation: "בדיקה נכשלת", source: FR6.2 }
  - { id: BR6.3, statement: "פריט pass צבוע ירוק ומסומן ✓ בטקסט", category: calculation, applies_to: QaChecklistItem, trigger: "סימון", logic: "status=pass -> מחלקה ירוקה + ✓", violation: "—", source: FR6.3 }
  - { id: BR6.4, statement: "שמירה אוטומטית ב-localStorage וטעינה מחדש", category: policy, applies_to: QaChecklistState, trigger: "כל שינוי", logic: "setItem(mdw_qa_v470, JSON) ; טעינה בפתיחה", violation: "—", source: FR6.4 }
  - { id: BR6.5, statement: "'שמור עותק' מוריד HTML עם המצב הנוכחי מוטבע, שנטען בפתיחה", category: policy, applies_to: QaChecklistState, trigger: "כפתור", logic: "מצב מוטבע גובר רק אם אין מצב שמור חדש יותר (updatedAt)", violation: "—", source: FR6.5 }
  - { id: BR6.6, statement: "הקובץ לא נכלל ב-dist/", category: constraint, applies_to: QaChecklistState, trigger: "npm run dist", logic: "לא ברשימת FILES ולא ב-ASSETS", violation: "בדיקה נכשלת", source: FR6.6 }

  # BR7 — דרישות לא פונקציונליות שהופכות לכללים בני בדיקה
  - { id: BR7.1, statement: "ניגודיות: טקסט 4.5:1, גבולות ופקדים 3:1, ו-7:1 לטקסט ב-.hc, מחושב מהטוקנים", category: validation, applies_to: "טוקנים", trigger: "בדיקת יחידה", logic: "contrast(fg,bg) לפי WCAG", violation: "בדיקה נכשלת", source: NFR2 }
  - { id: BR7.2, statement: "ב-150% וברוחב 400px אין גלילה אופקית ואין טקסט חתוך", category: validation, applies_to: "פריסה", trigger: e2e, logic: "scrollWidth<=clientWidth", violation: "בדיקה נכשלת", source: NFR3 }
  - { id: BR7.3, statement: "כל פקד חדש נגיש מהמקלדת, עם :focus-visible ובלי מלכודת", category: constraint, applies_to: "פקדים", trigger: e2e, logic: "Tab מגיע לכל פקד ויוצא מכל פאנל", violation: "בדיקה נכשלת", source: NFR4 }
  - { id: BR7.4, statement: "אנימציות רק תחת prefers-reduced-motion: no-preference, וכבויות ב-.hc", category: constraint, applies_to: CSS, trigger: "בדיקה סטטית", logic: "כל animation/transition חדשים בתוך ה-media query", violation: "בדיקה נכשלת", source: NFR5 }
  - { id: BR7.5, statement: "אין hex קשיח בקבצים ובכללי ה-CSS החדשים, מלבד הגדרות טוקנים", category: constraint, applies_to: CSS, trigger: "בדיקה סטטית", logic: "regex #[0-9a-f]{3,8} מחוץ לבלוק הטוקנים", violation: "בדיקה נכשלת", source: NFR6 }
  - { id: BR7.6, statement: "ייצוא Word של מסמך הדוגמה פחות משנייה; החלפת העדפה פחות מ-100ms", category: validation, applies_to: ExportJob, trigger: e2e, logic: "מדידת זמן ב-Playwright", violation: "בדיקה נכשלת", source: NFR7 }
  - { id: BR7.7, statement: "ארבעת הקבצים החדשים ב-ASSETS של sw.js וב-dist, וגרסת המטמון עולה", category: constraint, applies_to: "PWA", trigger: "בדיקת יחידה ו-npm run dist", logic: "build-dist נכשל אם חסר קובץ", violation: "בדיקה נכשלת", source: NFR8 }
  - { id: BR7.8, statement: "כל הבדיקות הקיימות נשארות ירוקות. בדיקות שמצביעות על כפתורים שעברו מתעדכנות בלי להחליש", category: constraint, applies_to: "בדיקות", trigger: "npm test ו-e2e", logic: "—", violation: "חסימה", source: NFR10 }
  - { id: BR7.9, statement: "לוגיקה טהורה ב-a11y.js וב-export-core.js בלי DOM, נטענת ב-node", category: constraint, applies_to: "מודולים", trigger: "בדיקת יחידה", logic: "require() מצליח ב-node בלי window", violation: "בדיקה נכשלת", source: NFR11 }
  - { id: BR7.10, statement: "יעד WCAG 2.1 AA ות״י 5568, מאומת באוטומציה, בקורא מסך וברשימת ה-QA. סקירת מומחה רשומה כמגבלה", category: policy, applies_to: "הגרסה", trigger: "Build and Test", logic: "—", violation: "—", source: NFR1 }
  - { id: BR7.11, statement: "גודל הטקסט ב-CSS zoom: body { zoom: var(--ax-zoom) }, כשהמשתנה מוגדר על <html>. החלונות המודאליים בתוך body ולכן מוגדלים איתו. יעד: Chromium 128 ומעלה (zoom תקני). חלופה שהוגדרה מראש: html { font-size: calc(100% * var(--ax-zoom)) } עם המרת px ל-rem בכללים של הכותרת, הפאנלים והעורך", category: validation, applies_to: A11yPrefs, trigger: e2e, logic: "e2e ב-150%: (1) הקלדה בעורך הקוד ובעורך הוויזואלי מכניסה את התו במיקום הסמן; (2) לחיצה על מילה ממקמת סמן בה; (3) חלון מודאלי ופאנל ממוקמים בתוך המסך; (4) reflow ב-400px. IF אחד נכשל THEN עוברים לחלופה בשלב Code Generation בלי לחזור לתכנון, והחריגה מתועדת", violation: "מעבר לחלופה", source: "FR2.4, Q7" }
```

## סיכום הכללים

| קבוצה | מספר | נושא |
|---|---|---|
| BR1 | 6 | אייקונים ופאנלים |
| BR2 | 13 | העדפות נגישות, הקראה, אזור חי |
| BR3 | 11 | פאנל הייצוא ו-docx |
| BR4 | 9 | כללי ייצוא: היקף, ראש, LRM, שם קובץ, מצבים |
| BR5 | 5 | R-06 עד R-10 |
| BR6 | 6 | רשימת QA |
| BR7 | 11 | דרישות לא פונקציונליות |
