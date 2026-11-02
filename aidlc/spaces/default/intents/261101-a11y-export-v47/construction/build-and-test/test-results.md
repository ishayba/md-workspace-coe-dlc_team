# תוצאות בנייה ובדיקה — v4.7.0

## מקורות

- `construction/code-generation/code-generation-plan.md` (code-generation-plan)
- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions)
- `construction/code-generation/code-summary.md` (code-summary)
- כל הפקודות הורצו ב-2026-11-02 (UTC), בסביבה הזו: macOS, ‏Node v24.15.0 ו-Playwright 1.64.1 (Chromium).

## בנייה

| פקודה | תוצאה |
|---|---|
| `npm run dist` | הצליחה. נוצרו 20 קבצים ב-`dist/`, כולל `a11y.js`, ‏`a11y-ui.js`, ‏`export-core.js` ו-`export-ui.js`. אין `dist/docs` |

## בדיקות יחידה

כל פקודה נפרדת מ-`unit-test-instructions.md` הורצה פעם אחת:

| פקודה | סך הכול | עברו | נכשלו | דולגו |
|---|---|---|---|---|
| 9 קובצי היחידה החדשים | 226 | 226 | 0 | 0 |
| `service-worker` ו-`version-sync` | 10 | 10 | 0 | 0 |
| `npm test` (כל הפרויקט, אימות) | 459 | 459 | 0 | 0 |

## כיסוי (`npm run coverage`)

| קובץ | שורות | ענפים | פונקציות | סף |
|---|---|---|---|---|
| `a11y.js` | 99.08% | 95.00% | 100% | 90% שורות |
| `export-core.js` | 99.89% | 92.03% | 100% | 90% שורות |

## e2e (`npm run e2e`, עם `NODE_PATH`; קוד יציאה 0)

| קובץ | תוצאה | שגיאות בדף או בקונסול |
|---|---|---|
| `css-studio` | 42/42 | אין |
| `live-html-roundtrip` | ROUNDTRIP OK | אין |
| `auto-direction` | 25/25 | אין |
| `visual-editor` | 69/69 | אין |
| `v46-visual` | 38/38 | אין |
| `v47-a11y-export` | 273/273 | אין |

הלוג המלא שמור ב-`/tmp/bt-e2e.log`. זה קובץ זמני מחוץ לפרויקט.

## ביצועים (מתוך הלוג של e2e)

| מדד | בפועל | יעד |
|---|---|---|
| שינוי העדפה | 16.3ms | פחות מ-100ms |
| Word, מסמך הדוגמה | 156ms | פחות מ-1000ms |
| Word, 5,000 שורות | 208ms | פחות מ-2000ms |
| Markdown, 5,000 שורות | 175ms | פחות מ-2000ms |
| HTML, 5,000 שורות | 164ms | פחות מ-1000ms |
| המשימה הארוכה ביותר | 59ms | פחות מ-1000ms |

## מעקב כיסוי

ראו `cross-unit-traceability.md`. התוצאה PASS: כל 64 המזהים מכוסים.

## כשלים

אין כשל של פקודה. אבל **שני יעדים לא אומתו**, כי הם דורשים בדיקה ידנית שלא ניתן להריץ כאן:

| יעד | למה לא אומת | מה נדרש |
|---|---|---|
| NFR1.2: בדיקה ידנית עם NVDA ו-VoiceOver | אין קורא מסך בסביבה האוטומטית, ואין בתוכנית שלב מאוחר יותר שאחראי עליה | אנשי QA מריצים את `docs/qa-checklist-v4.7.0.html` |
| FR3.8: קובץ ה-docx נפתח ב-Word בלי הודעת תיקון | Microsoft Word לא מותקן כאן. נבדקו המבנה, ה-XML, ה-CRC ו-`unzip -t` | פתיחה ידנית ב-Word, לפי פריט ברשימת ה-QA |

## החלטה על הכשל

ב-2026-11-02 המשתמש בחר **Accept failure**. שני היעדים, NFR1.2 ו-FR3.8-WORD, נשארים Unverified. הם נמסרים לבדיקה ידנית של אנשי ה-QA, בפריטים המתאימים ב-`docs/qa-checklist-v4.7.0.html`. היעדים לא הוחלשו ולא סומנו Met.

## Loop-Back Log

(אין. לא בוצעה חזרה לשלב קודם.)
