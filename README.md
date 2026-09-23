# MD Workspace 4 CoE DLC Team (v4.3.4)

> **עדכון v4.3:** תוקנה פרצת אבטחה (XSS) במנוע פענוח ה-Markdown, הוסר קובץ `app.js` שהיה קוד מת ולא נטען כלל, נוספה תמיכת PWA מלאה, ונבנתה תשתית בדיקות.

## פיתוח מונחה בדיקות (TDD)

המאגר משתמש כעת ב־Node Test Runner המובנה, ללא תלות חיצונית וללא CDN.

```bash
npm test
npm run test:watch
```

הדגשה: כל שינוי חדש צריך להתחיל בבדיקה שמתארת את ההתנהגות הרצויה, אחר כך לממש את הפתרון המינימלי, ולבסוף לנקות/לשפר את הקוד.

### מה נבדק
- חוזה ממשק המשתמש (`index.html`)
- מניעת XSS על ידי `escapeHtml`
- קבלת עמוד הבית של השרת
- טיפול בקובץ חסר
- אבטחת גישה לקבצים מחוץ למאגר

## אודות המערכת / About The System

**עברית:**
MD Workspace היא סביבת עבודה מקומית ועצמאית לחלוטין (100% Offline / Zero-CDN) ליצירה, עריכה וייצוא של מסמכי Markdown בעברית (RTL).

**English:**
MD Workspace is a completely offline, standalone PWA for creating, viewing, editing, and exporting Markdown documents with native RTL (Hebrew) support.

## תכונות מרכזיות / Key Features
* **100% Offline-First:** פעולה עצמאית ומאובטחת ללא חיבור לאינטרנט.
* **הפרדת תוכן מעיצוב:** עריכת טקסט מהירה ב-Markdown ובחירת גלופות עיצוב ארגוניות.
* **Interactive HTML Export:** ייצוא מסמך ליישום HTML עצמאי.
* **Mermaid Lite:** תמיכה מקומית בתרשימים ללא פניות ל-CDN.
* **Privacy by Design:** המידע לעולם לא עוזב את מכשיר המשתמש.

---
<sub>הופק מקומית · פרויקט זה מופץ תחת הרישיון Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</sub>
