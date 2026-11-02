<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-02T14:41:18Z — בלי Units Generation ובלי Domain Design, הקוד הקיים שימש כתכנון התחום, וכל הגרסה היא יחידה אחת (`v47-a11y-export`)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-02T14:41:18Z — כיוון הדף ב-Word וב-PDF שונה ל-A4 לאורך (Q6), ו-FR3.3 ו-FR3.8 בדרישות עודכנו
- 2026-11-02T14:41:18Z — הסקירה החזירה NOT-READY עם 3 ממצאי Major (הדבקה וביטול, רצים וכיוון ב-docx, שלמות חבילת ה-docx). כולם תוקנו לפני השער
- 2026-11-02T14:41:18Z — `traceability.json` נכתב תחילה דרך סקריפט, והמנוע לא רשם את הכתיבה. הוא נשמר מחדש בכלי הכתיבה

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-02T14:41:18Z — עוגנים ונתיבים יחסיים ב-Word נשארים טקסט בלבד. bookmarks היו מוסיפים מורכבות בשביל מקרה נדיר
- 2026-11-02T14:41:18Z — ענפי ההדבקה הקיימים נשמרו, כדי לא לפגוע בהתנהגות של v4.6.0. אם יתברר שהביטול נפגע, R-07 יירשם כמגבלה

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-02T14:41:18Z — האם Chromium יוצר `span[style]` בהדבקה בגוף העורך. ייבדק ב-e2e בשלב Code Generation (WF8)
- 2026-11-02T14:41:18Z — האם `zoom` על `body` שומר את מיקום הסמן בשני העורכים. ייבדק ב-e2e, והחלופה (rem) כבר מוגדרת (BR7.11)
