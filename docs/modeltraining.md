# Step 4: Model training and submission

## Access

1. After the cleaning round is accepted, the administrator opens the model
   training stage.
2. Each eligible team can view the five available datasets and the feature
   requirements.
3. All teammates can view the requirements and submission state.
4. Only the team leader can create, edit, save, or submit the team's response.

## Draft and submission workflow

1. The team leader saves a draft while developing the solution.
2. The application validates every draft in the frontend for immediate
   feedback.
3. The backend repeats validation and authorization on every save.
4. The team leader submits the completed response.
5. The backend validates the final response in one transaction and locks it.
6. If a team submits by mistake, an administrator can explicitly reopen the
   submission and record the reason. Reopening must be visible in the audit
   history.

Drafts should be persisted on the server so that they survive a refresh,
browser change, or sign-in. Local browser state may be used for convenience but
must not be the only copy.

## Required submission fields

- Company name
- Model or approach description
- Accuracy results
- Source code (GitHub link)

The GitHub link must be validated as a URL by both frontend and backend
validation. Additional field constraints belong in the stage configuration so
they can be changed without duplicating rules.

## Evaluation

Model-training evaluation follows the same atomic evaluator-lease workflow as
the [cleaning round](./cleaninground.md). Scores are mapped to the configured
intervals, and the evaluator identity and score changes are retained.
