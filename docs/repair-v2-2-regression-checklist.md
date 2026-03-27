# Repair v2.2 Regression Checklist

Use this checklist as the acceptance pass for the stabilization work.

| Check | Status |
| --- | --- |
| App boots without white screen | Pass / Fail / Could not verify |
| Guest user can save locally | Pass / Fail / Could not verify |
| URL import with local fixture path or mocked structured data succeeds | Pass / Fail / Could not verify |
| AI route failure returns a user-safe error and no hanging spinner remains | Pass / Fail / Could not verify |
| Exact induction heat displays as one number, never a range | Pass / Fail / Could not verify |
| A step like `Brun kødet af` does not show an irrelevant onion-only hint | Pass / Fail / Could not verify |
| Deleting the active recipe clears active state and persisted active cache | Pass / Fail / Could not verify |
| Deleting the viewed recipe clears or redirects the stale recipe view | Pass / Fail / Could not verify |
| Service-worker cache version and recipe-cache version come from the same build-driven source | Pass / Fail / Could not verify |
| Docs and deploy config mention Firebase, not Supabase | Pass / Fail / Could not verify |
| Local structured fixture exists and parser verification is reported from it | Pass / Fail / Could not verify |
