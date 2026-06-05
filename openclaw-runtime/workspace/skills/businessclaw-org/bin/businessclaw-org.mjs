#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const orgPath = process.env.BUSINESSCLAW_ORG_PATH || path.join("data", "businessclaw-org.json");
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

function loadOrg() {
  fs.mkdirSync(path.dirname(orgPath), { recursive: true });
  if (!fs.existsSync(orgPath)) {
    return {
      version: 1,
      updatedAt: nowIso(),
      employees: [
        { id: "claw", name: "Claw", role: "Chief Operator", status: "active" },
        { id: "ledger", name: "Ledger", role: "Finance Analyst", status: "active" },
        { id: "forge", name: "Forge", role: "Automation Builder", status: "active" },
      ],
      history: [],
    };
  }
  return JSON.parse(fs.readFileSync(orgPath, "utf8"));
}

function saveOrg(org) {
  org.updatedAt = nowIso();
  fs.writeFileSync(orgPath, JSON.stringify(org, null, 2) + "\n");
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const org = loadOrg();

if (command === "status") {
  print({
    ok: true,
    path: orgPath,
    activeEmployees: org.employees.filter((employee) => employee.status === "active"),
    retiredEmployees: org.employees.filter((employee) => employee.status !== "active"),
    history: org.history.slice(-10),
  });
  process.exit(0);
}

if (command === "hire") {
  const id = String(args.id || "").trim().toLowerCase();
  if (!id) {
    print({ ok: false, error: "--id is required" });
    process.exit(1);
  }
  if (org.employees.some((employee) => employee.id === id && employee.status === "active")) {
    print({ ok: false, error: `Active employee already exists: ${id}` });
    process.exit(1);
  }
  const employee = {
    id,
    name: args.name || id,
    role: args.role || "Unspecified Role",
    status: "active",
    reason: args.reason || "",
    outputs: args.outputs || "",
    authority: args.authority || "internal-only",
    hiredAt: nowIso(),
  };
  org.employees = org.employees.filter((item) => item.id !== id);
  org.employees.push(employee);
  org.history.push({ type: "hire", createdAt: nowIso(), employee });
  saveOrg(org);
  print({ ok: true, employee });
  process.exit(0);
}

if (command === "retire" || command === "fire") {
  const id = String(args.id || "").trim().toLowerCase();
  const employee = org.employees.find((item) => item.id === id);
  if (!employee) {
    print({ ok: false, error: `Employee not found: ${id}` });
    process.exit(1);
  }
  employee.status = command === "fire" ? "fired" : "retired";
  employee.retiredAt = nowIso();
  employee.retirementReason = args.reason || "";
  employee.handoff = args.handoff || "";
  org.history.push({ type: employee.status, createdAt: nowIso(), employee });
  saveOrg(org);
  print({ ok: true, employee });
  process.exit(0);
}

print({ ok: false, error: `Unknown command: ${command}`, commands: ["status", "hire", "retire", "fire"] });
process.exit(1);

