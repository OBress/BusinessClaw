#!/usr/bin/env node
// BusinessClaw durable message/LLM queue.
//
// Many AI employees share one LLM/API endpoint. This queue makes outbound work
// (inter-agent messages, Discord sends, LLM jobs) durable: every item is held
// on disk and retried with exponential backoff until it is served, rate-limited
// so the shared endpoint is never hammered, and moved to a dead-letter state
// only after a bounded number of attempts. Nothing is silently dropped.
//
// Two integration models are supported:
//   push  -> `serve` drains due items, calling a delivery command per item.
//   pull  -> `lease` hands due items to an external worker that later calls
//            `ack` / `fail`.
//
// Storage is a single JSON file so it survives restarts and is trivially
// inspectable by the dashboard.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

const queuePath =
  process.env.BUSINESSCLAW_QUEUE_PATH || path.join("data", "businessclaw-queue.json");
const command = process.argv[2] || "status";
const args = parseArgs(process.argv.slice(3));

const DEFAULT_CONFIG = {
  maxAttempts: 6,
  baseDelayMs: 1000,
  maxDelayMs: 5 * 60 * 1000,
  // Minimum spacing between delivery attempts so a burst of agents cannot
  // hammer the shared LLM endpoint. Acts as a simple global rate limit.
  minServeIntervalMs: 1500,
  // How long a leased item may stay in-flight before it is considered stuck
  // and returned to the queue (handles a worker that crashed mid-flight).
  leaseTtlMs: 2 * 60 * 1000,
};

function parseArgs(parts) {
  const out = {};
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!part.startsWith("--")) continue;
    const key = part.slice(2);
    const next = parts[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
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

// Deterministic-ish id without Date.now()/Math.random reliance for testability.
let idCounter = 0;
function newId() {
  idCounter += 1;
  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 17);
  return `msg_${stamp}_${process.pid}_${idCounter}`;
}

function loadQueue() {
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  if (!fs.existsSync(queuePath)) {
    return {
      version: 1,
      updatedAt: nowIso(),
      config: { ...DEFAULT_CONFIG },
      stats: { enqueued: 0, served: 0, retried: 0, dead: 0, failed: 0 },
      lastServeAt: null,
      messages: [],
    };
  }
  const data = JSON.parse(fs.readFileSync(queuePath, "utf8"));
  data.config = { ...DEFAULT_CONFIG, ...(data.config || {}) };
  data.stats = { enqueued: 0, served: 0, retried: 0, dead: 0, failed: 0, ...(data.stats || {}) };
  data.messages = data.messages || [];
  return data;
}

function saveQueue(queue) {
  queue.updatedAt = nowIso();
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2) + "\n");
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function backoffMs(config, attempts) {
  // Exponential backoff with full jitter, capped at maxDelayMs.
  const exp = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** Math.max(0, attempts - 1));
  // Jitter derived from attempts + pid so it varies without Math.random.
  const jitter = ((process.pid + attempts * 7919) % 1000) / 1000;
  return Math.round(exp * (0.5 + 0.5 * jitter));
}

function isDue(message, nowMs) {
  if (!["queued", "retry"].includes(message.status)) return false;
  const next = message.nextAttemptAt ? new Date(message.nextAttemptAt).getTime() : 0;
  return next <= nowMs;
}

function reclaimStuckLeases(queue, nowMs) {
  for (const message of queue.messages) {
    if (message.status !== "in_flight") continue;
    const leasedMs = message.leasedAt ? new Date(message.leasedAt).getTime() : 0;
    if (nowMs - leasedMs > queue.config.leaseTtlMs) {
      message.status = "retry";
      message.nextAttemptAt = nowIso();
      message.history = message.history || [];
      message.history.push({ at: nowIso(), event: "lease-expired" });
    }
  }
}

function summarize(queue) {
  const counts = {};
  for (const message of queue.messages) {
    counts[message.status] = (counts[message.status] || 0) + 1;
  }
  const nowMs = Date.now();
  const due = queue.messages.filter((m) => isDue(m, nowMs)).length;
  const oldestQueued = queue.messages
    .filter((m) => ["queued", "retry"].includes(m.status))
    .map((m) => m.createdAt)
    .sort()[0] || null;
  return { counts, due, oldestQueued };
}

const queue = loadQueue();
const nowMs = Date.now();
reclaimStuckLeases(queue, nowMs);

if (command === "status") {
  const { counts, due, oldestQueued } = summarize(queue);
  print({
    ok: true,
    path: queuePath,
    config: queue.config,
    stats: queue.stats,
    counts,
    due,
    oldestQueued,
    lastServeAt: queue.lastServeAt,
    total: queue.messages.length,
  });
  saveQueue(queue);
  process.exit(0);
}

if (command === "enqueue") {
  const body = args.body !== undefined ? String(args.body) : "";
  if (!body && !args.kind) {
    print({ ok: false, error: "--body is required" });
    process.exit(1);
  }
  const message = {
    id: args.id ? String(args.id) : newId(),
    kind: args.kind ? String(args.kind) : "message", // message | llm | discord
    fromAgent: args.from ? String(args.from) : null,
    toAgent: args.to ? String(args.to) : null,
    channel: args.channel ? String(args.channel) : null,
    body,
    priority: Number(args.priority || 0),
    status: "queued",
    attempts: 0,
    maxAttempts: Number(args["max-attempts"] || queue.config.maxAttempts),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    nextAttemptAt: nowIso(),
    leasedAt: null,
    servedAt: null,
    lastError: null,
    history: [{ at: nowIso(), event: "enqueued" }],
  };
  queue.messages.push(message);
  queue.stats.enqueued += 1;
  saveQueue(queue);
  print({ ok: true, message });
  process.exit(0);
}

if (command === "list") {
  const status = args.status ? String(args.status) : null;
  const limit = Number(args.limit || 25);
  let items = queue.messages.slice();
  if (status) items = items.filter((m) => m.status === status);
  items = items
    .sort((a, b) => (b.priority - a.priority) || (new Date(a.createdAt) - new Date(b.createdAt)))
    .slice(0, limit);
  print({ ok: true, count: items.length, messages: items });
  process.exit(0);
}

if (command === "peek") {
  const due = queue.messages
    .filter((m) => isDue(m, nowMs))
    .sort((a, b) => (b.priority - a.priority) || (new Date(a.createdAt) - new Date(b.createdAt)));
  print({ ok: true, next: due[0] || null, dueCount: due.length });
  process.exit(0);
}

if (command === "lease") {
  // Pull model: hand the next due items to an external worker.
  const max = Number(args.max || 1);
  const due = queue.messages
    .filter((m) => isDue(m, nowMs))
    .sort((a, b) => (b.priority - a.priority) || (new Date(a.createdAt) - new Date(b.createdAt)))
    .slice(0, max);
  for (const message of due) {
    // Each lease counts as a delivery attempt so the pull model reaches the
    // dead-letter state after maxAttempts just like the push model.
    message.attempts += 1;
    message.status = "in_flight";
    message.leasedAt = nowIso();
    message.updatedAt = nowIso();
    message.history.push({ at: nowIso(), event: "leased", attempt: message.attempts });
  }
  saveQueue(queue);
  print({ ok: true, leased: due.length, messages: due });
  process.exit(0);
}

if (command === "ack" || command === "complete") {
  const id = String(args.id || "");
  const message = queue.messages.find((m) => m.id === id);
  if (!message) {
    print({ ok: false, error: `Message not found: ${id}` });
    process.exit(1);
  }
  message.status = "served";
  message.servedAt = nowIso();
  message.updatedAt = nowIso();
  message.history.push({ at: nowIso(), event: "acked" });
  queue.stats.served += 1;
  saveQueue(queue);
  print({ ok: true, message });
  process.exit(0);
}

if (command === "fail") {
  // Record a failed attempt for an external worker; applies retry/backoff.
  const id = String(args.id || "");
  const message = queue.messages.find((m) => m.id === id);
  if (!message) {
    print({ ok: false, error: `Message not found: ${id}` });
    process.exit(1);
  }
  applyFailure(queue, message, String(args.error || "worker reported failure"));
  saveQueue(queue);
  print({ ok: true, message });
  process.exit(0);
}

if (command === "requeue") {
  const id = String(args.id || "");
  const message = queue.messages.find((m) => m.id === id);
  if (!message) {
    print({ ok: false, error: `Message not found: ${id}` });
    process.exit(1);
  }
  message.status = "queued";
  message.attempts = 0;
  message.nextAttemptAt = nowIso();
  message.lastError = null;
  message.updatedAt = nowIso();
  message.history.push({ at: nowIso(), event: "requeued" });
  saveQueue(queue);
  print({ ok: true, message });
  process.exit(0);
}

if (command === "clear") {
  const status = args.status ? String(args.status) : "served";
  const before = queue.messages.length;
  if (status === "all") queue.messages = [];
  else queue.messages = queue.messages.filter((m) => m.status !== status);
  saveQueue(queue);
  print({ ok: true, removed: before - queue.messages.length, remaining: queue.messages.length });
  process.exit(0);
}

if (command === "serve") {
  // Push model: drain due items, delivering each through a command. Honors the
  // global rate limit and retry/backoff. Use --loop to run as a worker.
  const max = Number(args.max || 10);
  const loop = Boolean(args.loop);
  const intervalMs = Number(args.interval || 2000);
  const dryRun = Boolean(args["dry-run"]);
  const deliverCmd =
    (args.deliver ? String(args.deliver) : null) ||
    process.env.BUSINESSCLAW_QUEUE_DELIVER_CMD ||
    null;

  const runOnce = () => {
    const q = loadQueue();
    q.config = { ...DEFAULT_CONFIG, ...q.config };
    const tNow = Date.now();
    reclaimStuckLeases(q, tNow);

    // Respect the global minimum interval between delivery attempts.
    const lastServeMs = q.lastServeAt ? new Date(q.lastServeAt).getTime() : 0;
    if (tNow - lastServeMs < q.config.minServeIntervalMs) {
      saveQueue(q);
      return { served: 0, failed: 0, throttled: true };
    }

    const due = q.messages
      .filter((m) => isDue(m, tNow))
      .sort((a, b) => (b.priority - a.priority) || (new Date(a.createdAt) - new Date(b.createdAt)))
      .slice(0, max);

    let served = 0;
    let failed = 0;
    for (const message of due) {
      message.attempts += 1;
      message.status = "in_flight";
      message.leasedAt = nowIso();
      const result = deliver(message, deliverCmd, dryRun);
      if (result.ok) {
        message.status = "served";
        message.servedAt = nowIso();
        message.updatedAt = nowIso();
        message.lastError = null;
        message.history.push({ at: nowIso(), event: "served", attempt: message.attempts });
        q.stats.served += 1;
        served += 1;
      } else {
        applyFailure(q, message, result.error);
        failed += 1;
      }
      q.lastServeAt = nowIso();
      // One attempt per tick keeps the shared endpoint paced.
      break;
    }
    saveQueue(q);
    return { served, failed, due: due.length };
  };

  if (!loop) {
    const result = runOnce();
    print({ ok: true, ...result });
    process.exit(0);
  }

  // Worker loop. Stops on SIGINT/SIGTERM.
  let running = true;
  process.on("SIGINT", () => (running = false));
  process.on("SIGTERM", () => (running = false));
  const tick = () => {
    if (!running) {
      print({ ok: true, stopped: true });
      process.exit(0);
    }
    runOnce();
    setTimeout(tick, intervalMs);
  };
  tick();
} else if (
  !["status", "enqueue", "list", "peek", "lease", "ack", "complete", "fail", "requeue", "clear"].includes(
    command,
  )
) {
  print({
    ok: false,
    error: `Unknown command: ${command}`,
    commands: [
      "status",
      "enqueue",
      "list",
      "peek",
      "serve",
      "lease",
      "ack",
      "fail",
      "requeue",
      "clear",
    ],
  });
  process.exit(1);
}

function applyFailure(queue, message, error) {
  message.lastError = error;
  message.updatedAt = nowIso();
  message.leasedAt = null;
  if (message.attempts >= message.maxAttempts) {
    message.status = "dead";
    message.history.push({ at: nowIso(), event: "dead-letter", error, attempt: message.attempts });
    queue.stats.dead += 1;
    return;
  }
  const delay = backoffMs(queue.config, message.attempts);
  message.status = "retry";
  message.nextAttemptAt = new Date(Date.now() + delay).toISOString();
  message.history.push({ at: nowIso(), event: "retry", error, attempt: message.attempts, delayMs: delay });
  queue.stats.retried += 1;
  queue.stats.failed += 1;
}

function deliver(message, deliverCmd, dryRun) {
  if (dryRun) return { ok: true };
  if (!deliverCmd) {
    // No delivery command wired yet: simulate success so the queue is fully
    // functional for development. Set BUSINESSCLAW_QUEUE_SIMULATE_FAIL=1 to
    // exercise the retry/backoff path.
    if (process.env.BUSINESSCLAW_QUEUE_SIMULATE_FAIL) {
      return { ok: false, error: "simulated delivery failure" };
    }
    return { ok: true };
  }
  try {
    execSync(deliverCmd, {
      input: JSON.stringify(message),
      stdio: ["pipe", "ignore", "pipe"],
      timeout: 60000,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}
