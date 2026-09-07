# G-Calendar CLI

A lightweight Node.js command-line calendar client that retrieves and displays Google Calendar events in a clean, readable terminal format. Perfect for developers who want quick calendar access without leaving the terminal.

```bash
# 1. Clone and install
git clone https://github.com/GlNO/cal.git
cd cal
npm install

# 2. Set up Google Calendar API (see Setup section below)

# 3. Run
node index.js

# Or use globally (after npm link)
cal today
```

## Commands

```bash
cal              # Show today's events
cal today        # Show today's events
cal tom          # Show tomorrow's events
cal next_wk      # Show events from next Monday through Sunday
cal help         # Show available commands
```

| Command | Description |
| --- | --- |
| `cal` | Display events for today |
| `cal today` | Display events for today |
| `cal tom` | Display events for tomorrow |
| `cal next_wk` | Display events for next week (Monday–Sunday) |
| `cal help` | Display usage information |

## Setup

### Prerequisites

- **Node.js** 14.0.0 or higher
- **npm** 6.0.0 or higher
- A Google account with Google Calendar enabled

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Google Calendar API

Follow these steps to set up your Google Cloud project:

1. Open the [Google Cloud Console](https://console.cloud.google.com/)
2. **Create a project:**
   - Click the project dropdown at the top
   - Select "New Project"
   - Enter a project name (e.g., "G-Calendar CLI")
   - Click "Create"
3. **Enable the Google Calendar API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click it and select "Enable"
4. **Configure OAuth consent screen:**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Fill in the required fields (app name, user support email, developer contact)
   - Add the `https://www.googleapis.com/auth/calendar.readonly` scope
   - Save and continue
5. **Create OAuth credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Desktop application"
   - Click "Create"
6. **Download and configure:**
   - Click the download icon for your new credential
   - Rename the downloaded file to `credentials.json`
   - Place it in the project root directory

**Requested permission:**
```
https://www.googleapis.com/auth/calendar.readonly
```

### 3. Run the Application

**Option A: Run directly**
```bash
node index.js
```

**Option B: Install as a global command**
```bash
npm link
cal today
```

On first run, the application will open your default browser to authorize access to your Google Calendar. After authorization, it stores a `token.json` file locally for future use.

## Example Output

**Today's view:**
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
	Description: Q3 progress check
------------------------------------------------
```

**Tomorrow's view:**
```text
G-CALENDAR
September 7, 2026 - MON
1 event
------------------------------------------------

01 Client call
	9:30 AM - 10:30 AM
	Location: Zoom
------------------------------------------------

