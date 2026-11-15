# Step 1: Registrations and account setup

## Overview

Participant registrations will be collected through [Unstop](https://unstop.com/). The
application will use the data exported from Unstop to create and maintain participants,
teams, and application accounts.

The registration workflow must support:

- Importing registrations from Excel, CSV, or JSON.
- Creating participants and teams from an import.
- Linking participants to their teams.
- Updating existing records when a later import contains the same participant or team.
- Manually creating teams and adding or removing participants.
- Managing participant restrictions and team disqualification.

## Data model

### Participant

A participant represents a person registered for the event.

```js
{
  firstName: "",
  lastName: null,
  email: "",
  college: "",
  teamId: null,
  role: "member", // "member" | "leader"
  restricted: false
}
```

| Field | Description |
| --- | --- |
| `firstName` | Participant's first name. |
| `lastName` | Participant's last name; may be absent. |
| `email` | Participant's unique email address. |
| `college` | Participant's college or institution. |
| `teamId` | Reference to the participant's team; may be absent until assigned. |
| `role` | The participant's role within the team: `member` or `leader`. |
| `restricted` | Whether the participant is restricted from participating. |

### Team

A team groups participants who registered together.

```js
{
  teamName: "",
  members: [], // participant references
  leaderId: null, // participant reference
  disqualified: false
}
```

| Field | Description |
| --- | --- |
| `teamName` | The team's registered name. |
| `members` | References to participants belonging to the team. |
| `leaderId` | Reference to the participant leading the team. |
| `disqualified` | Whether the team is disqualified from the event. |

### Account

An account controls access to the application. Accounts are separate from
participants and teams.

```js
{
  name: "",
  email: "",
  role: "public" // "public" | "evaluator" | "admin"
}
```

| Field | Description |
| --- | --- |
| `name` | Account holder's display name. |
| `email` | Account holder's Google account email address. |
| `role` | Application access level: `public`, `evaluator`, or `admin`. |

## Authentication and account provisioning

1. The first administrator account will be provisioned during backend setup. This
   may be done by seeding the database from an environment variable or through a
   documented setup command.
2. A user signs in with Google authentication.
3. The application looks up the authenticated user's email address.
4. The matching account's role determines which pages and actions the user can
   access.
5. Administrators can create additional `public`, `evaluator`, and `admin`
   accounts.

Account emails must be treated as unique. An authenticated email without a
provisioned account should not receive elevated access.

## Import workflow

Administrators can upload an Excel, CSV, or JSON file containing registration
data. The import process should:

1. Validate the file format and required fields.
2. Normalize values such as email addresses and empty fields.
3. Match each participant and team to an existing record using the agreed
   identity fields.
4. Create records that do not already exist.
5. Update existing records with values from the new import.
6. Create or update participant-team relationships.
7. Report validation errors and skipped rows without silently discarding data.
8. Provide an import summary containing created, updated, skipped, and failed
   records.

The import must be idempotent: importing the same source data more than once
must not create duplicate participants or teams.

## Administrator interface

The administrator interface should provide the following capabilities.

### Account management

- Create accounts with the `public`, `evaluator`, or `admin` role.
- View account details.
- Change an account's role when authorized.

### Import management

- Upload Excel, CSV, and JSON files.
- Validate the proposed changes before applying them.
- Display import results and row-level errors.

### Team and participant management

- List all teams and their members.
- Toggle a team's disqualification status.
- View each participant's details.
- Toggle a participant's restricted status.
- Move a participant to another team.
- Remove a participant from a team.
- Manually create a team.
- Manually add participants to a team.

Actions that change eligibility or team membership should require administrator
authorization and should be reflected immediately in subsequent views.

## Open decisions

The following details must be finalized before implementation:

- The exact Unstop export column names and the identity fields used for matching.
- Whether a participant may belong to more than one team.
- Whether a team must always have exactly one leader.
- Whether removing a participant deletes the participant or only clears `teamId`.
- Whether imports should support a preview-and-confirm step.
- Whether changes to restrictions, disqualification, role assignments, and imports
  require an audit log.
