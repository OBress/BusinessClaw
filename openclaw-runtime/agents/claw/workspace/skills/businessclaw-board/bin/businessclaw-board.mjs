#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const boardPath = process.env.BUSINESSCLAW_BOARD_PATH || path.join("data", "businessclaw-board.json");
const command = process.argv[2] || "status";
const args = parseArgs(process.argv.slice(3));

function parseArgs(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = parts[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function loadBoard() {
  fs.mkdirSync(path.dirname(boardPath), { recursive: true });
  if (!fs.existsSync(boardPath)) {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      members: [],
      advice: [],
      approvals: [],
      policy: {
        ownersAreBoard: true,
        routineWorkSelfDirected: true,
        approvalRequiredFor: [
          "owner-funded spending",
          "legal commitments",
          "credential or signing changes",
          "public claims that could create liability",
          "cloud resources that can bill the owner",
        ],
      },
    };
  }
  return JSON.parse(fs.readFileSync(boardPath, "utf8"));
}

function saveBoard(board) {
  board.updatedAt = nowIso();
  fs.writeFileSync(boardPath, `${JSON.stringify(board, null, 2)}\n`);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function requireArg(name) {
  const value = String(args[name] || "").trim();
  if (!value) {
    print({ ok: false, error: `--${name} is required` });
    process.exit(1);
  }
  return value;
}

const board = loadBoard();

if (command === "status") {
  print({
    ok: true,
    path: boardPath,
    members: board.members,
    recentAdvice: board.advice.slice(-8),
    openApprovals: board.approvals.filter((approval) => approval.status === "open"),
    recentApprovals: board.approvals.slice(-8),
    policy: board.policy,
  });
  process.exit(0);
}

if (command === "add-member") {
  const id = requireArg("id").toLowerCase();
  const member = {
    id,
    name: args.name || id,
    role: args.role || "Board Member",
    status: args.status || "active",
    discordId: args["discord-id"] || null,
    discordUsername: args["discord-username"] || null,
    notes: args.notes || "",
    addedAt: nowIso(),
  };
  board.members = board.members.filter((item) => item.id !== id);
  board.members.push(member);
  saveBoard(board);
  print({ ok: true, member });
  process.exit(0);
}

if (command === "update-member") {
  const id = requireArg("id").toLowerCase();
  const member = board.members.find((item) => item.id === id);
  if (!member) {
    print({ ok: false, error: `Board member not found: ${id}` });
    process.exit(1);
  }
  for (const [argKey, field] of Object.entries({
    name: "name",
    role: "role",
    status: "status",
    "discord-id": "discordId",
    "discord-username": "discordUsername",
    notes: "notes",
  })) {
    if (args[argKey] !== undefined) member[field] = args[argKey];
  }
  member.updatedAt = nowIso();
  saveBoard(board);
  print({ ok: true, member });
  process.exit(0);
}

if (command === "advice") {
  const advice = {
    id: `advice_${Date.now()}`,
    createdAt: nowIso(),
    memberId: args["member-id"] || args.member || "unknown",
    employeeId: args["employee-id"] || args.employee || null,
    channel: args.channel || "discord",
    message: requireArg("message"),
    disposition: args.disposition || "received",
    notes: args.notes || "",
  };
  board.advice.push(advice);
  saveBoard(board);
  print({ ok: true, advice });
  process.exit(0);
}

if (command === "approval") {
  const approval = {
    id: `approval_${Date.now()}`,
    createdAt: nowIso(),
    memberId: args["member-id"] || args.member || "unknown",
    subject: requireArg("subject"),
    decision: args.decision || "open",
    status: args.status || (args.decision ? "closed" : "open"),
    notes: args.notes || "",
  };
  board.approvals.push(approval);
  saveBoard(board);
  print({ ok: true, approval });
  process.exit(0);
}

if (command === "close-approval") {
  const id = requireArg("id");
  const approval = board.approvals.find((item) => item.id === id);
  if (!approval) {
    print({ ok: false, error: `Approval not found: ${id}` });
    process.exit(1);
  }
  approval.status = args.status || "closed";
  approval.decision = args.decision || approval.decision || "closed";
  approval.closedAt = nowIso();
  approval.notes = args.notes || approval.notes || "";
  saveBoard(board);
  print({ ok: true, approval });
  process.exit(0);
}

print({
  ok: false,
  error: `Unknown command: ${command}`,
  commands: ["status", "add-member", "update-member", "advice", "approval", "close-approval"],
});
process.exit(1);
