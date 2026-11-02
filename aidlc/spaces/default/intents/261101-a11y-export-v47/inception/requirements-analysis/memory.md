<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-01T21:27:22Z — ההנחיות נכתבו לפורטל עם לשוניות וסינון. באפליקציה של מסמך יחיד "מה שהמשתמש רואה" פורש כמסמך הנוכחי עם הגלופה, בלי תיאור סינון

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-01T21:27:22Z — במתג הניגודיות נבחר `aria-checked` במקום `aria-pressed` שבהנחיות, כי זו התכונה התקפה ל-`role="switch"` לפי ARIA 1.2
- 2026-11-01T21:27:22Z — אחרי הסקירה תוקנה הסתירה בין סגירת פאנל הייצוא אחרי בחירה לבין מצב "מייצר קובץ…": המצב עבר לאייקון הייצוא (`aria-busy`) (ממצא Major)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-01T21:27:22Z — ‏`.docx` ייבנה עם כותב ZIP פנימי (STORE ו-CRC32) כדי לשמור על zero-deps. הקובץ גדול יותר מקובץ דחוס, אבל אין תלות חיצונית

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-01T21:27:22Z — האם `zoom` מתאים ל-textarea של העורך (מיקום הסמן), או שנדרשת חלופה. נדחה ל-Functional Design (OQ3)
