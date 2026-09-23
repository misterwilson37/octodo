// ============================================================
// typed-date.test.mjs — Version 1.0.0
//
// Katie, on Android, where the native date picker cannot be typed into:
// *"that's why I want to be able to type in a date from whatever portal I'm
// using to access."* queue 1.3.0's parseTypedDate turns what she types into
// a date — or null, never a guess. These pin what it accepts, what it
// refuses, and how it fills in a missing year.
//
//   node typed-date.test.mjs      (run it with TZ=America/Chicago too)
// ============================================================

import { parseTypedDate } from "./queue.js";

let passed = 0, failed = 0;
const iso = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "null";
const at = (y, m, d) => new Date(y, m - 1, d, 14, 30).getTime();   // mid-afternoon, like a real tap
const is = (text, now, want, why) => {
  const got = iso(parseTypedDate(text, now));
  if (got === want) passed++;
  else { failed++; console.log(`  ❌ "${text}" → ${got}, expected ${want}  (${why})`); }
};

const TUE = at(2026, 9, 22);   // Tuesday 22 Sep 2026 — the day this was written

console.log("— the shapes she's most likely to type —");
is("10/15", TUE, "2026-10-15", "month/day");
is("10/15/2026", TUE, "2026-10-15", "full");
is("10/15/26", TUE, "2026-10-15", "two-digit year");
is("10-15", TUE, "2026-10-15", "dashes");
is("10.15", TUE, "2026-10-15", "dots");
is(" 10 / 15 ", TUE, "null", "spaces around slashes are not a shape we promise");
is("10 15", TUE, "2026-10-15", "a space");
is("2026-10-15", TUE, "2026-10-15", "ISO");

console.log("— a phone's number pad, which often has no slash —");
is("1015", TUE, "2026-10-15", "four digits = MMDD");
is("915", TUE, "2026-09-15", "three digits = MDD");
is("101526", TUE, "2026-10-15", "MMDDYY");
is("10152026", TUE, "2026-10-15", "MMDDYYYY");

console.log("— words —");
is("oct 15", TUE, "2026-10-15", "short month");
is("October 15", TUE, "2026-10-15", "full month, capitalised");
is("oct. 15th", TUE, "2026-10-15", "abbreviation dot and ordinal");
is("Oct 15, 2027", TUE, "2027-10-15", "with a year and a comma");
is("15 oct", TUE, "2026-10-15", "day first with a month name is unambiguous");
is("sept 30", TUE, "2026-09-30", "sept");
is("octo 15", TUE, "2026-10-15", "a prefix of the month");
is("octopus 15", TUE, "null", "…but not any word that starts with oct");

console.log("— relative to today —");
is("today", TUE, "2026-09-22", "today");
is("tomorrow", TUE, "2026-09-23", "tomorrow");
is("yesterday", TUE, "2026-09-21", "yesterday");
is("+3", TUE, "2026-09-25", "+N means days");
is("+2w", TUE, "2026-10-06", "weeks — Katie's laundry");
is("+1m", TUE, "2026-10-22", "a month");
is("+1y", TUE, "2027-09-22", "a year");
is("-5", TUE, "2026-09-17", "backwards");
is("fri", TUE, "2026-09-25", "the coming Friday");
is("tue", TUE, "2026-09-29", "today's own weekday means NEXT week, not today");
is("wednesday", TUE, "2026-09-23", "full weekday");
is("fr", TUE, "null", "two letters is too few to be sure");

console.log("— the missing year —");
is("1/10", at(2026, 12, 20), "2027-01-10", "in December, January means the coming one");
is("9/1", TUE, "2026-09-01", "three weeks ago stays this year (logging something late)");
is("7/1", TUE, "2027-07-01", "over 60 days gone means next year");
is("2/29", at(2027, 3, 1), "2028-02-29", "no Feb 29 this year → the next year that has one");

console.log("— refused, never guessed —");
is("2/30", TUE, "null", "no such day — must NOT roll into March");
is("13/1", TUE, "null", "no 13th month");
is("0/5", TUE, "null", "no month zero");
is("hello", TUE, "null", "words");
is("", TUE, "null", "empty");
is("12345", TUE, "null", "five digits is not a shape");

console.log(failed ? `\n❌ ${passed} passed, ${failed} failed` : `\n✅ ${passed} passed, 0 failed  (imported directly from queue.js)`);
process.exit(failed ? 1 : 0);
