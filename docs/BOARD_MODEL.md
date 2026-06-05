# Board Model

BusinessClaw treats owners as board members or advisors.

## Principles

- Board members can provide advice, constraints, approvals, and strategic direction.
- Employees can ask board members for input.
- Routine work remains self-directed by the business.
- Board feedback should be recorded and considered, not blindly obeyed.
- Legal commitments, owner-funded spending, credential/security changes, and high-risk public actions require governance visibility.

## Skill

Use `businessclaw-board` to track:

- board/advisor identities
- Discord IDs and usernames
- advice records
- approvals
- governance policy

Examples:

```powershell
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs status
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs add-member --id owen --name Owen --discord-id 123 --role "Board Member"
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs advice --member-id owen --employee-id forge --message "Improve the dashboard."
node openclaw-runtime\workspace\skills\businessclaw-board\bin\businessclaw-board.mjs approval --member-id owen --subject "Enable Discord" --decision approved
```

## Dashboard

The dashboard reads `data/businessclaw-board.json`.

- Board/advisor records appear in the Office and Analytics panels.
- Advice and approval records appear in the File Cabinet.
- Recent board/Discord messages activate the boardroom microphone indicator.

