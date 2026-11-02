# החלטות טכנולוגיה — v4.7.0

## מקורות

- הדרישות: `aidlc/spaces/default/intents/261101-a11y-export-v47/inception/requirements-analysis/requirements.md` (requirements: אילוצים, NFR8, NFR11)
- `construction/functional-design/functional-spec.md` (functional-spec: §1, WF7) ו-`rules.md` (rules: BR7.9, BR7.11)
- `package.json`, ‏`project.md` (Testing Posture: TDD)
- תשובות שלב זה: Q5, Q9

## החלטות

| נושא | החלטה | נימוק | חלופה שנדחתה |
|---|---|---|---|
| שפה | JavaScript (ES2020) בלי שלב בנייה | הפרויקט Vanilla JS, ואין build | TypeScript: דורש שלב בנייה ותלות |
| תלויות | אפס תלויות בזמן ריצה ובבנייה | אילוץ הפרויקט, ולקח שנשמר | ספריית `docx` או `JSZip`: שוברות zero-deps ואת העבודה בלי רשת |
| מבנה מודולים | UMD לשני המודולים הטהורים (כמו `md-visual.js` ו-`css-studio.js`). הקבצים הטהורים לא נוגעים ב-DOM, וקבצי ה-UI מקבלים תלויות מוזרקות | בדיקה ב-node, ועקביות עם הקיים | ES Modules: לא נטענים ב-`file://`, ודורשים שינוי בטעינה |
| docx | ‏OOXML שנבנה ידנית, ‏ZIP STORE ו-CRC32 פנימי (WF7) | בלי דחיסה הקובץ גדול יותר, אבל אין תלות. Word פותח STORE בלי בעיה | ‏`CompressionStream('deflate-raw')`: אסינכרוני ומסבך בדיקות דטרמיניסטיות. אפשר לשקול בעתיד |
| גודל טקסט | ‏CSS `zoom` על `body` (BR7.11) | תקני ב-Chromium 128 ומעלה ושומר פריסה | ‏rem: שינוי רחב. מוגדר כחלופה |
| הקראה | Web Speech API (`speechSynthesis`) | מובנה בדפדפן, עם קולות עבריים במערכות ההפעלה | ספריית TTS: תלות, ובדרך כלל דורשת רשת |
| דפדפן יעד | Chromium 128 ומעלה (Chrome ו-Edge) | הסביבה בארגון, ו-`zoom` תקני | ‏Firefox ו-Safari: מחוץ להיקף, ורשום ב-BACKLOG |
| בדיקות יחידה | ‏`node --test` עם Node 20 ומעלה, וכיסוי ב-`--experimental-test-coverage` | מובנה ב-Node, בלי תלות | Jest או Vitest: תלות |
| בדיקות e2e | Playwright 1.64.1, מותקן ב-`$HOME/.local/share/mdw-e2e` ומורץ עם `NODE_PATH` | כבר בשימוש, ולא מוסיף תלות לפרויקט | ‏devDependency: שובר zero-deps ב-`package.json` |
| שיטת עבודה | ‏TDD (Red, Green, Refactor) לכל שכבה שאפשר לבדוק | ‏`project.md`, ‏Testing Posture | בדיקות אחרי המימוש |
| מחרוזות | אובייקט `STR` בראש כל קובץ UI | ריכוז הניסוחים בעברית ובדיקה קלה | קובץ i18n נפרד: מיותר לשפה אחת |
