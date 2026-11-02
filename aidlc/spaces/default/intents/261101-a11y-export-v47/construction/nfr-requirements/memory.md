<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-02T14:58:12Z — באפליקציה בלי שרת, "קנה מידה" פורש כגודל ומבנה המסמך, ו"תצפית" כרישום מקומי ויכולת בדיקה. אין SLO והתראות

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-02T14:58:12Z — נוסף קובץ `accessibility-requirements.md` מעבר לרשימת התוצרים, כי הנגישות היא עיקר הגרסה
- 2026-11-02T14:58:12Z — אחרי הסקירה: `http:` הוסר מ-`img-src`, ונוסף איום T7; ה-hash של סקריפט ההדפסה הוא קבוע מקודד עם בדיקת יחידה; היעד של NFR7.5 הוחמר למשימה של פחות משנייה

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-02T14:58:12Z — ב-HTML לצפייה בלבד מותרות תמונות `https:`, וחשיפת ה-IP לשרת התמונה מקובלת, כי הכותב בחר את הכתובת. חסימה מלאה הייתה שוברת מסמכים עם תמונות

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
