# Step 5: Ranking and company selection

## Selection workflow

1. The administrator confirms that the model-training evaluations are complete.
2. The system calculates the ranking from the published scores and configured
   tie-breakers.
3. The administrator reviews the ranked teams and the available companies.
4. The system applies the configured round-robin selection order.
5. Each selected company is assigned to the corresponding team.
6. The administrator publishes the assignments.

Assignments must be recorded with the ranking snapshot, selection order,
company, team, and publication timestamp. Re-running the calculation must not
silently replace a published assignment.

## Completion conditions

- The ranking source and scoring intervals are identified.
- Every eligible team has either a company assignment or an administrator
  recorded exception.
- Published assignments are visible to the affected teams.