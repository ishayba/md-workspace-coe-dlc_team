**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| Severity | Location | Finding | Required action |
|---|---|---|---|
| Major | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.2 (ערך ה-CSP, `img-src data: https: http:`) ו-NFR9.5 | ה-CSP של ה-HTML לצפייה בלבד מתיר טעינת תמונות מ-`http:` ומ-`https:`. קובץ מיוצא שנשלח הלאה יפנה לשרת חיצוני בכל פתיחה, וזה מדליף את כתובת ה-IP של הקורא ואת עצם הפתיחה (beacon). בנוסף `http:` מאפשר תוכן לא מוצפן ופוגע בערך "offline". זה גם לא עקבי עם NFR9.5 ("אין טעינת משאבים מבחוץ") ועם BR3.10 (ב-Word אין בקשת רשת לתמונות), ואין בשום מקום החלטה מפורשת שהתמונות כן נטענות בתצוגה. T5 במודל האיומים לא מכסה את הכיוון הזה. | להחליט במפורש ולתעד: או `img-src data:` בלבד (תמונה חיצונית מוצגת כטקסט חלופה וקישור, כמו ב-Word), או `https:` בלבד עם סעיף איום נפרד (T7: מעקב דרך תמונה) וקבלת הסיכון על ידי בעל המוצר. להסיר `http:` בכל מקרה. להוסיף בדיקת יחידה שמוודאת שערך ה-CSP שבקובץ שווה לקבוע המוסכם. |
| Major | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.3 | הדרישה אומרת שה-hash של `script-src 'sha256-<hash>'` "מחושב בזמן הבנייה". אין בפרויקט שלב בנייה (tech-stack-decisions: JS בלי build, אפס תלויות), וחישוב ב-`crypto.subtle.digest` בזמן הייצוא הוא אסינכרוני ושובר את הבנייה הסינכרונית ואת בדיקות ה-node הדטרמיניסטיות. כמו כן לא מוגדר ה-CSP המלא של גיבוי ה-PDF (האם `style-src` ו-`img-src` זהים ל-NFR9.2), ולא נאמר שה-hash חייב להיות של הטקסט המדויק בין התגיות (כולל רווחים ושורות חדשות) ושה-meta חייב לבוא לפני הסקריפט. meta CSP עם hash לסקריפט inline הוא תקין טכנית, אבל רק בתנאים האלה. | לקבוע שה-hash הוא קבוע מקודד לצד מחרוזת הסקריפט הקבועה, ושבדיקת יחידה מחשבת SHA-256 על המחרוזת (`node:crypto`, base64) ומשווה לקבוע. להגדיר את מחרוזת ה-CSP המלאה של גיבוי ה-PDF כתוספת ל-NFR9.2 (אותן הוראות מלבד `script-src`), ולדרוש `<meta CSP>` לפני `<script>` ב-`<head>`. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.4 (אימות) | אימות הקישורים בודק מקרה שלילי אחד בלבד (`javascript:alert(1)` ב-rels). אין כיסוי לצורות עקיפה (`JaVaScRiPt:`, רווח או תו בקרה לפני או בתוך הסכמה כמו `java\tscript:`, `data:text/html`, `vbscript:`, `file:`, `\\host\share`), לא נאמר שערך ה-Target עצמו עובר escaping של מאפיין XML (`"` ו-`&` בכתובת), ואין מקרה חיובי (http, https, mailto נוצרים). | להרחיב את האימות לטבלת קלטים עוינים וחיוביים, ולהוסיף מקרה של כתובת עם `"` ו-`&` שמוודא XML מאוזן ב-`document.xml.rels`. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.2 ו-NFR9.5 (אימות) | בדיקות החיפוש לא ניתנות לביצוע כפי שנכתבו: "חיפוש `on*=` בפלט" יתן false positives על טקסט רגיל (למשל `version=`), ו-NFR9.5 אוסר `innerHTML` עם תוכן "לא מסונן", שזו הגדרה סובייקטיבית. | להגדיר את החיפוש כ-regex על מאפייני תג בלבד (למשל `<[^>]+\son[a-z]+\s*=`) עם קלט עוין שמכיל את המחרוזות כטקסט. ב-NFR9.5 לדרוש רשימת היתר: כל שימוש ב-`innerHTML` בקבצים החדשים נבדק מול רשימה סגורה. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.8 | CSS של גלופה עובר `sanitizeCss` "כמו היום", אבל לא מצוין שהוא חוסם `url()` ו-`@import` ושאין תלות ב-`img-src` של ה-CSP כדי לעצור אותם. בדיקות `css-studio` ירוקות מוכיחות רק שלא נשבר דבר, ולא שהאיום T6 מכוסה. לא אימתתי את תוכן `sanitizeCss` בקוד הקיים. | להוסיף בדיקה ייעודית ל-T6: גלופה עם `url(http://...)` ו-`@import` לא מגיעה לקובץ המיוצא. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/performance-requirements.md > NFR7.5 | היעד "המשימה הארוכה ביותר פחות מ-2 שניות" אינו מגן מקפיאה: שתי שניות של חסימה הן קפיאה מורגשת, והיעד זהה ל-NFR7.3, כך שהוא מתקיים תמיד. בנוסף, כדי ש-"מייצר קובץ…" יצויר לפני הבנייה הסינכרונית נדרש מסירת שליטה לדפדפן (למשל `requestAnimationFrame` כפול או `setTimeout`) לפני הקריאה, ולא רק קביעת טקסט. מדידה על מחשב הפיתוח, חציון של 3 הרצות, חשופה לרעש. | להוריד את היעד ל-`longtask` יחיד של פחות מ-500ms במסמך של 5,000 שורות, או להגדיר מפורשות שהיעד הוא "חיווי מוצג לפני התחלה" בלבד. לתעד את דרישת ה-yield לפני הבנייה ב-BR4.6 או ב-NFR7.5. |
| Minor | aidlc/spaces/default/intents/261101-a11y-export-v47/construction/nfr-requirements/security-requirements.md > NFR9.6 | המטא-דאטה מכוסה היטב, אבל `dc:title` נגזר מתוכן המשתמש (כותרת המסמך) ולא נאמר שהוא עובר escaping ושהוא נקטע באורך סביר. לא מוגדר אם קיים `docProps/app.xml` (מכיל לרוב Application ו-Company). | לציין ש-`dc:title` עובר `xmlEscape`, ושאין `app.xml`, או שהוא מכיל ערכים קבועים בלבד. |

הערות על מה שנבדק ותקין: תחביר meta CSP עם `style-src 'unsafe-inline'` ו-`<style>` מוטבע תקין ב-Chromium 128+, וכך גם hash לסקריפט inline יחיד (בתנאים שב-NFR9.3 למעלה). `frame-ancestors` אינו נתמך ב-meta, אך אין צורך בו בקובץ מקומי. עקביות המזהים: ב-NFR*.md יש 53 מזהי משנה ייחודיים, ובדיוק 53 מופיעים ב-`traceability.json` (NFR1 עד NFR11). אין סתירה ישירה בין `security-requirements.md` לבין BR3.3, BR3.10, BR3.11 ו-WF7.4/7.5, פרט לנקודת התמונות לעיל.

**Verdict:** READY

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
