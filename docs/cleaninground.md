# Step 2: Cleaning round

## Objective

Give each participant the dataset assigned to them, collect one team
submission, and evaluate that submission without concurrent scoring conflicts.

## Participant workflow

1. The administrator assigns a dataset to each participant or team.
2. The application stores the dataset reference (for example, a Cloudflare R2
   object or Google Drive file) and exposes it to the assigned team members.
3. Every team member can view the assigned dataset and the cleaning
   requirements.
4. The team leader creates, saves, and edits the team's answers.
5. The backend validates the answers and assignment when the team leader clicks
   **Submit**.
6. A successful submission is locked for the team and becomes available to
   evaluators.

Draft data must be recoverable after a refresh or sign-in. Submission must be a
single backend transaction so a partial submission cannot appear as accepted.

## Evaluation workflow

1. An evaluator opens the next available submitted target.
2. The backend atomically creates an evaluator lease for that target.
3. If another evaluator already holds an active lease, the target is unavailable
   and must not be scored concurrently.
4. The evaluator records the score and feedback.
5. The backend stores the evaluator identity, timestamps, score, and feedback,
   then releases the lease in the same completion flow.
6. An administrator can inspect the evaluation history and reopen a target when
   correction is required.

Leases need an expiry or explicit release path so an abandoned evaluation does
not block the round indefinitely. The backend must enforce the lock; a
frontend-only flag is insufficient.

## Completion conditions

- Every eligible target has a validated submission.
- Every submitted target has an evaluation or an administrator-approved
  exception.
- Evaluation records identify the evaluator who accessed and scored the target.
- The administrator has approved the round for leaderboard generation.