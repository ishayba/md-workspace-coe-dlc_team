<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-02T14:03:28Z — מי שמאשר את העיצוב בפועל לא טכני, ולכן נוסף מוקאפ ויזואלי ב-HTML (מסכים 1 עד 7) לצד המסמכים הטקסטואליים, לבקשת המשתמש

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-02T14:03:28Z — נוספו תוצרים מעבר לרשימת השלב: `mockup-visual.html` ו-`mockup-visual.png`
- 2026-11-02T14:03:28Z — חישוב ניגודיות בפועל גילה ש-`--border-strong` ביום (1.48:1) לא מתאים לגבולות פקדים. נוסף `--border-control`
- 2026-11-02T14:03:28Z — אחרי הסקירה: טוקני הקראה קבועים (`--reading-ring`, `--reading-bg`) כי התצוגה המקדימה תמיד בהירה; `--focus-ring-fg` ל"דלג לתוכן"; `--selected-bg` לבחירה; פיצול מסך 4; מסך 7 למצבים מיוחדים

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-02T14:03:28Z — במקום לשנות את `--border-strong` הקיים (שינוי מראה לכל האפליקציה), נוסף טוקן ייעודי לפקדים חדשים בלבד

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-02T14:03:28Z — בשם קובץ עברי עם תאריך וסיומת נדרש `bdi` כפול (rtl חיצוני, ltr פנימי) כדי שהנקודה לא תזוז. צריך לאמת את אותה התנהגות בהודעות האמיתיות בשלב הקוד
