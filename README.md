# G-Calendar CLI

A Node.js command-line calendar client that retrieves and displays Google Calendar events in a readable terminal format.

## Features

- Google Calendar API integration
- OAuth 2.0 authentication
- Secure local OAuth callback with state validation
- Persistent local authentication tokens
- 12-hour AM/PM time formatting
- Today, tomorrow, and next-week views
- Event locations and descriptions
- Colorized terminal output
- Terminal text sanitization for safer output

## Commands

```bash
cal
cal today
cal tom
cal next_wk
cal help
```

| Command | Description |
| --- | --- |
| `cal` | Show today's events |
| `cal today` | Show today's events |
| `cal tom` | Show tomorrow's events |
| `cal next_wk` | Show events from next Monday through Sunday |
| `cal help` | Show available commands |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Google Calendar API

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud project.
3. Enable the Google Calendar API.
4. Configure the OAuth consent screen.
5. Create an OAuth client ID for a desktop application.
6. Download the credentials file.
7. Rename it to `credentials.json`.
8. Place it in the project root.

The application requests read-only calendar access:

```text
https://www.googleapis.com/auth/calendar.readonly
```

### 3. Run the application

Run the CLI directly:

```bash
node index.js
```

Or install it as a local global command:

```bash
npm link
cal
```

The first run opens a Google authorization flow. After authorization, the application stores a local `token.json` file so future runs do not require authorization again.

## Example Output

```text
G-CALENDAR
September 6, 2026 - SUN
2 events
------------------------------------------------

01 Team meeting
	10:00 AM - 11:00 AM
	Location: Conference Room

02 Project review
	2:00 PM - 3:30 PM
------------------------------------------------
```

## Security

Never commit these files:

```text
credentials.json
token.json
```

They are excluded through `.gitignore`. The token file may contain a refresh token that grants access to the Google Calendar account.

## Technologies

- Node.js
- Google Calendar API
- OAuth 2.0
- `googleapis`