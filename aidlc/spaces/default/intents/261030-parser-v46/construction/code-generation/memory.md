<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-31T19:56:40Z — שיטת TDD נרשמה ב-project.md ידנית על ידי המשתמש ולא דרך כלי הלקחים; שומר אישור התוכנית חוסם פקודות שמשנות קבצים עד שהתוכנית מאושרת, והחוזה נקרא לפני האישור. בפעם הבאה: לקבוע את שיטת הבדיקות לפני שנכנסים לשלב Code Generation.
- 2026-10-31T19:56:40Z — סדר Red→Green לא נשמר בשלושה מקומות (הרחבת GUARD, ריצות inline בממיר, Red חלקי ל-RTL ולקטלוג); בכל תכונה בדיקות ה-parser נכשלו קודם, כך שה-TDD נשמר ברמת התכונה.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-01T19:30:51Z — ב-Loop-back 1 נוסף מטפל משלנו ל-Cmd/Ctrl+B ו-I לפי `e.key`; במקלדת עברית פעילה `e.key` אינו `b`/`i`, ולכן המטפל לא מופעל והקיצור המובנה של הדפדפן ממשיך לפעול כמו קודם, בלי רגרסיה; מעבר ל-`e.code` היה מכסה גם את זה.
- 2026-10-31T19:56:40Z — כלל הכתובות (http/https/mailto/יחסי, בלי `//`) מומש בשלושה עותקים: פעמיים ב-index.html ופעם ב-md-visual.js; מגבלת החילוץ של load-app.js ותבנית הייצוא העצמאית מונעות מקור משותף אחד, והסוקר סימן סיכון לסטייה עתידית.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-31T19:56:40Z — בדיקות הדפדפן (`npm run e2e`) לא הורצו; יש להריץ אותן בשלב Build and Test, כולל e2e/visual-editor.e2e.js שורה 99 (ציטוט אחרי Enter) ו-e2e/live-html-roundtrip.e2e.js.
