import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || process.env.BUSINESSCLAW_DASHBOARD_PORT || 4177);
const ledgerPath = process.env.BUSINESSCLAW_LEDGER_PATH || path.join(root, "data", "businessclaw-ledger.json");
const orgPath = process.env.BUSINESSCLAW_ORG_PATH || path.join(root, "data", "businessclaw-org.json");
const revenuePath = process.env.BUSINESSCLAW_REVENUE_PATH || path.join(root, "data", "businessclaw-revenue.json");
const walletPath = process.env.BUSINESSCLAW_WALLET_PATH || path.join(root, "data", "businessclaw-wallet.json");
const boardPath = process.env.BUSINESSCLAW_BOARD_PATH || path.join(root, "data", "businessclaw-board.json");
const discordRoutingPath = process.env.BUSINESSCLAW_DISCORD_ROUTING_PATH || path.join(root, "data", "businessclaw-discord-routing.json");
const queuePath = process.env.BUSINESSCLAW_QUEUE_PATH || path.join(root, "data", "businessclaw-queue.json");
const auditPath = process.env.BUSINESSCLAW_AUDIT_PATH || path.join(root, "data", "audit.log");
const logPath = path.join(root, "data", "dashboard.log");
const gatewayLogDir = process.env.OPENCLAW_LOG_DIR || "/tmp/openclaw";
const openclawBin =
  process.env.OPENCLAW_BIN ||
  (process.platform === "win32"
    ? path.join(process.env.APPDATA || "", "npm", "openclaw.cmd")
    : "openclaw");

// Kill an entire process tree. On Windows, exec()'s timeout only kills the
// cmd.exe wrapper and orphans the node grandchild — on a slow gateway that
// leaks hundreds of processes. taskkill /T tears down the whole tree.
function treeKill(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { windowsHide: true });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    /* already gone */
  }
}

function runOpenClaw(args) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    // shell:true lets the .cmd shim run on Windows; detached:true (posix) makes
    // a process group so treeKill can reap the whole tree on timeout.
    const child = spawn(openclawBin, args, {
      cwd: root,
      shell: true,
      windowsHide: true,
      detached: process.platform !== "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d));
    child.stderr?.on("data", (d) => (stderr += d));
    // Short timeout: the dashboard must never block on a slow/hung gateway.
    const timer = setTimeout(() => {
      treeKill(child.pid);
      finish({ ok: false, error: `openclaw ${args[0]} timed out` });
    }, 7000);
    child.on("error", (error) => finish({ ok: false, error: error.message }));
    child.on("close", (code) => {
      if (code !== 0) {
        finish({ ok: false, error: `openclaw exited ${code}`, stderr });
        return;
      }
      try {
        finish({ ok: true, data: JSON.parse(stdout) });
      } catch {
        finish({ ok: false, error: "Could not parse OpenClaw JSON output.", stdout, stderr });
      }
    });
  });
}

// OpenClaw CLI calls can be slow (each spawns a process that talks to the
// gateway). We refresh them into a cache on an interval so /api/state always
// responds instantly from file data + last-known gateway snapshots, instead of
// blocking the page for seconds on a cold or busy gateway.
//
// Each CLI spawn attempts a local gateway WebSocket connection. If that fails
// (e.g. device not yet paired), the CLI falls back to local files and still
// exits 0 — so the cache is populated, but the gateway logs a
// "[ws] closed before connect" noise line. We keep the interval long (3 min)
// to minimise those log entries while the device-pairing issue is outstanding.
const openclawCache = {
  status: { ok: false, error: "warming up" },
  agents: { ok: false, error: "warming up" },
  tasks: { ok: false, error: "warming up" },
  updatedAt: null,
};

let refreshing = false;

async function refreshOpenClawCache() {
  // Never overlap refresh batches: if the gateway is slow, a previous batch may
  // still be running. Starting a new one would pile up orphan CLI processes.
  if (refreshing) return;
  refreshing = true;
  try {
    await refreshOpenClawCacheOnce();
  } finally {
    refreshing = false;
  }
}

async function refreshOpenClawCacheOnce() {
  const [status, agents, tasks] = await Promise.all([
    runOpenClaw(["status", "--json"]),
    runOpenClaw(["agents", "list", "--json"]),
    runOpenClaw(["tasks", "list", "--json"]),
  ]);
  // Keep the last successful value on failure so a transient hang doesn't blank
  // the gateway/agents/tasks sections.
  if (status.ok) openclawCache.status = status;
  if (agents.ok) openclawCache.agents = agents;
  if (tasks.ok) openclawCache.tasks = tasks;
  openclawCache.updatedAt = new Date().toISOString();
}

async function log(message) {
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, `${new Date().toISOString()} ${message}\n`);
}

async function readLedger() {
  try {
    return JSON.parse(await fs.readFile(ledgerPath, "utf8"));
  } catch {
    return {
      balances: { earnedCapitalUsd: 0, ownerFundsUsd: 0 },
      wallet: { publicAddress: null, lastNativeBalance: null, lastCheckedAt: null },
      entries: [],
      proposals: [],
    };
  }
}

async function readOrg() {
  try {
    return JSON.parse(await fs.readFile(orgPath, "utf8"));
  } catch {
    return {
      employees: [
        { id: "claw", name: "Claw", role: "Chief Operator", status: "active" },
        { id: "ledger", name: "Ledger", role: "Finance Analyst", status: "active" },
        { id: "forge", name: "Forge", role: "Automation Builder", status: "active" },
      ],
      history: [],
    };
  }
}

async function readRevenue() {
  try {
    return JSON.parse(await fs.readFile(revenuePath, "utf8"));
  } catch {
    return { experiments: [], lessons: [] };
  }
}

async function readWallet() {
  try {
    return JSON.parse(await fs.readFile(walletPath, "utf8"));
  } catch {
    return {
      chain: process.env.BUSINESSCLAW_WALLET_CHAIN || "unset",
      publicAddress: process.env.BUSINESSCLAW_WALLET_PUBLIC_ADDRESS || null,
      nativeBalance: null,
      lastCheckedAt: null,
      receiveNotes: [],
      spendIntents: [],
      transactions: [],
    };
  }
}

async function readBoard() {
  try {
    return JSON.parse(await fs.readFile(boardPath, "utf8"));
  } catch {
    return {
      members: [],
      advice: [],
      approvals: [],
      policy: {
        ownersAreBoard: true,
        routineWorkSelfDirected: true,
      },
    };
  }
}

async function readDiscordRouting() {
  try {
    return JSON.parse(await fs.readFile(discordRoutingPath, "utf8"));
  } catch {
    return {
      channels: [
        { id: "board-room", name: "#board-room", room: "board", defaultAgent: "claw" },
        { id: "ops-floor", name: "#ops-floor", room: "ops", defaultAgent: "claw" },
        { id: "finance", name: "#finance", room: "finance", defaultAgent: "ledger" },
        { id: "forge", name: "#forge", room: "forge", defaultAgent: "forge" },
      ],
      employeeRoutes: [
        { employeeId: "claw", aliases: ["claw", "operator", "strategy"], channelId: "ops-floor" },
        { employeeId: "ledger", aliases: ["ledger", "finance", "bank", "wallet"], channelId: "finance" },
        { employeeId: "forge", aliases: ["forge", "tools", "automation", "dashboard"], channelId: "forge" },
      ],
      boardUsers: [],
    };
  }
}

async function readQueue() {
  try {
    return JSON.parse(await fs.readFile(queuePath, "utf8"));
  } catch {
    return {
      config: {},
      stats: { enqueued: 0, served: 0, retried: 0, dead: 0, failed: 0 },
      messages: [],
    };
  }
}

function summarizeQueue(queue) {
  const messages = queue.messages || [];
  const counts = {};
  for (const message of messages) {
    counts[message.status] = (counts[message.status] || 0) + 1;
  }
  const nowMs = Date.now();
  const due = messages.filter(
    (m) =>
      ["queued", "retry"].includes(m.status) &&
      (!m.nextAttemptAt || new Date(m.nextAttemptAt).getTime() <= nowMs),
  ).length;
  // In-flight "conversations": messages with a from/to pair that are not yet
  // served. The pixel office uses these to walk employees together to talk.
  const conversations = messages
    .filter((m) => m.toAgent && ["queued", "retry", "in_flight"].includes(m.status))
    .slice(-6)
    .map((m) => ({
      id: m.id,
      from: m.fromAgent,
      to: m.toAgent,
      channel: m.channel,
      body: m.body,
      status: m.status,
      attempts: m.attempts,
    }));
  return {
    stats: queue.stats || {},
    counts,
    due,
    total: messages.length,
    conversations,
    recent: messages
      .slice(-8)
      .reverse()
      .map((m) => ({
        id: m.id,
        kind: m.kind,
        from: m.fromAgent,
        to: m.toAgent,
        status: m.status,
        attempts: m.attempts,
        body: m.body,
        lastError: m.lastError,
      })),
  };
}

async function readAuditTail() {
  try {
    const text = await fs.readFile(auditPath, "utf8");
    return text.trim().split(/\r?\n/).slice(-12);
  } catch {
    return [];
  }
}

async function readGatewayActivity() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(gatewayLogDir, `openclaw-${today}.log`);
    const text = await fs.readFile(logFile, "utf8");
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const entries = [];
    for (const raw of lines.slice(-300)) {
      try {
        const obj = JSON.parse(raw);
        const msg = String(obj.message || obj["0"] || "").trim();
        const level = obj._meta?.logLevelName || "INFO";
        const time = obj.time || obj._meta?.date || null;
        if (!msg) continue;
        // Only surface agent/model/discord/ws activity — skip config and startup noise
        const lower = msg.toLowerCase();
        // Skip benign "device not yet paired" noise — these are dashboard CLI poll
        // side-effects, not real errors; they don't affect agent operation.
        if (lower.includes("closed before connect") || lower.includes("device identity required")) continue;
        const isAgentActivity = lower.includes("[agent") || lower.includes("[ws]") || lower.includes("[discord]") || lower.includes("[heartbeat]") || lower.includes("[cron]");
        const isModelActivity = lower.includes("model") && (lower.includes("token") || lower.includes("→") || lower.includes("⇄") || lower.includes("call"));
        const isError = level === "ERROR" || level === "WARN";
        if (!isAgentActivity && !isModelActivity && !isError) continue;
        // Try to extract a sender tag like [agent/claw] → "claw"
        const senderMatch = msg.match(/\[agents?\/([^\]]+)\]/);
        const sender = senderMatch ? senderMatch[1] : (msg.includes("[discord]") ? "discord" : msg.includes("[ws]") ? "ws" : msg.includes("[heartbeat]") || msg.includes("[cron]") ? "scheduler" : "gateway");
        entries.push({ time, level, message: msg, sender });
      } catch { /* skip malformed lines */ }
    }
    // Return last 40 relevant entries, newest first
    return entries.slice(-40).reverse();
  } catch {
    return [];
  }
}

function parseAuditLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function buildBoardMessages({ auditTrail, board }) {
  const auditMessages = (auditTrail || [])
    .map(parseAuditLine)
    .filter((event) => event && (
      event.kind?.startsWith("discord.") ||
      event.actor?.startsWith("owner") ||
      event.data?.owner_name ||
      event.data?.owner_id
    ))
    .map((event) => ({
      at: event.created_at || event.createdAt,
      actor: event.data?.owner_name || event.actor || "board",
      kind: event.kind || "message",
      message: event.message || event.data?.owner_message || event.data?.markdown || "",
      employeeId: event.data?.employee_id || null,
      employeeName: event.data?.employee_name || null,
    }))
  const adviceMessages = (board.advice || []).map((item) => ({
    at: item.createdAt,
    actor: item.memberId || "board",
    kind: "board.advice",
    message: item.message || "",
    employeeId: item.employeeId || null,
    employeeName: item.employeeId || null,
  }));
  return [...auditMessages, ...adviceMessages]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 8);
}

function buildFileCabinet({ ledger, org, revenue, wallet = {}, board = {}, discordRouting = {}, auditTrail }) {
  const records = [];
  for (const channel of discordRouting.channels || []) {
    records.push({
      cabinet: "Discord",
      at: channel.updatedAt || discordRouting.updatedAt,
      title: `${channel.name || channel.id || "channel"} -> ${channel.defaultAgent || "claw"}`,
      detail: channel.purpose || channel.room || "",
    });
  }
  for (const route of discordRouting.employeeRoutes || []) {
    records.push({
      cabinet: "Discord Route",
      at: route.updatedAt || discordRouting.updatedAt,
      title: route.employeeId || "employee",
      detail: (route.aliases || []).join(", "),
    });
  }
  for (const member of board.members || []) {
    records.push({
      cabinet: "Board",
      at: member.addedAt || board.updatedAt,
      title: `${member.status || "active"}: ${member.name || member.id || "member"}`,
      detail: member.role || member.discordUsername || "",
    });
  }
  for (const advice of board.advice || []) {
    records.push({
      cabinet: "Board Advice",
      at: advice.createdAt || board.updatedAt,
      title: `${advice.memberId || "board"} to ${advice.employeeId || "company"}`,
      detail: advice.message || "",
    });
  }
  for (const approval of board.approvals || []) {
    records.push({
      cabinet: "Approvals",
      at: approval.createdAt || board.updatedAt,
      title: approval.subject || approval.id || "approval",
      detail: `${approval.status || "open"} ${approval.decision || ""}`.trim(),
    });
  }
  for (const item of org.history || []) {
    const employee = item.employee || {};
    records.push({
      cabinet: "Employment",
      at: item.createdAt || employee.hiredAt || employee.retiredAt || org.updatedAt,
      title: `${item.type || "change"}: ${employee.name || employee.id || "employee"}`,
      detail: employee.role || employee.retirementReason || employee.reason || "",
    });
  }
  for (const entry of ledger.entries || []) {
    records.push({
      cabinet: "Ledger",
      at: entry.createdAt || entry.at || ledger.updatedAt,
      title: entry.label || entry.type || "ledger entry",
      detail: entry.amountUsd == null ? "" : `$${Number(entry.amountUsd).toFixed(2)}`,
    });
  }
  for (const proposal of ledger.proposals || []) {
    records.push({
      cabinet: "Spend",
      at: proposal.createdAt || proposal.updatedAt || ledger.updatedAt,
      title: proposal.title || proposal.id || "spend proposal",
      detail: proposal.status || "",
    });
  }
  for (const experiment of revenue.experiments || []) {
    records.push({
      cabinet: "Revenue",
      at: experiment.createdAt || experiment.updatedAt || revenue.updatedAt,
      title: experiment.name || experiment.id || "experiment",
      detail: experiment.status || experiment.nextAction || "",
    });
  }
  for (const note of wallet.receiveNotes || []) {
    records.push({
      cabinet: "Wallet",
      at: note.createdAt || wallet.updatedAt,
      title: `receive: ${note.expectedAsset || "asset"}`,
      detail: note.expectedAmount == null ? note.source || "" : `${note.expectedAmount} from ${note.source || "unknown"}`,
    });
  }
  for (const intent of wallet.spendIntents || []) {
    records.push({
      cabinet: "Wallet",
      at: intent.createdAt || wallet.updatedAt,
      title: `spend intent: ${intent.asset || "asset"}`,
      detail: `${intent.status || "open"} ${intent.amount || 0} - ${intent.purpose || ""}`,
    });
  }
  for (const tx of wallet.transactions || []) {
    records.push({
      cabinet: "Wallet",
      at: tx.createdAt || wallet.updatedAt,
      title: tx.hash || "transaction",
      detail: `${tx.direction || "unknown"} ${tx.amount || 0} ${tx.asset || ""}`,
    });
  }
  for (const line of auditTrail || []) {
    const parsed = parseAuditLine(line);
    if (parsed) {
      records.push({
        cabinet: "Audit",
        at: parsed.created_at || parsed.createdAt,
        title: parsed.kind || "system note",
        detail: parsed.message || parsed.actor || "",
      });
      continue;
    }
    const match = line.match(/^(\S+)\s+(.*)$/);
    records.push({
      cabinet: "Audit",
      at: match?.[1],
      title: "system note",
      detail: match?.[2] || line,
    });
  }
  return records
    .filter((record) => record.title || record.detail)
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 18);
}

async function buildState() {
  // Gateway/agents/tasks come from the cache (refreshed on an interval) so this
  // never blocks on the OpenClaw CLI. File-backed sections are read fresh.
  const status = openclawCache.status;
  const agents = openclawCache.agents;
  const tasks = openclawCache.tasks;
  const [ledger, org, revenue, wallet, board, discordRouting, queue, auditTrail, activity] = await Promise.all([
    readLedger(),
    readOrg(),
    readRevenue(),
    readWallet(),
    readBoard(),
    readDiscordRouting(),
    readQueue(),
    readAuditTail(),
    readGatewayActivity(),
  ]);

  const fileCabinet = buildFileCabinet({ ledger, org, revenue, wallet, board, discordRouting, auditTrail });
  const boardMessages = buildBoardMessages({ auditTrail, board });
  const queueSummary = summarizeQueue(queue);

  return {
    generatedAt: new Date().toISOString(),
    gateway: status.ok ? status.data : { error: status.error },
    agents: agents.ok ? agents.data : { error: agents.error },
    tasks: tasks.ok ? tasks.data : { error: tasks.error },
    ledger,
    org,
    revenue,
    wallet,
    board,
    discordRouting,
    queue: queueSummary,
    fileCabinet,
    boardMessages,
    activity,
    dashboard: {
      mode: "display-only",
      theme: "pixel-office",
      inputEnabled: false,
    },
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/state") {
      await log("state request");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(await buildState(), null, 2));
      return;
    }

    const safePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(publicDir, safePath));
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const body = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(body);
  } catch (error) {
    await log(`request error: ${error?.stack || error?.message || String(error)}`);
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error?.message || "Not found");
  }
});

server.listen(port, host, () => {
  console.log(`BusinessClaw display dashboard: http://${host}:${port}`);
  log(`listening on ${port}`).catch(() => {});
  // Warm the OpenClaw cache immediately, then refresh on an interval. Never
  // awaited by request handling, so a slow gateway never stalls the page.
  refreshOpenClawCache().catch(() => {});
  // Gateway/agents/tasks change slowly; a long interval keeps process churn low
  // even when the gateway is cold. File-backed business data is always fresh.
  setInterval(() => {
    refreshOpenClawCache().catch(() => {});
  }, 180000); // 3 min — each poll spawns a CLI process that attempts a gateway WS connect
});
