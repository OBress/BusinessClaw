#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const walletPath = process.env.BUSINESSCLAW_WALLET_PATH || path.join("data", "businessclaw-wallet.json");
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

function loadWallet() {
  fs.mkdirSync(path.dirname(walletPath), { recursive: true });
  if (!fs.existsSync(walletPath)) {
    return {
      version: 1,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      chain: process.env.BUSINESSCLAW_WALLET_CHAIN || "unset",
      publicAddress: process.env.BUSINESSCLAW_WALLET_PUBLIC_ADDRESS || null,
      nativeBalance: null,
      lastCheckedAt: null,
      receiveNotes: [],
      spendIntents: [],
      transactions: [],
      signingPolicy: {
        mode: "external",
        note: "Agents may inspect and record wallet activity. Signing must use a separate hardened wallet flow.",
      },
    };
  }
  return JSON.parse(fs.readFileSync(walletPath, "utf8"));
}

function saveWallet(wallet) {
  wallet.updatedAt = nowIso();
  fs.writeFileSync(walletPath, `${JSON.stringify(wallet, null, 2)}\n`);
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function required(name) {
  const value = String(args[name] || "").trim();
  if (!value) {
    print({ ok: false, error: `--${name} is required` });
    process.exit(1);
  }
  return value;
}

function numberArg(name, fallback = null) {
  const raw = args[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    print({ ok: false, error: `--${name} must be a number` });
    process.exit(1);
  }
  return parsed;
}

async function evmNativeBalance(address, rpcUrl) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const json = await response.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  const wei = BigInt(json.result || "0x0");
  const whole = wei / 10n ** 18n;
  const fractional = wei % 10n ** 18n;
  return `${whole}.${fractional.toString().padStart(18, "0").replace(/0+$/, "") || "0"}`;
}

const wallet = loadWallet();

if (command === "status") {
  print({
    ok: true,
    path: walletPath,
    chain: wallet.chain,
    publicAddress: wallet.publicAddress,
    nativeBalance: wallet.nativeBalance,
    lastCheckedAt: wallet.lastCheckedAt,
    receiveNoteCount: wallet.receiveNotes.length,
    openSpendIntents: wallet.spendIntents.filter((item) => item.status === "open"),
    recentTransactions: wallet.transactions.slice(-5),
    signingPolicy: wallet.signingPolicy,
  });
  process.exit(0);
}

if (command === "set-address") {
  wallet.publicAddress = required("address");
  wallet.chain = args.chain || wallet.chain || process.env.BUSINESSCLAW_WALLET_CHAIN || "unset";
  wallet.addressSetAt = nowIso();
  saveWallet(wallet);
  print({ ok: true, publicAddress: wallet.publicAddress, chain: wallet.chain });
  process.exit(0);
}

if (command === "balance") {
  const address = args.address || wallet.publicAddress || process.env.BUSINESSCLAW_WALLET_PUBLIC_ADDRESS;
  const rpcUrl = args.rpc || process.env.BUSINESSCLAW_WALLET_RPC_URL;
  if (!address) {
    print({ ok: false, error: "No public address configured. Use set-address or BUSINESSCLAW_WALLET_PUBLIC_ADDRESS." });
    process.exit(1);
  }
  if (!rpcUrl) {
    print({ ok: true, publicAddress: address, nativeBalance: wallet.nativeBalance, note: "No RPC URL configured; returning last recorded balance." });
    process.exit(0);
  }
  try {
    wallet.nativeBalance = await evmNativeBalance(address, rpcUrl);
    wallet.lastCheckedAt = nowIso();
    wallet.publicAddress = address;
    saveWallet(wallet);
    print({ ok: true, publicAddress: address, nativeBalance: wallet.nativeBalance, checkedAt: wallet.lastCheckedAt });
    process.exit(0);
  } catch (error) {
    print({ ok: false, error: error.message || String(error) });
    process.exit(1);
  }
}

if (command === "receive-note") {
  const note = {
    id: `receive_${Date.now()}`,
    createdAt: nowIso(),
    source: args.source || "unspecified",
    expectedAsset: args["expected-asset"] || args.asset || "unknown",
    expectedAmount: numberArg("expected-amount"),
    status: args.status || "expected",
    notes: args.notes || "",
  };
  wallet.receiveNotes.push(note);
  saveWallet(wallet);
  print({ ok: true, receiveNote: note });
  process.exit(0);
}

if (command === "spend-intent") {
  const intent = {
    id: `spend_${Date.now()}`,
    createdAt: nowIso(),
    status: "open",
    amount: numberArg("amount", 0),
    asset: args.asset || "unknown",
    purpose: args.purpose || "",
    sourceOfFunds: args["source-of-funds"] || "earned_capital",
    expectedValue: args["expected-value"] || "",
    risk: args.risk || "unknown",
    nextStep: args["next-step"] || "",
  };
  wallet.spendIntents.push(intent);
  saveWallet(wallet);
  print({ ok: true, spendIntent: intent, reminder: "Mirror approved movement into businessclaw-ledger." });
  process.exit(0);
}

if (command === "close-spend-intent") {
  const id = required("id");
  const intent = wallet.spendIntents.find((item) => item.id === id);
  if (!intent) {
    print({ ok: false, error: `Spend intent not found: ${id}` });
    process.exit(1);
  }
  intent.status = args.status || "closed";
  intent.closedAt = nowIso();
  intent.notes = args.notes || intent.notes || "";
  saveWallet(wallet);
  print({ ok: true, spendIntent: intent });
  process.exit(0);
}

if (command === "record-tx") {
  const tx = {
    id: `tx_${Date.now()}`,
    createdAt: nowIso(),
    hash: required("hash"),
    chain: args.chain || wallet.chain,
    direction: args.direction || "unknown",
    asset: args.asset || "unknown",
    amount: numberArg("amount", 0),
    counterparty: args.counterparty || "",
    evidence: args.evidence || "",
    notes: args.notes || "",
  };
  wallet.transactions.push(tx);
  saveWallet(wallet);
  print({ ok: true, transaction: tx, reminder: "Mirror financial impact into businessclaw-ledger." });
  process.exit(0);
}

print({
  ok: false,
  error: `Unknown command: ${command}`,
  commands: ["status", "set-address", "balance", "receive-note", "spend-intent", "close-spend-intent", "record-tx"],
});
process.exit(1);
