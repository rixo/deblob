# Chapter GOAL — driver layer

Close the laundering venue that "assembly" was for two months: code outside the
hexagon lived under a label with the widest import right and no verb list, so a
detector table, a run sequence and argv parsing sat in `main.ts` with every rule
green.

Success:

- The canon (`docs/architecture.md`) rules every file kind outside the hexagon
  with a closed verb list: assembly builds, driver fires, boot starts. No kind
  can absorb a line of logic without turning red; the only unruled code left is
  blob, counted.
- The rules are checkable for every tech whose driver is plain TypeScript, and
  the per-tech parts (hook cutting, exemptions) are named as such, so the web
  case is open by declaration, not by omission.
- deblob's own CLI obeys them (boot, driver, assembly, CLI service), and the
  checker enforces them on itself.
- Slugs in code, skills and README follow canon.

Out of scope here: the web driver's internals (templates, views, the fat store,
`.context`) — research, stress-tested by the viewer chapter first.

Raw material: `research/talk-2026-09-13.md` (the three-day thread, VERDICT
preface first). Board: `PLAN.md`.
