# הוראות בדיקות ביצועים — v4.7.0

## מקורות

- `construction/nfr-requirements/performance-requirements.md` (NFR7.1 עד NFR7.7)
- `construction/code-generation/code-generation-plan.md` (code-generation-plan): שלב 42
- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions), `construction/code-generation/code-summary.md` (code-summary)

## הרצה

הבדיקות של NFR7.1 עד NFR7.5 נמצאות בחלקים b ו-d של קובץ ה-e2e החדש:

```bash
PARTS=b,d NODE_PATH="$HOME/.local/share/mdw-e2e/node_modules" node e2e/v47-a11y-export.e2e.js
```

הבדיקות של NFR7.6 עד NFR7.12 הן בדיקות יחידה:

```bash
node --test test/export-docx.test.js test/export-zip.test.js
```

## יעדים

| מזהה | יעד |
|---|---|
| NFR7.1 | Word של מסמך הדוגמה: פחות משנייה |
| NFR7.2 | שינוי העדפה: פחות מ-100ms |
| NFR7.3 | Word ו-Markdown של 5,000 שורות: פחות מ-2 שניות |
| NFR7.4 | HTML של 5,000 שורות: פחות משנייה |
| NFR7.5 | המשימה הארוכה ביותר: פחות משנייה, ו-`aria-busy` מופיע לפני ההורדה |
| NFR7.6, NFR7.8 | קלט של 1MB נבנה בלי חריגה |
| NFR7.7 | `crc32("123456789")` שווה `0xCBF43926` |

## סביבה

Chromium דרך Playwright 1.64.1, על מחשב הפיתוח, בלי האטה מלאכותית.
