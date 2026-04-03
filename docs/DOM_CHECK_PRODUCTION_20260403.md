# DOM Check Production - tnc.io.vn (2026-04-03)

## Scope
- URL checked: https://tnc.io.vn/auth
- Device profile: iPhone 12 (390x844) via Playwright
- Script: scripts/dom-debug-auth.mjs

## Raw Findings
- HTTP status: 200 OK
- Runtime error: PAGEERROR Cannot access 'e0' before initialization
- DOM readyState: complete
- hasEmail (#email): false
- hasPassword (#password): false
- buttonCount: 0
- bodyLen: 0

## Verdict
- Release line for commercial GO is NOT clean on production auth route.
- Reason: frontend runtime crash before login form render.

## Business impact
- New users cannot login from production route.
- Sales demo and onboarding conversion are blocked at first touch.

## Immediate action list (same day)
1. Roll back to last known stable build OR hotfix bundle causing `e0` initialization error.
2. Re-run DOM check after deploy until:
   - hasEmail=true
   - hasPassword=true
   - buttonCount>0
3. Re-run QA mobile gate on production domain and regenerate evidence.
4. Only then resume paid traffic and sales outreach.

## Command executed
- node scripts/dom-debug-auth.mjs
