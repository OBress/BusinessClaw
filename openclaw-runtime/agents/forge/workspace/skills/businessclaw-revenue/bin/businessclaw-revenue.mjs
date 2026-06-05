#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const storePath = process.env.BUSINESSCLAW_REVENUE_PATH || path.join("data", "businessclaw-revenue.json");
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

function loadStore() {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) {
    return { version: 1, updatedAt: nowIso(), experiments: [], lessons: [] };
  }
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

function saveStore(store) {
  store.updatedAt = nowIso();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2) + "\n");
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const store = loadStore();

if (command === "status") {
  print({
    ok: true,
    path: storePath,
    active: store.experiments.filter((experiment) => ["planned", "running"].includes(experiment.status)),
    closed: store.experiments.filter((experiment) => !["planned", "running"].includes(experiment.status)).slice(-10),
    lessons: store.lessons.slice(-10),
  });
  process.exit(0);
}

if (command === "create") {
  const experiment = {
    id: `exp_${Date.now()}`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: args.status || "planned",
    name: args.name || "Untitled experiment",
    targetCustomer: args.customer || "",
    offer: args.offer || "",
    hypothesis: args.hypothesis || "",
    expectedValue: args["expected-value"] || "",
    estimatedCostUsd: Number(args.cost || 0),
    evidence: [],
    result: null,
    nextAction: args["next-action"] || "",
  };
  store.experiments.push(experiment);
  saveStore(store);
  print({ ok: true, experiment });
  process.exit(0);
}

if (command === "update") {
  const experiment = store.experiments.find((item) => item.id === args.id);
  if (!experiment) {
    print({ ok: false, error: `Experiment not found: ${args.id}` });
    process.exit(1);
  }
  for (const [key, value] of Object.entries({
    status: args.status,
    targetCustomer: args.customer,
    offer: args.offer,
    hypothesis: args.hypothesis,
    expectedValue: args["expected-value"],
    nextAction: args["next-action"],
  })) {
    if (value !== undefined) experiment[key] = value;
  }
  if (args.evidence) experiment.evidence.push({ createdAt: nowIso(), text: args.evidence });
  experiment.updatedAt = nowIso();
  saveStore(store);
  print({ ok: true, experiment });
  process.exit(0);
}

if (command === "close") {
  const experiment = store.experiments.find((item) => item.id === args.id);
  if (!experiment) {
    print({ ok: false, error: `Experiment not found: ${args.id}` });
    process.exit(1);
  }
  experiment.status = args.status || "closed";
  experiment.result = args.result || "";
  experiment.nextAction = args["next-action"] || experiment.nextAction;
  experiment.closedAt = nowIso();
  experiment.updatedAt = nowIso();
  if (args.lesson) {
    store.lessons.push({
      createdAt: nowIso(),
      experimentId: experiment.id,
      lesson: args.lesson,
    });
  }
  saveStore(store);
  print({ ok: true, experiment });
  process.exit(0);
}

print({ ok: false, error: `Unknown command: ${command}`, commands: ["status", "create", "update", "close"] });
process.exit(1);

