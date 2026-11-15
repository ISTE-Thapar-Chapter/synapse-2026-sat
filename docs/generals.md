# Step 7: Stage routing and administration

## Stage control

1. The administrator selects the current event stage in the admin portal.
2. The backend stores the stage as the single active stage.
3. The public route resolves the active stage and redirects or renders that
   stage at `/`.
4. Protected stage routes still enforce role, team membership, and submission
   state.
5. Advancing or returning to a stage records the administrator, timestamp, and
   reason.

The stage should be represented by a stable identifier rather than a URL path.
This keeps links such as `/cleaning` and `/ranking` useful while allowing the
active stage to control the public home page.

## Administrative corrections

Administrators may reopen submissions, correct evaluation status, and republish
leaderboards. These actions must be explicit, authorized, and auditable; they
must not silently mutate historical records.

## Suggested stage identifiers

`registration`, `cleaning`, `cleaning-leaderboard`, `model-training`,
`ranking`, and `final-submission`.
