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
