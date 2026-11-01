<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-30T15:15:36Z — הוספו שאלות Q9 עד Q12 מעבר לשמונה שאלות הבסיס של השלב; הן מעגנות החלטות שהתקבלו במשימה שהועברה לארכיון (כתובות בקישורים, צורות קו מפריד, עומק קינון, בדיקת RTL), כדי שלא יישענו על הנחה.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-30T15:15:36Z — הסוקר ציין שהיקף bugfix לא מתאים טבעית לתשע תכונות חדשות; התוכנית המותאמת אושרה על ידי המשתמש, אבל כדאי לוודא שבשלב code-generation רצפת הבדיקות של bugfix (רגרסיה ממוקדת) לא מחליפה את דרישת TDD לכל תכונה.
