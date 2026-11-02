# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture
- **Methodology**: TDD
- **Ordering**: for every applicable testable layer, write failing tests first (Red), implement the minimum to pass (Green), then refactor while green.


<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- הוספו שאלות Q9 עד Q12 מעבר לשמונה שאלות הבסיס של השלב (learned 2026-10-30) <!-- cid:261030-parser-v46:intent-capture:209d207f8cd17191f482e500f4420f2b40a9841b326b77441be445c104e53596 -->
- תמיד לשאול שאלות בירור עם המלצה מסומנת (learned 2026-10-30) <!-- cid:261030-parser-v46:intent-capture:37922ac8633c685dc9a901c434026312937f78188dabd2c9b60661266db059db -->
- ALWAYS לקבוע את שיטת הבדיקות (Methodology ו-Ordering תחת Testing Posture) לפני שנכנסים לשלב Code Generation; עד שהתוכנית מאושרת, השומר חוסם את כלי הלקחים ואת השינוי בחוזה (learned 2026-10-31) <!-- cid:261030-parser-v46:code-generation:57a704b26c4d2aa66681c5d31a4489d6794b76ed89f917ef98957c8c3f759768 -->
- ALWAYS להפיק תוצרי QA כקובץ HTML בעברית וב-RTL, עם צבע ירוק על סימון תקין, שמירה אוטומטית בדפדפן וכפתור "שמור עותק" (learned 2026-11-01) <!-- cid:261101-a11y-export-v47:intent-capture:9252142ff1957bf51ffa96f877574bf08e0d35ba7b44026c0524528eee0badfe -->
- ALWAYS לממש פורמטים מורכבים (כמו `.docx`) בקוד פנימי של הפרויקט, למשל כותב ZIP עם STORE ו-CRC32, כדי לשמור על zero-deps (learned 2026-11-01) <!-- cid:261101-a11y-export-v47:requirements-analysis:476e12d9d689d6dd436cd3a63586d56a048e64554ce73ca3e46a0fe93e02e0dc -->
- ALWAYS להשתמש ב-`aria-checked` (ולא ב-`aria-pressed`) לפקד עם `role="switch"`, לפי ARIA 1.2 (learned 2026-11-01) <!-- cid:261101-a11y-export-v47:requirements-analysis:aa925bf81fb53f9e4d394a7cc656d1cb0dffac4e24f6b5ab73969eefb5e3f3ed -->
- ALWAYS להכין בשלב העיצוב מוקאפ ויזואלי ב-HTML (מסכים ומצבים, עם הפניות לדרישות) לצד המסמכים הטקסטואליים, כי מי שמאשר לא טכני (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:refined-mockups:4b121218934e604f435abeffb13442138cac248a164e05b22bacaeeb8b279eed -->
- ALWAYS לחשב יחסי ניגודיות בפועל לפי נוסחת WCAG ולא להעריך אותם; כשטוקן קיים לא עומד בסף, להוסיף טוקן ייעודי לרכיבים החדשים במקום לשנות את הקיים (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:refined-mockups:15ff8c8a8e93cbde4144c64c7db3a2666e82212d5f1d9de58a6a0fa76c7e4f17 -->
- ALWAYS לתכנן ייצוא Word בעברית עם תכונות complex script (`w:bCs`, `w:iCs`, `w:szCs`, `w:rFonts w:cs`), פיצול רצים לפי כתב, יישור לוגי start/end, ופירוט מלא של חלקי החבילה, rels ו-Content Types, כדי שהקובץ ייפתח בלי הודעת תיקון (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:functional-design:7fd989157a3b570ddfc4f6f2864678ac6e586065b243dc3a27ae8fd0166657e8 -->
- ALWAYS לשמר את ההתנהגות הקיימת כשמתקנים הערת סקירה, ולשנות רק את מה שההערה דורשת; נסיגה מהתנהגות גרסה קודמת חייבת להיות מתועדת כחריגה (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:functional-design:eaec4f7d6f034b9872d37fe71c422d958c4873a52980cc76729a946b39ddf0b6 -->
- ALWAYS לפרש בפרויקט הזה (אפליקציה בלי שרת) קנה מידה כגודל ומבנה המסמך, ותצפית כרישום מקומי בלי תוכן המסמך ויכולת בדיקה, בלי SLO ובלי טלמטריה (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:nfr-requirements:a22f4ac2167409878aa8e4b88e906aafc6f3bbc49e652ed1f0ea2f7f48284dd5 -->
- ALWAYS לשמור hash של סקריפט inline ל-CSP כקבוע מקודד עם בדיקת יחידה שמחשבת אותו, ו-NEVER לאפשר `http:` בקבצי HTML מיוצאים (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:nfr-requirements:fd46ef6aff91cead5d4be3e72b323502712ed22bde3a401bc2b02b1671133004 -->
- ALWAYS לפצל בנייה ארוכה (עשרות שלבים) לכמה הרצות של המפתח לפי חלקי התוכנית, ולאמת כל הרצה בנפרד (בדיקות יחידה ו-e2e) לפני ההרצה הבאה (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:code-generation:e28151650c23b49257f3f887c1364cc4812e6400ab22cea4dffff394358edc97 -->
- NEVER לכתוב `'</script>'` גולמי בתוך הסקריפט המוטבע ב-`index.html`; לכתוב `'<\/script>'`, ולהשאיר בדיקה שהסקריפט הראשי מתקמפל (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:code-generation:309ffaca5c1cd63fe7ab3b18ee8d81b4689d971c1bb6648da00a8a6605c93d7c -->
- ALWAYS לסמן יעד שדורש בדיקה ידנית (קורא מסך, פתיחה ב-Word) כ-Unverified כשאין שלב מאוחר שאחראי עליו, ולמסור אותו לרשימת ה-QA; NEVER לסמן אותו Met על סמך בדיקה אוטומטית חלקית (learned 2026-11-02) <!-- cid:261101-a11y-export-v47:build-and-test:0d4f2c98805997e015779fd79bfcbf00bddc47c33f3cec1be569445c676a686a -->
