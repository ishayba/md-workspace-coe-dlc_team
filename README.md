# MD Workspace 4 CoE DLC Team (v4.3.4)

> **עדכון v4.3:** תוקנה פרצת אבטחה (XSS) במנוע פענוח ה-Markdown, הוסר קובץ `app.js` שהיה קוד מת ולא נטען כלל, נוספה תמיכת PWA מלאה (manifest + אייקון מחובר), ותוקנה אי-עקביות גרסאות. פרטים מלאים ב-`MVP_SPEC.md`.

## אודות המערכת / About The System

**עברית:**
MD Workspace היא סביבת עבודה מקומית ועצמאית לחלוטין (100% Offline / Zero-CDN) ליצירה, עריכה וייצוא של מסמכי Markdown בעברית (RTL). המערכת מתפקדת כ"מנוע הפקת מסמכים" המפריד באופן מוחלט בין תוכן ה-Markdown לבין גלופות עיצוב. האפליקציה מאפשרת ייצוא מסמכים כקובצי HTML אינטראקטיביים ("חיים") הכוללים סרגל כלים לעריכה מקומית, תרשימי זרימה מובנים (Mermaid Lite) והדפסה חלקה ל-PDF. כל תהליכי העיבוד מתבצעים בדפדפן המקומי בלבד – ללא שרת, מסד נתונים או איסוף מידע.

**English:**
MD Workspace is a completely offline, standalone PWA for creating, viewing, editing, and exporting Markdown documents with native RTL (Hebrew) support. Operating as a comprehensive document presentation engine, it strictly separates Markdown content from visual themes. The system features interactive HTML exports with an embedded local-editing toolbar, offline Mermaid charts, and seamless PDF generation. All processing is executed entirely client-side, ensuring zero external dependencies, no backend, and absolute privacy.

## תכונות מרכזיות / Key Features
* **100% Offline-First:** פעולה עצמאית ומאובטחת ללא חיבור לאינטרנט.
* **הפרדת תוכן מעיצוב (Content vs. Themes):** עריכת טקסט מהירה ב-Markdown מצד אחד, ובחירת גלופות עיצוב ארגוניות מצד שני.
* **Interactive HTML Export:** ייצוא מסמך ל"מיקרו-אפליקציה" עצמאית המאפשרת לקורא לערוך את המסמך ולייצא אותו חזרה ל-Markdown מכל מחשב.
* **Mermaid Lite:** תמיכה מקומית בתרשימי זרימה ואדריכלות ללא פניות ל-CDN.
* **Privacy by Design:** המידע לעולם לא עוזב את מכשיר המשתמש.

---
<sub>הופק מקומית · פרויקט זה מופץ תחת הרישיון Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)</sub>
