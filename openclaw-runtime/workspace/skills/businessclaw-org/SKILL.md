---
name: businessclaw-org
description: Manage BusinessClaw company structure, employee roles, hiring proposals, retirements, and handoffs.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_ORG_PATH
        required: false
        description: Optional path to the BusinessClaw org chart JSON file.
---

# BusinessClaw Org Skill

Use this skill when BusinessClaw needs to hire, fire, retire, replace, or inspect AI employees.

## Principles

- Employees exist because the business needs a function.
- Hiring should define role, outputs, authority, tools, and reporting expectations.
- Firing/retiring should preserve useful memory and reassign work.
- Ask the board before giving a new employee external credentials, public posting authority, or spending authority.

## Local CLI Helper

```powershell
node skills/businessclaw-org/bin/businessclaw-org.mjs status
node skills/businessclaw-org/bin/businessclaw-org.mjs hire --id scout --name Scout --role "Market Researcher" --reason "Find legal revenue opportunities"
node skills/businessclaw-org/bin/businessclaw-org.mjs retire --id scout --reason "Role no longer needed" --handoff "Transfer notes to Claw"
```

