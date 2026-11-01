<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-10-29T20:00:00Z — תיאור הכוונה מפורט דיו כדי להגדיר ישירות קריטריוני הצלחה ברמת תכונה (9 תכונות, 9 SC), ללא צורך בשלבי ideation נוספים. הסקופ bugfix מדויק: אין שינוי ארכיטקטורי, רק הרחבה מבוקרת של parseMarkdown() ומעגלי הקוד הצמודים אליו.
2026-10-29T20:00:00Z — זוהה תלות בין תכונות: משימות (SC-5) תלויות ברשימות -/+ (SC-4), ורשימות מקוננות (SC-7) תלויות בשתיהן. סדר המימוש יקבע בשלב code-generation.
2026-10-29T20:00:00Z — אימות פרוטוקול בקישורים (SC-1) הוגדר כאילוץ אבטחה מפורש: javascript: ו-data: נדחים. זה עקבי עם תיקון ה-XSS שבוצע ב-v4.3.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-10-29T20:00:00Z — קובץ stakeholder-map.md קומפקטי בכוונה: אין לקוחות חיצוניים, ממשקי API ציבוריים או מנהלי מוצר נפרדים. שתי קבוצות בלבד (משתמשים ומתחזקים) מספיקות לכלי פנים-ארגוני מסוג זה.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-10-29T20:00:00Z — הוחלט להשאיר checkbox של משימות עם disabled (SC-5) ולא לאפשר אינטרקציה בתצוגה המקדימה. trade-off: פחות אינטרקטיבי, אך תואם ל-GFM viewer ומפשט את round-trip Markdown ← HTML, שכן שינוי checked state בלי לשנות קוד ה-MD יצור חוסר עקביות.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-10-29T20:00:00Z — T-2: לוודא בשלב code-generation שהוספת Tab לרשימות מקוננות לא שוברת ניווט בין תאי טבלה (שניהם משתמשים ב-keydown Tab).
2026-10-29T20:00:00Z — T-1: סדר מימוש מומלץ לבסס בתחילת code-generation: SC-4 → SC-5 → SC-7 (שרשרת תלויות), SC-1, SC-2, SC-3, SC-6, SC-8, SC-9 (עצמאיות).
