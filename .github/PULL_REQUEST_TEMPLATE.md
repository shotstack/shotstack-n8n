## What this changes

<!-- One or two sentences. What was wrong, and what it does now. -->

## How you can tell it works

<!-- The command you ran, or the workflow you built. If the change is
behavioural, name the test that fails without it. -->

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `node scripts/review-check.mjs` — every check passes
- [ ] Ran it in a real n8n (`npm run dev`) if the change touches a field, an
      operation, or a request

## Anything a reviewer should push back on

<!-- Trade-offs you made, things you were unsure about, anything you could not
verify. Say "nothing" if there is nothing. -->

---

Branch off `dev`. Only a tag on `main` publishes.
Do not edit `nodes/Shotstack/reference/` by hand — it is generated.
