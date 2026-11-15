# Synapse 2026 SAT documentation

This directory is the implementation reference for the event workflow. Follow
the documents in the order below.

## Event flow

1. [Registration and account setup](./registrations.md)
2. [Cleaning round](./cleaninground.md)
3. [Cleaning-round leaderboard](./leaderboard.md)
4. [Model training and submission](./modeltraining.md)
5. [Ranking and company selection](./ranking.md)
6. [Final company submission](./finalsubmission.md)
7. [Stage routing and administration](./generals.md)

The administrator controls which stage is public. A stage is not complete until
its document's completion conditions are satisfied and the administrator
advances the event to the next stage.

## Shared rules

- Every protected action is authorized by the signed-in account role.
- Team members may view their team's requirements, but only the team leader may
  edit or submit team answers.
- Draft answers may be saved and edited until submission.
- Validation runs in both the frontend and backend. The backend is the source
  of truth and must repeat all authorization and validation checks.
- A submission is immutable to the team after it is accepted. An administrator
  may reopen or correct a submission through an explicit administrative action.
- Evaluation assignment is atomic: one evaluator may hold one user/team
  evaluation at a time, and another evaluator must not score the same target
  concurrently.

## Terms

- **Stage**: the event phase currently enabled by an administrator.
- **Target**: the user or team being evaluated.
- **Draft**: saved, editable data that has not been submitted.
- **Submission**: validated data accepted by the backend and locked for the
  submitting team.
- **Evaluator lease**: the temporary lock proving that an evaluator owns a
  target evaluation.
