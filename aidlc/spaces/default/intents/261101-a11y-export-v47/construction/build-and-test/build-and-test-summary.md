# סיכום Build and Test — v4.7.0

## מקורות

- `construction/code-generation/code-generation-plan.md` (code-generation-plan): ה-Testing Contract (TDD, ‏standard, ‏refactor)
- `construction/code-generation/unit-test-instructions.md` (unit-test-instructions)
- `construction/code-generation/code-summary.md` (code-summary)
- `construction/nfr-requirements/*.md`: מקור כל היעדים המדידים. בתוכנית אין שלב NFR Design.
- `test-results.md`, ‏`cross-unit-traceability.md`

## מצב כללי

- **בנייה:** הצליחה (`npm run dist`).
- **בדיקות:** כולן עברו. 459 בדיקות יחידה, וכל קובצי ה-e2e (6 קבצים, 0 כשלים).
- **כיסוי:** 99.08% ב-`a11y.js` ו-99.89% ב-`export-core.js`.
- **יעדים:** 54 התקיימו (Met). 2 לא אומתו (Unverified), כי הם דורשים בדיקה ידנית (NFR1.2 ופתיחה ב-Word).

## סוגי בדיקות

| סוג | קובץ הוראות |
|---|---|
| יחידה | `construction/code-generation/unit-test-instructions.md` |
| אינטגרציה ו-e2e | `integration-test-instructions.md` |
| ביצועים | `performance-test-instructions.md` |
| אבטחה | `security-test-instructions.md` |
| נגישות | בתוך ה-e2e (חלקים a, b, f), ובדיקת יחידה של ניגודיות. ידנית: `docs/qa-checklist-v4.7.0.html` |

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-COVERAGE | code-generation-plan › Testing Contract; observability NFR11.2 | ≥90% שורות בשני המודולים | 99.08% / 99.89% | `npm run coverage` | build-and-test | Met |
| TC-SUITE | Testing Contract › scope_floor | הבדיקות הקיימות ירוקות | 459/459, ‏e2e 0 כשלים | `npm test`, ‏`npm run e2e` | build-and-test | Met |
| NFR1.1 | accessibility-requirements | הקריטריונים האוטומטיים מכוסים | כן | e2e חלקים a, b, f; ‏`test/a11y-contrast` | build-and-test | Met |
| NFR1.2 | accessibility-requirements | בדיקה ידנית עם NVDA ו-VoiceOver | לא בוצעה | — | אין שלב מאוחר יותר; ‏QA ידני | Unverified |
| NFR1.3 | accessibility-requirements | רשימת ה-QA מכסה FR1–FR6 ו-NFR1–NFR4 | 51 פריטים, כיסוי מלא | `test/qa-checklist.test.js` (BR6.2) | build-and-test | Met |
| NFR1.4 | accessibility-requirements | סקירת מומחה רשומה כמגבלה | רשומה | `BACKLOG.md` §4.5 ו-§4.7 | build-and-test | Met |
| NFR2.1 | accessibility-requirements | `contrast()` לפי WCAG | 21, ‏4.54 | `test/a11y.test.js` | build-and-test | Met |
| NFR2.2 | accessibility-requirements | 4.5:1 / 3:1; ב-`.hc` ‏7:1 | עובר ב-4 המצבים | `test/a11y-contrast.test.js` | build-and-test | Met |
| NFR2.3 | accessibility-requirements | רשימת הזוגות | נבדקת | `test/a11y-contrast.test.js` | build-and-test | Met |
| NFR3.1 | accessibility-requirements | 150% ב-400px, בלי גלילה אופקית | עובר | e2e חלק f | build-and-test | Met |
| NFR4.1 | accessibility-requirements | כל פקד נגיש מהמקלדת | עובר | e2e חלקים a, b, f | build-and-test | Met |
| NFR4.2 | accessibility-requirements | ‏`:focus-visible` של 3px לפחות | עובר | e2e חלק f | build-and-test | Met |
| NFR4.3 | accessibility-requirements | אין מלכודת מקלדת | עובר | e2e חלק f ("Shift+Tab leaves the export panel") | build-and-test | Met |
| NFR4.4 | accessibility-requirements | שטח לחיצה של 32×32 לפחות | עובר | e2e ("hit area ≥ 32×32") | build-and-test | Met |
| NFR5.1 | accessibility-requirements | אנימציות רק תחת `no-preference` | עובר | `test/v47-static.test.js` | build-and-test | Met |
| NFR6.1 | accessibility-requirements | אין hex בקוד החדש | עובר | `test/v47-static.test.js` | build-and-test | Met |
| NFR7.1 | performance | פחות מ-1000ms | 156ms | e2e חלק d | build-and-test | Met |
| NFR7.2 | performance | פחות מ-100ms | 16.3ms | e2e חלק b | build-and-test | Met |
| NFR7.3 | performance | פחות מ-2000ms | Word ‏208ms, ‏MD ‏175ms | e2e חלק d | build-and-test | Met |
| NFR7.4 | performance | פחות מ-1000ms | 164ms | e2e חלק d | build-and-test | Met |
| NFR7.5 | performance | המשימה הארוכה פחות מ-1000ms; ‏`aria-busy` לפני ההורדה | 59ms; כן | e2e חלק d | build-and-test | Met |
| NFR7.6 | performance | 1MB בלי חריגה | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR7.7 | performance | ‏`0xCBF43926` | עובר | `test/export-zip.test.js` | build-and-test | Met |
| NFR7.8 | scalability | עד 1MB | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR7.9 | scalability | 200 רשימות, וכל אחת מתחילה מ-1 | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR7.10 | scalability | 9 רמות קינון | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR7.11 | scalability | 63 עמודות, והמשתמש מקבל הודעה | עובר | `test/export-docx.test.js`; e2e חלק d | build-and-test | Met |
| NFR7.12 | scalability | 500 rId ייחודיים | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR8.1 | reliability | 4 הקבצים ב-ASSETS וב-FILES | עובר | `test/service-worker.test.js`; ‏`ls dist` | build-and-test | Met |
| NFR8.2 | reliability | מטמון `v4.7.0-build-…` | ‏`…20261102-01` | `test/version-sync.test.js` | build-and-test | Met |
| NFR8.3 | reliability | ייצוא Word בלי רשת | עובר | e2e חלק d | build-and-test | Met |
| NFR8.4 | reliability | ‏`canDownload` משבית עם הסבר | עובר | `test/export-html.test.js`; e2e חלק d | build-and-test | Met |
| NFR8.5 | reliability | אחסון חסום או מלא לא שובר את העבודה | עובר | `test/a11y.test.js`; e2e חלק g | build-and-test | Met |
| NFR8.6 | reliability | פיצול הקראה של 200 תווים, ומקרי קצה | עובר | `test/a11y.test.js`; e2e חלק c | build-and-test | Met |
| NFR8.7 | reliability | חריגה מחזירה ל-idle | עובר | e2e חלק d (שגיאה מוזרקת) | build-and-test | Met |
| NFR8.8 | reliability | פלט דטרמיניסטי | עובר | `test/export-zip.test.js` | build-and-test | Met |
| NFR9.1 | security | ‏escaping ב-XML | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR9.2 | security | בלי סקריפט; ה-CSP ראשון; בלי `http:` | עובר; 0 הפרות CSP בדפדפן | `test/export-html.test.js`; e2e חלק d | build-and-test | Met |
| NFR9.3 | security | ה-hash של `PRINT_SCRIPT` תואם | עובר | `test/export-html.test.js` | build-and-test | Met |
| NFR9.4 | security | 7 קישורים שליליים ו-2 חיוביים | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR9.5 | security | ‏`innerHTML` רק לפי רשימת היתר | עובר | `test/v47-static.test.js` | build-and-test | Met |
| NFR9.6 | security | ‏`core.xml` פרטי | עובר | `test/export-docx.test.js` | build-and-test | Met |
| NFR9.7 | security | בלי תוכן המסמך בלוג | עובר | `test/v47-static.test.js` | build-and-test | Met |
| NFR9.8 | security | CSS עוין נחסם | עובר | `test/export-html.test.js` | build-and-test | Met |
| NFR9.9 | security | ב-localStorage רק העדפות | עובר; נבדק בקריאת הקוד ובבדיקות האחסון | `a11y.js`; `test/a11y.test.js` | build-and-test | Met |
| NFR10.1 | reliability | הבדיקות הקיימות ירוקות | 459/459; ‏e2e 0 כשלים | `npm test`; ‏`npm run e2e` | build-and-test | Met |
| NFR10.2 | reliability | בדיקות שעודכנו לא הוחלשו | נבדק בסקירת הקוד (READY) | review-01 של code-generation | build-and-test | Met |
| NFR10.3 | reliability | ‏`mdw_theme` ישן נשמר | עובר | `test/a11y.test.js`; e2e חלק b | build-and-test | Met |
| NFR10.4 | reliability | חלופת rem רק אם `zoom` נכשל | ‏`zoom` עבר, ולא נדרשה חלופה | e2e חלק f | build-and-test | Met |
| NFR11.1 | observability | נטען ב-node | עובר | `test/a11y.test.js` | build-and-test | Met |
| NFR11.2 | observability | 90% שורות | 99.08% / 99.89% | `npm run coverage` | build-and-test | Met |
| NFR11.3 | observability | ‏e2e מכסה את WF1 עד WF8 | חלקים a עד g | `e2e/v47-a11y-export.e2e.js` | build-and-test | Met |
| NFR11.4 | observability | ‏`console.error('[mdw-export]', …)` | עובר | e2e חלק d | build-and-test | Met |
| NFR11.5 | observability | בלי שליחה החוצה | עובר | `test/v47-static.test.js` | build-and-test | Met |
| NFR11.6 | observability | ‏e2e נכשל על שגיאת קונסול לא צפויה | ‏`problems: none` | `npm run e2e` | build-and-test | Met |
| FR3.8-WORD | requirements FR3.8 | ה-docx נפתח ב-Word בלי הודעת תיקון | לא נבדק ב-Word. המבנה, ה-XML, ה-CRC ו-`unzip -t` עברו | `test/export-docx.test.js`; ‏`test/export-zip.test.js` | אין שלב מאוחר יותר; ‏QA ידני | Unverified |

## מוכנות

- **מוכן לבנייה:** כן.
- **מוכן לבדיקה:** כן. כל הבדיקות האוטומטיות ירוקות.
- **מוכן לשחרור:** כן, בכפוף לבדיקה הידנית של אנשי ה-QA. שני היעדים שלא אומתו (NFR1.2 ופתיחה ב-Word) התקבלו כמסירה ל-QA ("Accept failure", 2026-11-02). בתוכנית אין שלב פריסה.

## מגבלות ידועות

ראו `BACKLOG.md` §4.7:
- R-07: ביטול חלקי אחרי הדבקה של כמה שורות.
- תרשימים מוצגים כקוד ב-Word, ותמונות כקישור.
- דף A4 לאורך.
- Chromium בלבד.
- עטיפת קובץ ה-MD לא מזוהה כשפותחים אותו מחדש.
- שם קובץ HTML משותף.
- ארבעת ממצאי ה-Minor מהסקירה.
