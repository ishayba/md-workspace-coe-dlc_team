<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-01T18:54:18Z — חזרה ראשונה לשלב Code Generation (Loop-back 1) לבקשת המשתמש, לתיקון שני כשלי e2e קיימים בעורך הוויזואלי (Ctrl+B והדבקה) שלא נגרמו ב-v4.6.0; התיקון חורג מהיקף v4.6.0 המקורי, אבל נדרש כדי ש-npm run e2e יהיה ירוק ויריץ גם את בדיקת v46-visual.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-01T20:05:03Z — Playwright הותקן בתיקיית המשתמש (`~/.local/share/mdw-e2e`) ולא גלובלית ולא בפרויקט; ההתקנה הגלובלית נכשלה על הרשאות, והתקנה בפרויקט הייתה מוסיפה תלות ל-package.json בניגוד לעקרון אפס התלויות. המחיר: כל הרצת e2e צריכה `NODE_PATH`.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
