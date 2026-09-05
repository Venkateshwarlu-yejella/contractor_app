# Site Saathi API contract

All application endpoints require a trusted signed-in identity from the hosting dispatcher. The API also requires an active family membership. `scope` is either `demo` or `live`. The deployment contains one family business. Money is integer paise; dates are `YYYY-MM-DD` in Asia/Kolkata.

JSON responses use `Cache-Control: private, no-store`. Mutations verify browser origin and reject cross-site requests. Endpoints never accept a client-supplied actor or administrator claim.

## Endpoints

| Method | Path | Role | Result |
| --- | --- | --- | --- |
| POST | `/api/setup` | Signed-in initial owner | Atomically initialize the family and fictional sample workspace; existing ownership is retained |
| GET | `/api/state?scope=live` | Member | Workers, sites, attendance, payments, permitted member details, current user, revision and business date |
| GET | `/api/events` | Member | Stream `revision` events; reconnect after approximately 30 seconds |
| POST | `/api/workers` | Admin | Create or version-check an edited worker; an existing opening balance is fixed |
| POST | `/api/sites` | Admin | Create or version-check an edited site |
| POST | `/api/attendance` | Operator today, admin past dates | Set the worker’s two half-day slots with a required expected version |
| POST | `/api/payments` | Operator today, admin past dates | Append a wage payment or advance |
| POST | `/api/reversals` | Admin | Append an equal reversal with a reason |
| POST | `/api/members` | Admin | Allow, update or disable a family member; owner must remain an active admin |
| POST | `/api/photos?scope=live` | Admin | Upload raw JPEG/PNG bytes, at most 5 MiB, return media ID |
| GET | `/api/photos/:id` | Member | Return private image bytes or 404 |
| GET | `/api/audit?scope=live&before=1000` | Admin | Up to 100 most recent audit entries, with a cursor for the next page |

The `members` API changes the app’s allowlist. It does not change hosting audience or send invitations. Disabling a member is enforced again on ordinary API requests and stream checks.

## Common mutation envelope

```json
{
  "scope": "live",
  "operationId": "22e25f54-3f6f-47dc-8eef-1e7631b8b6ef"
}
```

This UUID is an illustrative example, not a provisioned record. Clients generate one UUID per logical save. Retry the same request with the same ID after an uncertain response. A successful response is `{ "ok": true, "id": "…" }`; an exact retry adds `"replayed": true`. The transaction receipt checks payload hash and actor. Reusing an ID for different data is HTTP 409.

## Worker create / edit

```json
{
  "scope": "live",
  "operationId": "22e25f54-3f6f-47dc-8eef-1e7631b8b6ef",
  "name": "Ramesh",
  "phone": "+91 00000 00000",
  "dailyWage": 90000,
  "openingBalance": 0,
  "photoKey": "REPLACE_WITH_UPLOADED_MEDIA_ID",
  "active": 1
}
```

Use actual uploaded media and worker IDs returned by the API; placeholders above are illustrative. The phone is optional and should not be copied from this example. Real workers require a photo. `dailyWage` is 1–100,000 rupees in whole-rupee increments. `openingBalance` allows positive or negative integer paise up to ±1,000,000 rupees.

To edit, also include the existing `id` and `version`. Keep the original opening balance. The response records a new version internally. `active: 0` archives the worker while retaining history. There is no delete operation.

## Site create / edit

Supply `name`, `owner`, `address`, `color` (`orange`, `blue`, `purple` or `green`), `photoKey` (ID or null), and `active`. For an edit also supply `id` and `version`. Photos are optional for sites but useful for recognition. Workers are not permanently assigned to one site; attendance is the source of actual site allocation.

## Attendance

```json
{
  "scope": "live",
  "operationId": "31cfc422-4ec0-4b2c-858c-32a0dd4ca42a",
  "workerId": "RETURNED_WORKER_ID",
  "date": "2026-09-05",
  "amSiteId": "RETURNED_SITE_A_ID",
  "pmSiteId": "RETURNED_SITE_B_ID",
  "version": 0,
  "reason": ""
}
```

`version: 0` is for an unmarked worker/day. Otherwise pass the returned version. The API rejects an old version with HTTP 409. The server obtains the wage; clients cannot submit an arbitrary earned amount.

| Attendance choice | Morning | Afternoon |
| --- | --- | --- |
| Full day | Same site ID | Same site ID |
| Morning half | Site ID | null |
| Afternoon half | null | Site ID |
| Split day | Site A ID | Site B ID |
| Absent | null | null |

References must be active sites in the same scope. A previously populated slot keeps its saved wage when moved. A newly populated slot uses half the current daily wage. Past-date changes to an existing row require an administrator and a reason of at least three characters. Future attendance is rejected.

## Payments

```json
{
  "scope": "live",
  "operationId": "8a5f7056-f28a-457d-a816-a94c74577a30",
  "workerId": "RETURNED_WORKER_ID",
  "amount": 100000,
  "kind": "advance",
  "date": "2026-09-05",
  "method": "cash",
  "notes": ""
}
```

This records ₹1,000. `kind` is `payment` or `advance`; `method` is `cash`, `upi` or `bank`. Amount must be positive integer paise, up to ₹1,000,000. The server never moves money. A balance can become negative; that represents a remaining advance rather than an error.

Payment edits are not supported. To correct a mistaken record, reverse it and add the correct record using new operation IDs.

## Reversals

Send `scope`, `operationId`, `paymentId` and `reason` (3–300 characters). The server retrieves the original worker and amount. The user cannot choose a different amount. Reversals are dated today and link to the original entry. A second reversal of the same entry is rejected.

## Family members

Send `scope`, `operationId`, `email`, `name`, `role` (`admin` or `operator`) and `active` (0 or 1). Emails are normalized to lower case. On first approved sign-in the membership binds to a stable dispatcher user ID. Names are display-only. A successful sign-in alone does not confer family membership.

## State and reports

`GET /api/state` returns one transactional snapshot with camelCase keys:

```json
{
  "workers": [],
  "sites": [],
  "attendance": [],
  "payments": [],
  "members": [],
  "user": {"name": "Display name", "email": "actual-sign-in-email", "role": "admin"},
  "revision": 0,
  "today": "2026-09-05",
  "historyFrom": null
}
```

`historyFrom: null` means all saved history is included in this iteration. Reports are computed from that snapshot using `lib/domain.ts`. There is no `/api/reports` endpoint yet. For the growth iteration, add aggregate report endpoints and cursor-based worker history, then stop downloading full history on each change.

The current site report sums slot wages in an inclusive date range; its worker-day count is populated slots divided by two. Outstanding balances and worker histories are all-time. Site labour costs and money paid are different measures and must not be combined as one expense total.

## Streaming

```text
event: revision
data: {"revision": 12}

```

Clients compare the revision with their current snapshot and refresh when it changes. The connection checks for changes every three seconds, closes periodically and relies on EventSource reconnection. Authentication or stream failures set the UI to connecting rather than falsely reporting live sync. The client also refreshes on focus, reconnect, and at a 30-second interval.

## Errors

| Status | Meaning | Client behavior |
| --- | --- | --- |
| 400 | Invalid amount/date/photo/reference or correction reason | Keep input visible and explain what to fix |
| 401 | Missing sign-in identity | Sign in again |
| 403 | Not a family member, wrong role or wrong origin | Ask the family admin / open the app directly |
| 404 | Missing worker, payment or photo | Refresh and select an existing record |
| 409 | Stale version, used operation ID or already reversed entry | Fetch latest state and review before retrying |
| 413 | Request or image too large | Resize the photo or shorten the request |
| 428 | Family setup has not run | Initialize through the owner-only setup flow |
| 503 | Database, object storage or unexpected runtime failure | Preserve input; retry the unchanged logical operation |

Errors use `{ "error": "readable message" }`. Raw SQL, credentials and internal exception details stay out of responses. Unexpected errors are logged on the server.
