---
name: businessclaw-board
description: Track BusinessClaw board members/advisors, Discord identities, advice history, and governance approvals.
version: 0.1.0
metadata:
  openclaw:
    requires:
      bins:
        - node
    envVars:
      - name: BUSINESSCLAW_BOARD_PATH
        required: false
        description: Optional path to the BusinessClaw board JSON file.
---

# BusinessClaw Board Skill

Use this skill when BusinessClaw needs to remember board members, Discord owner identities, advice, governance notes, or approval decisions.

## Role Model

- Board members/advisors are not line managers.
- Employees can ask board members for advice.
- Employees should consider board feedback, but routine work remains self-directed.
- Material risk, owner-funded spending, legal commitments, and credential/security changes require governance visibility.

## Local CLI Helper

This skill includes `bin/businessclaw-board.mjs`.

Examples:

```powershell
node skills/businessclaw-board/bin/businessclaw-board.mjs status
node skills/businessclaw-board/bin/businessclaw-board.mjs add-member --id owen --name Owen --discord-id 123 --role "Board Member"
node skills/businessclaw-board/bin/businessclaw-board.mjs advice --member-id owen --employee-id claw --message "Prioritize low-cost revenue experiments."
node skills/businessclaw-board/bin/businessclaw-board.mjs approval --member-id owen --subject "Enable Discord" --decision approved
```

By default it writes to:

```text
data/businessclaw-board.json
```

