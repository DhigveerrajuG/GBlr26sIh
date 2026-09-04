# SIH Support Desk

A lightweight issue-reporting portal for an on-ground SIH help desk. Participants submit complaints through `index.html`; organizers manage tickets through `admin.html`. Data and authentication are handled by the Google Apps Script backend and a linked Google Sheet.

## Project structure

- `index.html` - participant complaint form
- `admin.html` - authenticated organizer dashboard
- `apps-script-backend.gs` - Google Apps Script web app API
- `images/` - logos and other static assets

## How it works

1. A participant submits team, table, category, issue, and venue details.
2. The frontend sends the complaint to the Apps Script web app.
3. The backend appends the complaint to the `Complaints` sheet and returns a ticket ID such as `SIH-0001`.
4. An admin signs in through `admin.html`, filters/searches tickets, and updates status or remarks.
5. Opening a pending ticket automatically changes it to `Ongoing`.

## Google Sheet setup

Create a Google Spreadsheet with these two tabs and a header row in each.

### `Complaints`

```text
Timestamp | Ticket ID | Team Name | Table No | Category | Subject | Issue | Venue | Status | Remarks | Updated | Handled By
```

### `Admins`

```text
Name | Key | Role | Active | Added By | Added On
```

Add at least one initial owner to `Admins`, for example:

```text
Organizer Name | a-private-owner-key | Owner | Yes | Setup | 2026-01-01
```

Keep admin keys private. The owner can generate and revoke additional admin keys from the dashboard.

## Apps Script deployment

1. Open the spreadsheet and select **Extensions > Apps Script**.
2. Paste the contents of `apps-script-backend.gs` into the Apps Script project.
3. Set `SHARED_SECRET` to a private value.
4. Confirm the Apps Script project is bound to the spreadsheet containing the two tabs.
5. Select **Deploy > New deployment**.
6. Choose **Web app**.
7. Set **Execute as** to your account and **Who has access** to anyone who needs to submit or manage tickets.
8. Deploy and copy the `/exec` web app URL.
9. Put that URL in the `SCRIPT_URL` constant in both `index.html` and `admin.html`.

The value of `SHARED_SECRET` in `apps-script-backend.gs` must match the value assembled in `index.html`. Do not publish either secret in a public repository.

## Running the frontend

The pages are static HTML and can be hosted on GitHub Pages, Netlify, an internal web server, or opened locally in a browser. For the most reliable browser behavior, serve the folder through a static HTTP server instead of opening the files with `file://` URLs.

For a quick local server with Python:

```bash
python -m http.server 8000
```

Then open:

- Participant form: `http://localhost:8000/index.html`
- Admin dashboard: `http://localhost:8000/admin.html`

## Admin dashboard

- Login uses the key stored in the `Admins` sheet.
- Tickets can be filtered by `Pending`, `Ongoing`, or `Solved`.
- Search matches ticket ID, team name, table number, and venue.
- Admins can update status and add remarks visible to the help-desk team.
- Owners can add admins and revoke or restore non-owner access.
- The dashboard refreshes automatically every 30 seconds while visible.

## Operational notes

- Participant submissions have a ten-minute per-device cooldown to reduce duplicate or spam tickets.
- The backend also uses a hidden honeypot field and a shared secret.
- The Apps Script web app must be reachable from the browser hosting the HTML pages.
- If the frontend reports that setup is needed, check `SCRIPT_URL` in the relevant HTML file.
