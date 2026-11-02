# שאלות בירור — NFR Requirements (v4.7.0)

המקורות: `inception/requirements-analysis/requirements.md` (NFR1 עד NFR11, ‏OQ4), ‏`construction/functional-design/functional-spec.md` ו-`rules.md` (BR3.3, BR3.11, BR4.6, BR7.1 עד BR7.11), ו-`package.json`.
רוב היעדים כבר כמותיים. השאלות כאן סוגרות את מה שעוד פתוח: מסמכים גדולים, אבטחת הקבצים המיוצאים, פרטיות, כיסוי בדיקות ותצפית.
האפשרות המסומנת ב-⭐ היא ההמלצה.

## Q1. מה יעד הביצועים למסמך גדול? (NFR7 מגדיר רק את מסמך הדוגמה)

A. מסמך של 5,000 שורות (בערך 300KB): ייצוא Word ו-Markdown בפחות מ-2 שניות, ‏HTML בפחות משנייה, והממשק לא קופא יותר מ-2 שניות. מתחת ל-1MB אין הגבלת גודל ⭐
B. רק מסמך הדוגמה, כמו היום
C. מסמך של 20,000 שורות בפחות מ-3 שניות. זה עלול לדרוש Web Worker
D. בלי יעד למסמך גדול
X. Other (please specify)

[Answer]: A

## Q2. אבטחת ה-HTML המיוצא: להוסיף Content-Security-Policy?

A. כן. ב-HTML לצפייה בלבד יש `<meta http-equiv="Content-Security-Policy">` עם `default-src 'none'; style-src 'unsafe-inline'; img-src data: https: http:; font-src data:`, בלי סקריפטים. בגיבוי ה-PDF מותר רק הסקריפט הקבוע, דרך hash. ב-HTML החי אין CSP, כי הוא מריץ סקריפט עריכה ⭐
B. CSP בכל שלושת קובצי ה-HTML
C. בלי CSP. ה-escaping הקיים מספיק
D. CSP רק בגיבוי ה-PDF
X. Other (please specify)

[Answer]: A

## Q3. פרטיות במטא-דאטה של קובץ ה-Word

A. ‏`dc:creator` ו-`cp:lastModifiedBy` ריקים, ואין שם משתמש, נתיב או שם מחשב. רק כותרת ותאריך ⭐
B. ‏`dc:creator` = "MD Workspace"
C. השדה "יוצר" נלקח מהגדרה במסך
D. בלי `docProps/core.xml` בכלל
X. Other (please specify)

[Answer]: A

## Q4. הקראה של פסקאות ארוכות. ב-Chromium יש באג ידוע: `utterance` ארוך נעצר אחרי כ-15 שניות

A. קטע שארוך מ-200 תווים מתפצל לפי גבולות משפט (`.`, `?`, `!`, `:`), ובאין גבול כזה לפי רווח. ההדגשה נשארת על אותו אלמנט עד שכל חלקיו מוקראים ⭐
B. בלי פיצול
C. פיצול קבוע כל 100 תווים
D. ‏`pause()` ו-`resume()` כל 10 שניות כמעקף
X. Other (please specify)

[Answer]: A

## Q5. כיסוי בדיקות (ב-scope `refactor` אין רצפת כיסוי)

A. ‏90% שורות לפחות לשני המודולים הטהורים (`a11y.js`, ‏`export-core.js`), נמדד ב-`node --test --experimental-test-coverage`. לקבצי ה-UI אין רצפה, והכיסוי שלהם בא מ-e2e. כל הבדיקות הקיימות ירוקות ⭐
B. ‏80% לכל הקבצים החדשים
C. בלי רצפה. רק "כל הבדיקות ירוקות"
D. ‏100% לשני המודולים הטהורים
X. Other (please specify)

[Answer]: A

## Q6. תצפית ורישום (אפליקציה בלי שרת, שעובדת בלי רשת)

A. בלי טלמטריה ובלי שליחה החוצה. שגיאת ייצוא נרשמת ב-`console.error` עם קידומת `[mdw-export]`, ונמסרת למשתמש בהודעה. שגיאות בהקראה ובאחסון נרשמות ב-`console.warn`. אין רישום של תוכן המסמך ⭐
B. כמו A, ובנוסף יומן שגיאות מקומי ב-localStorage שאפשר להוריד
C. בלי רישום בכלל
D. כמו A, עם רישום של תוכן המסמך לצורכי איתור באגים
X. Other (please specify)

[Answer]: A

## Q7. אילו זוגות טוקנים בודקת בדיקת הניגודיות? (OQ4)

A. כל זוג שמשמש רכיב חדש או נגע בו, ביום, בלילה ובשתי גרסאות `.hc`: טקסט ראשי ומשני על רקע, משטח ומשטח עדין; ‏`--focus-ring` מול רקעים; ‏`--focus-ring-fg` על `--focus-ring`; לבן על `--selected-bg`, על `--accent-warning-strong` ועל כל `--badge-*`; ‏`--border-control` ו-`--dot-changed` מול משטח; ‏`--reading-ring` מול לבן. הרשימה מוגדרת בבדיקה ונגזרת מ-`design-system-mapping.md` ⭐
B. רק טקסט ראשי ומשני מול רקע
C. כל הצירופים האפשריים של כל הטוקנים
D. רק במצב יום
X. Other (please specify)

[Answer]: A

## Q8. אמינות: מה קורה כשהדפדפן לא מאפשר הורדה, או כשאין מקום ב-localStorage?

A. לפני הורדה בודקים `Blob`, ‏`URL.createObjectURL` ו-`a.download`. אם אחד מהם חסר, האריחים מושבתים עם הסבר (FR4.7). כשאין מקום ב-localStorage (QuotaExceededError), ההעדפות ורשימת ה-QA ממשיכים לעבוד בזיכרון, וברשימת ה-QA מוצגת הודעה "לא ניתן לשמור אוטומטית, השתמשו ב'שמור עותק'" ⭐
B. כמו A, בלי ההודעה ברשימת ה-QA
C. בלי בדיקה מראש. השגיאה תופיע בזמן ההורדה
D. כמו A, ובנוסף ניסיון שמירה חוזר כל דקה
X. Other (please specify)

[Answer]: A

## Q9. סביבת היעד וכלי הבדיקה

A. ‏Chromium 128 ומעלה (Chrome ו-Edge). ‏Node 20 ומעלה ל-`node --test`. ‏Playwright 1.64.1 מותקן מחוץ לפרויקט (`$HOME/.local/share/mdw-e2e`), כמו היום, ונשאר zero-deps ⭐
B. כמו A, ו-Playwright כ-devDependency
C. כמו A, וגם Firefox ו-Safari ב-e2e
D. Chromium 120 ומעלה, עם החלופה rem כברירת מחדל
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- מסמך גדול: 5,000 שורות (בערך 300KB). ייצוא Word ו-MD בפחות מ-2 שניות, ‏HTML בפחות משנייה, והממשק לא קופא יותר מ-2 שניות (Q1)
- CSP מחמיר ב-HTML לצפייה בלבד, ובגיבוי ה-PDF עם hash לסקריפט הקבוע. ב-HTML החי אין CSP (Q2)
- קובץ Word בלי שם משתמש, נתיב או שם מחשב. רק כותרת ותאריך (Q3)
- הקראה: קטע ארוך מ-200 תווים מתפצל לפי סוף משפט, וההדגשה נשארת על אותו אלמנט (Q4)
- כיסוי של 90% שורות לפחות ל-`a11y.js` ול-`export-core.js`, נמדד ב-`--experimental-test-coverage`. ממשק המשתמש מכוסה ב-e2e (Q5)
- בלי טלמטריה. שגיאות נרשמות ב-`console.error` (`[mdw-export]`) או `console.warn`, בלי תוכן המסמך (Q6)
- בדיקת הניגודיות עוברת על כל זוג טוקנים של רכיב חדש, ביום, בלילה ובשתי גרסאות `.hc` (Q7)
- בדיקה מראש של יכולת ההורדה, עם השבתה והסבר. כשאין מקום באחסון, העבודה ממשיכה בזיכרון, ורשימת ה-QA מציגה הודעה (Q8)
- סביבה: Chromium 128 ומעלה, Node 20 ומעלה, ו-Playwright 1.64.1 מחוץ לפרויקט (Q9)

Does this all look correct before I generate the NFR requirements?

- Looks correct
- Request changes

[Answer]: Looks correct
