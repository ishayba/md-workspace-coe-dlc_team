# סיכום יוזמה — v4.6.0 הרחבת ה-parser של MD Workspace

מבוסס על `ideation/intent-capture/intent-statement.md` ו-`ideation/intent-capture/stakeholder-map.md`, ועל התשובות ב-`approval-handoff-questions.md`.

## Intent and Problem Statement

ה-parser לא מרנדר תשעה רכיבי תחביר נפוצים: קישורים, תמונות, קו מפריד, רשימות `-`/`+`, משימות, קו חוצה, רשימות מקוננות, ציטוט רב-שורתי ויישור עמודות בטבלה. המשתמשים רואים אותם כטקסט גולמי, וה-CSS Studio והעורך הוויזואלי לא יכולים לעצב ולערוך אותם (intent-statement, Problem Statement).

המטרה: כל 9 התכונות מרונדרות ונבדקות, ה-round-trip נשמר, וכל תכונה ניתנת לעיצוב ב-CSS Studio ומופיעה במסמך הדוגמה. הבדיקות הקיימות ממשיכות לעבור (intent-statement, Success Metrics).

## Market Validation Summary

לא רלוונטי: זה כלי פנים-ארגוני. ההצדקה היא הפערים שהעורך הוויזואלי של v4.5.0 חשף (Q5; intent-statement, Initiative Trigger).

## Feasibility and Risk Highlights

לא בוצע שלב היתכנות נפרד, והוא דולג בתוכנית שאושרה. הסיכונים שזוהו והמענה להם (Q2):

| סיכון | מענה |
|---|---|
| XSS דרך קישורים ותמונות | מתקבלים רק `http`, `https`, `mailto` ונתיב יחסי; כל scheme אחר נדחה ומוצג כטקסט (intent-statement, SC-1, SC-2) |
| רגרסיה בתחביר שעובד היום | כל הבדיקות הקיימות חייבות לעבור אחרי כל תכונה |
| שבירת ה-round-trip של העורך הוויזואלי | בדיקת round-trip לכל תכונה, כולל טקסט עברי ובדיקת `dir` (intent-statement, RTL) |

## Scope Boundary

**בתוך הגרסה:** תשע התכונות, SC-1 עד SC-9, וקריטריון RTL לכל תכונה (intent-statement, Success Metrics).

**מחוץ לגרסה:** הדבקה חכמה, היסטוריית ביטול משלנו, בדיקה ב-Safari/Firefox ועריכה ויזואלית של תרשימים (intent-statement, Initial Scope Signal).

לא נוצרו מסמך היקף ורשימת backlog נפרדים, כי שלב scope-definition דולג בתוכנית. ההיקף מוגדר בהצהרת הכוונה.

## Concept Visuals

לא רלוונטי: אין מסכים חדשים. הכפתורים בסרגל העורך הוויזואלי יוגדרו בשלב הקוד (Q4).

## Team Plan

מפתח יחיד עובד על הגרסה עד שתסתיים, בלי צוות או mob (Q3, Q6). מגיש הבקשה מחליט על ההיקף והעדיפות, וחברי הצוות משפיעים דרך משוב (stakeholder-map, Decision-Makers).

## Go/No-Go Recommendation

**Go, בתנאי:** בעלי העניין מסכימים על הכוונה וההיקף, אבל ראש צוות CoE עוד צריך לאשר לפני תחילת הקוד (Q1; stakeholder-map, מאשר את הגרסה).

ההמלצה: לקבל את האישור של ראש הצוות לפני שלב Code Generation.

## Assumptions & Open Questions

- [assumption] מקרי הקצה של SC-4 עד SC-9 (קינון עם סימנים מעורבים, תא ריק בטבלה, `//host` בקישור) לא הוגדרו, ויוגדרו בבדיקות של שלב הקוד. הסוקר העלה את זה בשלב הקודם (R-02).
