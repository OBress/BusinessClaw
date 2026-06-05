#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const routingPath = process.env.BUSINESSCLAW_DISCORD_ROUTING_PATH || path.join("data", "businessclaw-discord-routing.json");
const command = process.argv[2] || "status";
const args = parseArgs(process.argv.slice(3));

function parseArgs(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const values = [];
    while (parts[i + 1] && !parts[i + 1].startsWith("--")) {
      values.push(parts[i + 1]);
      i += 1;
    }
    out[key] = values.length > 1 ? values : values[0] ?? true;
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === true || value === "") return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function defaultRouting() {
  return {
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    channels: [
      { id: "board-room", name: "#board-room", discordId: null, room: "board", defaultAgent: "claw", purpose: "Board advice, strategy, governance, and approvals." },
      { id: "ops-floor", name: "#ops-floor", discordId: null, room: "ops", defaultAgent: "claw", purpose: "General company work and employee coordination." },
      { id: "finance", name: "#finance", discordId: null, room: "finance", defaultAgent: "ledger", purpose: "Bank level, wallet, ledger, and spending proposals." },
      { id: "forge", name: "#forge", discordId: null, room: "forge", defaultAgent: "forge", purpose: "Tools, skills, automations, dashboard work." },
      { id: "announcements", name: "#announcements", discordId: null, room: "announcements", defaultAgent: "claw", purpose: "Summaries and material updates." },
    ],
    employeeRoutes: [
      { employeeId: "claw", aliases: ["claw", "operator", "strategy", "ceo"], channelId: "ops-floor", markdownPrefix: "**Claw**" },
      { employeeId: "ledger", aliases: ["ledger", "finance", "bank", "wallet"], channelId: "finance", markdownPrefix: "**Ledger**" },
      { employeeId: "forge", aliases: ["forge", "tools", "automation", "website", "dashboard"], channelId: "forge", markdownPrefix: "**Forge**" },
    ],
    boardUsers: [],
    formatting: {
      employeeSpeakerFormat: "**{employee}**\n{message}",
      boardAddressFormat: "_Board note from {member}:_ {message}",
      useDiscordMarkdown: true,
    },
  };
}

function loadRouting() {
  fs.mkdirSync(path.dirname(routingPath), { recursive: true });
  if (!fs.existsSync(routingPath)) return defaultRouting();
  return JSON.parse(fs.readFileSync(routingPath, "utf8"));
}

function saveRouting(routing) {
  routing.updatedAt = nowIso();
  fs.writeFileSync(routingPath, `${JSON.stringify(routing, null, 2)}\n`);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function requireArg(name) {
  const value = args[name];
  if (value === undefined || value === null || value === true || value === "") {
    print({ ok: false, error: `--${name} is required` });
    process.exit(1);
  }
  return String(value);
}

function resolveRoute(routing, { channelId, text }) {
  const normalized = String(text || "").toLowerCase();
  const channel = routing.channels.find((item) => item.id === channelId || item.discordId === channelId || item.name === channelId);
  const aliasRoute = routing.employeeRoutes.find((route) => route.aliases.some((alias) => normalized.includes(alias.toLowerCase())));
  const employeeId = aliasRoute?.employeeId || channel?.defaultAgent || "claw";
  const route = routing.employeeRoutes.find((item) => item.employeeId === employeeId);
  return {
    employeeId,
    channel: channel || null,
    route: route || null,
    markdownPrefix: route?.markdownPrefix || `**${employeeId}**`,
    reason: aliasRoute ? "alias" : channel ? "channel-default" : "fallback",
  };
}

const routing = loadRouting();

if (command === "status") {
  print({
    ok: true,
    path: routingPath,
    channels: routing.channels,
    employeeRoutes: routing.employeeRoutes,
    boardUsers: routing.boardUsers,
    formatting: routing.formatting,
  });
  process.exit(0);
}

if (command === "set-channel") {
  const id = requireArg("id");
  const channel = {
    id,
    name: args.name || id,
    discordId: args["discord-id"] || null,
    room: args.room || "ops",
    defaultAgent: args["default-agent"] || "claw",
    purpose: args.purpose || "",
    updatedAt: nowIso(),
  };
  routing.channels = routing.channels.filter((item) => item.id !== id);
  routing.channels.push(channel);
  saveRouting(routing);
  print({ ok: true, channel });
  process.exit(0);
}

if (command === "set-employee-route") {
  const employeeId = requireArg("employee-id");
  const route = {
    employeeId,
    aliases: asArray(args.aliases),
    channelId: args["channel-id"] || null,
    markdownPrefix: args["markdown-prefix"] || `**${employeeId}**`,
    updatedAt: nowIso(),
  };
  routing.employeeRoutes = routing.employeeRoutes.filter((item) => item.employeeId !== employeeId);
  routing.employeeRoutes.push(route);
  saveRouting(routing);
  print({ ok: true, route });
  process.exit(0);
}

if (command === "set-board-user") {
  const memberId = requireArg("member-id");
  const boardUser = {
    memberId,
    name: args.name || memberId,
    discordId: requireArg("discord-id"),
    role: args.role || "Board Member",
    updatedAt: nowIso(),
  };
  routing.boardUsers = routing.boardUsers.filter((item) => item.memberId !== memberId && item.discordId !== boardUser.discordId);
  routing.boardUsers.push(boardUser);
  saveRouting(routing);
  print({ ok: true, boardUser });
  process.exit(0);
}

if (command === "resolve") {
  print({
    ok: true,
    resolution: resolveRoute(routing, {
      channelId: args["channel-id"] || args.channel || "",
      text: args.text || "",
    }),
  });
  process.exit(0);
}

print({
  ok: false,
  error: `Unknown command: ${command}`,
  commands: ["status", "set-channel", "set-employee-route", "set-board-user", "resolve"],
});
process.exit(1);
