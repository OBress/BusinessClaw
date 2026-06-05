#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const defaultPath = process.env.BUSINESSCLAW_LEDGER_PATH || path.join("data", "businessclaw-ledger.json");
const command = process.argv[2] || "status";
const args = parseArgs(process.argv.slice(3));

function parseArgs(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = parts[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function nowIso() {
  return new Date().toISOString();
}

function loadLedger() {
  fs.mkdirSync(path.dirname(defaultPath), { recursive: true });
  if (!fs.existsSync(defaultPath)) {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      balances: {
        earnedCapitalUsd: 0,
        ownerFundsUsd: 0,
      },
      wallet: {
        publicAddress: process.env.BUSINESSCLAW_WALLET_PUBLIC_ADDRESS || null,
        lastNativeBalance: null,
        lastCheckedAt: null,
      },
      entries: [],
      proposals: [],
    };
  }
  return JSON.parse(fs.readFileSync(defaultPath, "utf8"));
}

function saveLedger(ledger) {
  ledger.updatedAt = nowIso();
  fs.writeFileSync(defaultPath, JSON.stringify(ledger, null, 2) + "\n");
}

function numberArg(name, fallback = 0) {
  const raw = args[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`--${name} must be a number`);
  }
  return parsed;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const ledger = loadLedger();

if (command === "status") {
  print({
    ok: true,
    path: defaultPath,
    balances: ledger.balances,
    wallet: ledger.wallet,
    entryCount: ledger.entries.length,
    proposalCount: ledger.proposals.length,
    recentEntries: ledger.entries.slice(-5),
    openProposals: ledger.proposals.filter((proposal) => proposal.status === "open"),
  });
  process.exit(0);
}

if (command === "add-entry") {
  const type = String(args.type || "note");
  const amount = numberArg("amount", 0);
  const ownerFunds = numberArg("owner-funds", 0);
  const earnedFunds = numberArg("earned-funds", amount);
  const entry = {
    id: `entry_${Date.now()}`,
    createdAt: nowIso(),
    type,
    amountUsd: amount,
    ownerFundsUsd: ownerFunds,
    earnedFundsUsd: earnedFunds,
    source: args.source || "unspecified",
    evidence: args.evidence || null,
    notes: args.notes || "",
  };
  ledger.entries.push(entry);
  ledger.balances.ownerFundsUsd += ownerFunds;
  ledger.balances.earnedCapitalUsd += earnedFunds;
  saveLedger(ledger);
  print({ ok: true, entry, balances: ledger.balances });
  process.exit(0);
}

if (command === "proposal") {
  const proposal = {
    id: `proposal_${Date.now()}`,
    createdAt: nowIso(),
    status: "open",
    amountUsd: numberArg("amount", 0),
    sourceOfFunds: args["source-of-funds"] || "earned_capital",
    purpose: args.purpose || "",
    expectedValue: args["expected-value"] || "",
    risk: args.risk || "unknown",
    approvalRequired: args["approval-required"] ?? "depends",
    nextStep: args["next-step"] || "",
  };
  ledger.proposals.push(proposal);
  saveLedger(ledger);
  print({ ok: true, proposal });
  process.exit(0);
}

if (command === "wallet-note") {
  ledger.wallet.publicAddress = args.address || ledger.wallet.publicAddress;
  ledger.wallet.lastNativeBalance = args.balance || ledger.wallet.lastNativeBalance;
  ledger.wallet.lastCheckedAt = nowIso();
  saveLedger(ledger);
  print({ ok: true, wallet: ledger.wallet });
  process.exit(0);
}

if (command === "close-proposal") {
  const id = args.id;
  const status = args.status || "closed";
  const proposal = ledger.proposals.find((item) => item.id === id);
  if (!proposal) {
    print({ ok: false, error: `Proposal not found: ${id}` });
    process.exit(1);
  }
  proposal.status = status;
  proposal.closedAt = nowIso();
  proposal.closeNotes = args.notes || "";
  saveLedger(ledger);
  print({ ok: true, proposal });
  process.exit(0);
}

print({
  ok: false,
  error: `Unknown command: ${command}`,
  commands: ["status", "add-entry", "proposal", "wallet-note", "close-proposal"],
});
process.exit(1);

