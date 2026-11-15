# Step 3: Cleaning-round leaderboard

## Generation

1. After an evaluation is completed, the system recalculates the cleaning-round
   results for the administrator.
2. The leaderboard includes only eligible targets with valid scores.
3. Scores are ordered using the configured event tie-breakers. The tie-breaker
   policy must be visible to administrators before publication.
4. The administrator reviews the generated results.
5. When the administrator publishes the leaderboard, it becomes the public
   stage and the main route displays it.

## Updates

Published results must be recalculated whenever an authorized administrator
changes a score or reopens an evaluation. The public view must show the latest
published result, while preserving the previous value in the audit history.

The leaderboard is used after cleaning. Model-training results are handled
separately and are mapped to the configured scoring intervals described in
[model training](./modeltraining.md).

## Completion conditions

- All eligible cleaning evaluations are complete or excepted.
- The administrator has reviewed the ordering and tie-breakers.
- The published snapshot has a timestamp and can be reproduced from its source
  evaluations.