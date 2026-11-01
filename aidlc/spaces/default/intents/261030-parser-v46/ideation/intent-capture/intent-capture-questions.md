# שאלות בירור — Intent Capture

## Sources

- [desc] Initial description: "v4.6.0 — הרחבת ה-parser של MD Workspace: קישורים [טקסט](url), תמונות ![alt](src), קו מפריד ---, רשימות - ו-+, משימות - [ ]/- [x], קו חוצה ~~טקסט~~, רשימות מקוננות, ציטוט רב-שורתי, יישור עמודות בטבלה. לכל תכונה: TDD (בדיקה נכשלת → מימוש ב-parseMarkdown() → אלמנט ב-ELEMENTS/css-studio.js → שורה ב-SAMPLE_MD → convertChild → עורך ויזואלי md-visual.js). פרויקט Vanilla JS, zero-deps, node --test."
- [scope] Workflow-selected scope: `bugfix`.

## Q1. איזו בעיה עסקית הגרסה הזו פותרת?

A. המשתמשים לא יכולים לכתוב תחביר Markdown נפוץ (קישורים, תמונות, משימות ועוד), והוא מוצג כטקסט גולמי
B. ה-CSS Studio והעורך הוויזואלי לא יכולים לעצב ולערוך אלמנטים שה-parser לא מרנדר
C. שתי הבעיות יחד (A ו-B)
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q2. מי הלקוח של השינוי?

A. חברי צוות CoE שכותבים מסמכים בעברית בסביבה מנותקת מהרשת
B. מתחזקי הקוד של MD Workspace
C. שניהם (A ו-B)
D. Not identified
X. Other (please specify)

[Answer]: C

## Q3. איך נראית הצלחה? אילו מדדים חשובים?

A. כל 9 התכונות מרונדרות נכון, עם בדיקה אוטומטית לכל אחת, וכל הבדיקות הקיימות עוברות
B. כמו A, ובנוסף round-trip (ויזואלי ← Markdown ← ויזואלי) נשמר לכל תכונה
C. כמו B, ובנוסף כל תכונה ניתנת לעיצוב ב-CSS Studio ומופיעה במסמך הדוגמה
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q4. מה הטריגר לעבודה עכשיו?

A. הרחבת ה-parser נדחתה פעמיים (v4.4.0, v4.5.0) ומופיעה כעדיפות גבוהה ב-BACKLOG
B. העורך הוויזואלי (v4.5.0) חשף את הפערים, ובלעדיה הוא מוגבל
C. שתי הסיבות (A ו-B)
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. מי בעלי העניין המרכזיים, ומה חשוב לכל אחד?

A. משתמשי הקצה (תחביר מלא שעובד) ומתחזקי הקוד (בדיקות, אפס רגרסיות)
B. כמו A, ובנוסף ראש צוות CoE שמאשר את הגרסה
C. מפתח יחיד שהוא גם המשתמש וגם המתחזק
D. Not identified
X. Other (please specify)

[Answer]: B

## Q6. מי מחליט על היקף ועדיפות, ומי משפיע?

A. אני מחליט לבד
B. אני מחליט, וחברי הצוות משפיעים דרך משוב
C. ראש הצוות מחליט, ואני משפיע
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q7. האם יש דרישות תקשורת או קצב דיווח?

A. None — עדכון בסיום הגרסה בלבד
B. עדכון ב-MVP_SPEC.md וב-BACKLOG.md בסיום הגרסה
C. דיווח לצוות אחרי כל תכונה
D. Not applicable
X. Other (please specify)

[Answer]: B

## Q8. מה הגרסה הראשונה הזו לא תעשה?

ההיקף שנבחר הוא `bugfix` (תוכנית מותאמת). השאלה היא רק מה נשאר מחוץ לגרסה.

A. מה שמופיע ב-BACKLOG מחוץ לסעיף 1: הדבקה חכמה, היסטוריית ביטול משלנו, בדיקה ב-Safari/Firefox, עריכה ויזואלית של תרשימים
B. כמו A, ובנוסף ליקויים קיימים (גלופות במצב כהה, כיוון אוטומטי בעורך)
C. None — אין החרגות מעבר לרשימת 9 התכונות
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q9. אילו כתובות יתקבלו בקישורים ובתמונות?

A. רק `http`, `https`, `mailto` ונתיבים יחסיים; כל scheme אחר (כולל `javascript:` ו-`data:`) נדחה ומוצג כטקסט
B. כמו A, אבל לתמונות מותר גם `data:image/*`
C. כל כתובת, בלי אימות
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q10. אילו צורות של קו מפריד ייתמכו?

A. `---`, `***` ו-`___` (שלושה תווים ויותר, בלי רווחים בין התווים)
B. כמו A, ובנוסף הצורות עם רווחים (`- - -`, `* * *`)
C. רק `---`
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q11. כמה רמות קינון ברשימות?

A. רקורסיה בלי הגבלת עומק, עם בדיקות ל-3 רמות לפחות
B. עד 2 רמות בלבד
C. עד 3 רמות בלבד
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q12. איך נבדק כיוון הכתיבה (RTL) בתכונות החדשות?

A. לכל תכונה לפחות בדיקה אחת עם טקסט עברי, שמאמתת את ה-`dir` האוטומטי ושהוא נשמר ב-round-trip
B. בדיקת RTL אחת משותפת לכל התכונות
C. None — מסתמכים על הלוגיקה הקיימת בלי בדיקה חדשה
D. Not yet defined
X. Other (please specify)

[Answer]: A
