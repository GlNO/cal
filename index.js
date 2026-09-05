#!/usr/bin/env node

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { google } = require("googleapis");

const SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly"
];

const CREDENTIALS_PATH = path.join(
    __dirname,
    "credentials.json"
);
const TOKEN_PATH = path.join(
    __dirname,
    "token.json"
);

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const color = {
    reset: useColor ? "\x1b[0m" : "",
    bold: useColor ? "\x1b[1m" : "",
    cyan: useColor ? "\x1b[36m" : "",
    green: useColor ? "\x1b[32m" : "",
    yellow: useColor ? "\x1b[33m" : "",
    gray: useColor ? "\x1b[90m" : "",
};

function sanitizeTerminalText(value) {
    return String(value).replace(/[\u0000-\u001F\u007F]/g, "");
}

function parseDateOnly(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatOrgDate(date) {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${weekdays[date.getDay()]}`;
}

function formatOrgDateTime(date) {
    return `${formatOrgDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatEventTiming(event) {
    if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const startTime = timeFormatter.format(start);
        const endTime = timeFormatter.format(end);

        if (start.toDateString() === end.toDateString()) {
            return `${startTime} - ${endTime}`;
        }

        return `${shortDateFormatter.format(start)} ${startTime} - ${shortDateFormatter.format(end)} ${endTime}`;
    }

    if (event.start?.date && event.end?.date) {
        const start = parseDateOnly(event.start.date);
        const end = parseDateOnly(event.end.date);
        end.setDate(end.getDate() - 1);

        if (start.getTime() === end.getTime()) {
            return "All day";
        }

        return `All day, ${shortDateFormatter.format(start)} - ${shortDateFormatter.format(end)}`;
    }

    return "Time unavailable";
}

function formatEventTimestamp(event) {
    if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);

        if (start.toDateString() === end.toDateString()) {
            return `<${formatOrgDateTime(start)}-${pad(end.getHours())}:${pad(end.getMinutes())}>`;
        }

        return `<${formatOrgDateTime(start)}--${formatOrgDateTime(end)}>`;
    }

    if (event.start?.date && event.end?.date) {
        const start = parseDateOnly(event.start.date);
        const end = parseDateOnly(event.end.date);
        end.setDate(end.getDate() - 1);

        if (start.getTime() === end.getTime()) {
            return `<${formatOrgDate(start)}>`;
        }

        return `<${formatOrgDate(start)}--${formatOrgDate(end)}>`;
    }

    return "<unknown>";
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateRange(command, currentDate = new Date()) {
    const today = startOfDay(currentDate);

    if (command === "today") {
        return {
            start: today,
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
            titleDate: today,
        };
    }

    if (command === "tom") {
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        return {
            start: tomorrow,
            end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1),
            titleDate: tomorrow,
        };
    }

    if (command === "next_wk") {
        const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
        const nextMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilMonday);

        return {
            start: nextMonday,
            end: new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 7),
            titleDate: nextMonday,
        };
    }

    throw new Error(`Unknown command: ${command}`);
}

function printHelp() {
    console.log("\nG-CALENDAR commands:\n");
    console.log("  cal           Show today's events");
    console.log("  cal today     Show today's events");
    console.log("  cal tom       Show tomorrow's events");
    console.log("  cal next_wk   Show next Monday through Sunday\n");
}

async function authorize() {
    const credentials = JSON.parse(
        fs.readFileSync(CREDENTIALS_PATH, "utf8")
    );

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
        oauth2Client.setCredentials(token);
        return oauth2Client;
    }

    const redirectUri = new URL(redirect_uris[0]);
    const state = crypto.randomBytes(32).toString("hex");
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
        state,
    });

    const code = await new Promise((resolve, reject) => {
        const server = http.createServer((request, response) => {
            const callbackUrl = new URL(
                request.url,
                `${redirectUri.protocol}//${redirectUri.host}`
            );
            const error = callbackUrl.searchParams.get("error");

            if (error) {
                response.end("Authorization failed. You can close this window.");
                server.close();
                reject(new Error(`Google authorization failed: ${error}`));
                return;
            }

            const authorizationCode = callbackUrl.searchParams.get("code");
            const callbackState = callbackUrl.searchParams.get("state");

            if (!authorizationCode || callbackState !== state) {
                response.statusCode = 400;
                response.end("Authorization failed. You can close this window.");
                server.close();
                reject(new Error("Invalid OAuth callback."));
                return;
            }

            response.end("Authorization complete. You can close this window.");
            server.close();
            resolve(authorizationCode);
        });

        server.once("error", reject);
        server.listen(Number(redirectUri.port) || 80, redirectUri.hostname, () => {
            console.log("\nOpen this URL in your browser:\n");
            console.log(authUrl);
            console.log("\nWaiting for Google authorization...\n");
        });
    });

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

    console.log("\nAuthorization saved to token.json!\n");
    return oauth2Client;
}

async function listEvents() {
    const auth = await authorize();

    const calendar = google.calendar({
        version: "v3",
        auth,
    });

    const command = process.argv[2] || "today";
    const { start, end, titleDate } = getDateRange(command);

    const result = await calendar.events.list({
        calendarId: "primary",

        timeMin: start.toISOString(),
        timeMax: end.toISOString(),

        singleEvents: true,
        orderBy: "startTime",
    });

    const events = result.data.items;

    const title = command === "next_wk"
        ? `Week of ${displayDateFormatter.format(titleDate)}`
        : `${displayDateFormatter.format(titleDate)} - ${weekdayFormatter.format(titleDate).toUpperCase()}`;
    const countLabel = events?.length === 1 ? "event" : "events";

    console.log(`\n\n${color.bold}${color.bold}G-CALENDAR${color.reset}`);
    console.log(`${color.bold}${title}${color.reset}`);
    console.log(`${color.gray}${events?.length || 0} ${countLabel}${color.reset}`);
    console.log(`${color.gray}${"-".repeat(48)}${color.reset}`);

    if (!events || events.length === 0) {
        console.log(`\n  ${color.green}No schedule today.${color.reset}\n`);
        return;
    }

    events.forEach((event, index) => {
        const summary = sanitizeTerminalText(event.summary || "(untitled)");
        const timing = formatEventTiming(event);

        console.log(`${color.yellow}${String(index + 1).padStart(2, "0")}${color.reset} ${color.bold}${summary}${color.reset}`);
        console.log(`   ${color.green}${timing}${color.reset}`);

        if (event.location) {
            const location = `Location: ${sanitizeTerminalText(event.location)}`;
            console.log(`   ${color.gray}${location}${color.reset}`);
        }

        if (event.description) {
            const description = sanitizeTerminalText(event.description).replace(/\s+/g, " ").trim();
            console.log(`   ${color.gray}${description}${color.reset}`);
        }
    });

    console.log(`\n${color.gray}${"-".repeat(48)}${color.reset}`);
}

const command = process.argv[2] || "today";

if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
} else {
    listEvents().catch((error) => {
        console.error(`\nError: ${error.message}`);
        process.exitCode = 1;
    });
}