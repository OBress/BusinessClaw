const stateUrl = "/api/state";
const agentLabels = { claw: "Claw", ledger: "Ledger", forge: "Forge" };
const agentColor = { claw: "#3f6fb0", ledger: "#3f9d6b", forge: "#c25a44" };
let popoutId = null;

let latestState = null;
const panelOrder = ["office", "analytics", "bank", "tasks", "queue", "experiments", "cabinet"];
let selectedPanel = "office";
let autoRotate = true;

function $(id) {
  return document.getElementById(id);
}

async function refresh() {
  try {
    const response = await fetch(stateUrl);
    latestState = await response.json();
    render(latestState);
  } catch (error) {
    renderError(error);
  }
}

function render(state) {
  $("timestamp").textContent = `Updated ${new Date(state.generatedAt).toLocaleTimeString()}`;
  const agents = normalizeAgents(state.agents);
  const tasks = normalizeTasks(state.tasks);
  const ledger = state.ledger || {};
  const org = state.org || {};
  const revenue = state.revenue || {};
  const wallet = state.wallet || {};
  const queue = state.queue || {};
  const activeEmployees = (org.employees || []).filter((e) => e.status === "active");

  $("gateway-status").textContent = gatewayStatus(state.gateway);
  $("agent-count").textContent = String(activeEmployees.length || agents.length);
  $("queue-count").textContent = String(queue.due || (queue.counts && queue.counts.queued) || 0);
  $("bank-level").textContent = currency(ledger?.balances?.earnedCapitalUsd || 0);

  // Board mic indicator.
  renderMicrophone(state.boardMessages || []);

  // Feed the pixel office: ambient bubbles + queue-driven conversations.
  const ambient = computeAmbient({ tasks, ledger, org, revenue, wallet, queue });
  window.Office.setState({ ...state, __ambient: ambient });

  renderSelectedPanel({ agents, tasks, ledger, org, revenue, wallet, board: state.board || {}, discordRouting: state.discordRouting || {}, queue, gateway: state.gateway });
  if (popoutId) fillPopout(popoutId); // keep an open pop-out fresh
}

function normalizeAgents(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.agents)) return raw.agents;
  if (Array.isArray(raw?.data?.agents)) return raw.data.agents;
  return [];
}

function normalizeTasks(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.tasks)) return raw.tasks;
  if (Array.isArray(raw?.data?.tasks)) return raw.data.tasks;
  return [];
}

function gatewayStatus(gateway) {
  if (gateway?.overview?.gateway) return "online";
  if (gateway?.gateway?.reachable || gateway?.reachable) return "online";
  if (gateway?.runtimeVersion) return "online";
  // A slow/cold gateway (cache still warming, or a call timed out) is connecting,
  // not errored — the process is up, it just hasn't answered within the timeout.
  const err = String(gateway?.error || "");
  if (/warming up|timed out|timeout|ECONN|connect/i.test(err)) return "connecting";
  if (gateway?.error) return "error";
  return "online";
}

function currency(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

// ---- ambient employee chatter (used for idle speech/thought bubbles) ----
function computeAmbient({ tasks, ledger, org, revenue, wallet, queue }) {
  const task = tasks[0]?.title || tasks[0]?.name || tasks[0]?.id;
  const experiments = (revenue.experiments || []).filter((i) => ["planned", "running"].includes(i.status));
  const openProposal = (ledger.proposals || []).find((p) => p.status === "open");
  const spendIntent = (wallet.spendIntents || []).find((i) => i.status === "open");
  const history = (org.history || []).at(-1);
  const activeEmployees = (org.employees || []).filter((e) => e.status === "active");
  const queueDue = queue.due || 0;
  return {
    claw: {
      speech: task ? `On it: ${truncate(task, 30)}` : "Checking the roadmap.",
      thought: queueDue ? `${queueDue} in the queue` : experiments[0]?.nextAction || "Where's the next dollar?",
    },
    ledger: {
      speech: openProposal ? `Reviewing ${truncate(openProposal.title || "spend", 22)}.` : "Watching the bank.",
      thought: spendIntent ? `Wallet: ${spendIntent.asset}` : history ? `Filed: ${history.type}` : "Receipts tidy.",
    },
    forge: {
      speech: experiments[0] ? `Building ${truncate(experiments[0].name || "experiment", 20)}.` : "Improving systems.",
      thought: activeEmployees.length > 3 ? "New teammate!" : "What to automate next?",
    },
  };
}

// ---- panels ----
function panelMap(data) {
  return {
    office: officePanel(data),
    analytics: analyticsPanel(data),
    bank: bankPanel(data),
    tasks: tasksPanel(data),
    queue: queuePanel(data),
    experiments: experimentsPanel(data),
    cabinet: cabinetPanel({ ...data, fileCabinet: latestState?.fileCabinet || [] }),
  };
}

function renderSelectedPanel(data) {
  const panels = panelMap(data);
  const panel = panels[selectedPanel] || panels.office;
  $("rotating-title").textContent = panel.title;
  $("rotating-body").innerHTML = panel.body;
  document.querySelectorAll(".display-menu button").forEach((item) =>
    item.classList.toggle("active", item.dataset.panel === selectedPanel),
  );
}

function officePanel({ agents, org, board }) {
  const orgEmployees = (org.employees || []).filter((e) => e.status === "active");
  const rows = (orgEmployees.length ? orgEmployees : agents).map((agent) => {
    const name = agent.identityName || agent.identity?.name || agent.name || agent.id || "agent";
    const role = agent.role || agent.workspace || "workspace";
    return `<p><strong>${escapeHtml(name)}</strong><br>${escapeHtml(role)}</p>`;
  });
  const boardRows = (board.members || [])
    .filter((m) => m.status !== "inactive")
    .slice(0, 3)
    .map((m) => `<p><strong>${escapeHtml(m.name || m.id)}</strong><br>${escapeHtml(m.role || "Board Member")}</p>`);
  return {
    title: "Office Floors",
    body: [
      rows.join("") || "<p>No agents reported yet.</p>",
      boardRows.length ? `<p class="sub">Board / Advisors</p>${boardRows.join("")}` : "",
    ].join(""),
  };
}

function analyticsPanel({ agents, tasks, ledger, org, revenue, board, discordRouting, queue }) {
  const openProposals = (ledger.proposals || []).filter((p) => p.status === "open").length;
  const activeEmployees = (org.employees || []).filter((e) => e.status === "active").length;
  const activeExperiments = (revenue.experiments || []).filter((e) => ["planned", "running"].includes(e.status)).length;
  const stat = (label, value) => `<p>${label}: <strong>${value}</strong></p>`;
  return {
    title: "Analytics",
    body: [
      stat("Active employees", activeEmployees || agents.length),
      stat("OpenClaw agents", agents.length),
      stat("Tracked tasks", tasks.length),
      stat("Queue (served / dead)", `${queue.stats?.served || 0} / ${queue.stats?.dead || 0}`),
      stat("Ledger entries", (ledger.entries || []).length),
      stat("Open spend proposals", openProposals),
      stat("Org changes", (org.history || []).length),
      stat("Board members", (board.members || []).length),
      stat("Discord routes / rooms", `${(discordRouting.employeeRoutes || []).length} / ${(discordRouting.channels || []).length}`),
      stat("Revenue experiments", activeExperiments),
    ].join(""),
  };
}

function bankPanel({ ledger, wallet }) {
  const balances = ledger.balances || {};
  const ledgerWallet = ledger.wallet || {};
  const stat = (label, value) => `<p>${label}: <strong>${value}</strong></p>`;
  return {
    title: "Bank Level",
    body: [
      stat("Earned capital", currency(balances.earnedCapitalUsd)),
      stat("Owner funds tracked", currency(balances.ownerFundsUsd)),
      stat("Wallet", escapeHtml(wallet.publicAddress || ledgerWallet.publicAddress || "not set")),
      stat("Chain", escapeHtml(wallet.chain || "unset")),
      stat("Native balance", escapeHtml(wallet.nativeBalance || ledgerWallet.lastNativeBalance || "unknown")),
      stat("Transactions filed", (wallet.transactions || []).length),
    ].join(""),
  };
}

function tasksPanel({ tasks }) {
  const rows = tasks.slice(0, 6).map((task) => {
    const title = task.title || task.name || task.id || "Task";
    const status = task.status || "unknown";
    return `<p><strong>${escapeHtml(title)}</strong><br>${escapeHtml(status)}</p>`;
  });
  return { title: "Current Tasks", body: rows.join("") || "<p>No OpenClaw background tasks yet.</p>" };
}

function queuePanel({ queue }) {
  const stats = queue.stats || {};
  const counts = queue.counts || {};
  const head = [
    `<p>Due now: <strong>${queue.due || 0}</strong> · Total: <strong>${queue.total || 0}</strong></p>`,
    `<p>Served: <strong>${stats.served || 0}</strong> · Retried: <strong>${stats.retried || 0}</strong> · Dead: <strong>${stats.dead || 0}</strong></p>`,
    `<p class="sub">In flight: queued ${counts.queued || 0} · retry ${counts.retry || 0} · sending ${counts.in_flight || 0}</p>`,
  ].join("");
  const rows = (queue.recent || []).slice(0, 6).map((m) => {
    const route = `${m.from || "?"} → ${m.to || m.kind || "?"}`;
    const err = m.lastError ? ` · ${escapeHtml(truncate(m.lastError, 22))}` : "";
    return `<p><strong>${escapeHtml(route)}</strong> <em>${escapeHtml(m.status)}${m.attempts ? ` ·a${m.attempts}` : ""}</em><br>${escapeHtml(truncate(m.body || "", 46))}${err}</p>`;
  });
  return { title: "Message Queue", body: head + (rows.join("") || "<p>Queue is empty. Outbound messages will appear here until served.</p>") };
}

function experimentsPanel({ revenue }) {
  const rows = (revenue.experiments || []).slice(0, 6).map((e) => {
    const title = e.name || e.id || "Experiment";
    const next = e.nextAction || e.offer || "No next action";
    return `<p><strong>${escapeHtml(title)}</strong><br>${escapeHtml(e.status || "unknown")} - ${escapeHtml(next)}</p>`;
  });
  return { title: "Revenue Experiments", body: rows.join("") || "<p>No revenue experiments tracked yet.</p>" };
}

function cabinetPanel({ fileCabinet }) {
  const rows = (fileCabinet || []).slice(0, 8).map((record) => {
    const at = record.at ? new Date(record.at).toLocaleString() : "undated";
    return `<p><strong>${escapeHtml(record.cabinet || "Record")}: ${escapeHtml(record.title || "")}</strong><br>${escapeHtml(at)}<br>${escapeHtml(record.detail || "")}</p>`;
  });
  return { title: "File Cabinet", body: rows.join("") || "<p>No records filed yet.</p>" };
}

// ---- employee pop-out card ----
function employeeInfo(employeeId) {
  const state = latestState || {};
  const agents = normalizeAgents(state.agents);
  const org = state.org || {};
  const tasks = normalizeTasks(state.tasks);
  const queue = state.queue || {};
  const employee = (org.employees || []).find((i) => i.id === employeeId) || {};
  const agent = agents.find((i) => i.id === employeeId || i.name === employeeId) || {};
  const history = (org.history || []).filter((i) => i.employee?.id === employeeId).slice(-4).reverse();
  const assignedTasks = tasks.filter((t) => t.agentId === employeeId || t.assignee === employeeId);
  const myQueue = (queue.recent || []).filter((m) => m.from === employeeId || m.to === employeeId);
  const name = employee.name || agent.identityName || agent.name || agentLabels[employeeId] || employeeId;
  const role = employee.role || agent.identity?.role || agent.workspace || "workspace employee";
  return {
    name,
    rows: [
      { label: "Status", value: employee.status || "active" },
      { label: "Role", value: role },
      { label: "Workspace", value: agent.workspace || "not reported" },
      { label: "Current tasks", value: assignedTasks.length ? assignedTasks.map((t) => t.title || t.name || t.id).join(", ") : "No assigned OpenClaw tasks." },
      { label: "Queue activity", value: myQueue.length ? myQueue.map((m) => `${m.from}→${m.to}: ${truncate(m.body || "", 24)} (${m.status})`).join("; ") : "No queued messages." },
      { label: "Employment file", value: history.length ? history.map((i) => `${i.type || "change"}${i.createdAt ? " " + new Date(i.createdAt).toLocaleDateString() : ""}`).join("; ") : "No employment history yet." },
    ],
  };
}

function fillPopout(id) {
  const info = employeeInfo(id);
  const el = $("employee-popout");
  el.innerHTML =
    `<div class="pop-head">` +
    `<span class="pop-avatar" style="background:${agentColor[id] || "#8a6442"}"></span>` +
    `<span class="pop-name">${escapeHtml(info.name)}</span>` +
    `<button type="button" class="pop-close" aria-label="Close">×</button>` +
    `</div>` +
    info.rows.map((r) => `<p class="pop-row"><b>${escapeHtml(r.label)}</b>${escapeHtml(r.value)}</p>`).join("");
  el.querySelector(".pop-close").addEventListener("click", hidePopout);
}

function showPopout(id, pos) {
  popoutId = id;
  fillPopout(id);
  const el = $("employee-popout");
  el.hidden = false;
  positionPopout(pos);
  $("scene-hint").textContent = `Viewing ${agentLabels[id] || id} — click elsewhere to close`;
}

function positionPopout(pos) {
  const el = $("employee-popout");
  const holder = $("canvas-holder");
  const hw = holder.clientWidth;
  const hh = holder.clientHeight;
  const pw = el.offsetWidth;
  const ph = el.offsetHeight;
  const ax = pos?.x ?? hw / 2;
  const ay = pos?.y ?? hh / 2;
  let left = Math.max(8, Math.min(hw - pw - 8, ax - pw / 2));
  let top = ay - ph - 16;
  if (top < 8) top = Math.min(hh - ph - 8, ay + 28); // not enough room above → drop below
  top = Math.max(8, top);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.setProperty("--tail-x", `${Math.max(14, Math.min(pw - 14, ax - left))}px`);
}

function hidePopout() {
  popoutId = null;
  const el = $("employee-popout");
  if (el) el.hidden = true;
  $("scene-hint").textContent = "Scroll to zoom · drag to pan · click an employee";
}

function renderMicrophone(boardMessages) {
  const mic = $("board-mic");
  const note = $("mic-note");
  if (!mic || !note) return;
  const latest = boardMessages[0];
  const active = latest && Date.now() - new Date(latest.at || 0).getTime() < 1000 * 60 * 60 * 6;
  mic.classList.toggle("active", Boolean(active));
  if (!latest) {
    note.textContent = "quiet";
    return;
  }
  const target = latest.employeeName ? ` → ${latest.employeeName}` : "";
  note.textContent = truncate(`${latest.actor}${target}`, 22);
}

function truncate(value, limit) {
  const text = String(value || "");
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function renderError(error) {
  $("gateway-status").textContent = "error";
  $("rotating-title").textContent = "Display Error";
  $("rotating-body").innerHTML = `<p>${escapeHtml(error.message || String(error))}</p>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function viewData() {
  return {
    agents: normalizeAgents(latestState.agents),
    tasks: normalizeTasks(latestState.tasks),
    ledger: latestState.ledger || {},
    org: latestState.org || {},
    revenue: latestState.revenue || {},
    wallet: latestState.wallet || {},
    board: latestState.board || {},
    discordRouting: latestState.discordRouting || {},
    queue: latestState.queue || {},
    gateway: latestState.gateway,
  };
}

function installInteractions() {
  // Side menu (display navigation only — no data entry).
  document.querySelectorAll(".display-menu button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPanel = button.dataset.panel || "office";
      autoRotate = false;
      $("scene-hint").textContent = "Click an employee to view their profile.";
      if (latestState) renderSelectedPanel(viewData());
    });
  });

  // Floor switching.
  document.querySelectorAll(".floor-pill").forEach((button) => {
    button.addEventListener("click", () => {
      const floor = Number(button.dataset.floor || 0);
      window.Office.setFloor(floor);
      hidePopout();
      document.querySelectorAll(".floor-pill").forEach((b) => b.classList.toggle("active", b === button));
    });
  });

  // Zoom controls (display navigation only).
  document.getElementById("zoom-in")?.addEventListener("click", () => window.Office.zoomBy(1.25));
  document.getElementById("zoom-out")?.addEventListener("click", () => window.Office.zoomBy(1 / 1.25));
  document.getElementById("zoom-fit")?.addEventListener("click", () => window.Office.fit());

  // Canvas employee clicks → pop-out profile; clicking elsewhere closes it.
  window.Office.onAgentClick((id, pos) => showPopout(id, pos));
  window.Office.onEmptyClick(() => hidePopout());
}

// Auto-tour panels when idle.
setInterval(() => {
  if (!autoRotate || !latestState) return;
  const nextIndex = (panelOrder.indexOf(selectedPanel) + 1) % panelOrder.length;
  selectedPanel = panelOrder[nextIndex];
  renderSelectedPanel(viewData());
}, 7000);

window.Office.init(document.getElementById("stage"));
installInteractions();
refresh();
setInterval(refresh, 8000);
