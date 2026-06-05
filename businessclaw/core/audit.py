import json
from pathlib import Path
from threading import Lock

from businessclaw.core.models import AuditEvent


class AuditLog:
    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self._lock = Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, event: AuditEvent) -> AuditEvent:
        line = event.model_dump_json()
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")
        return event

    def tail(self, limit: int = 50) -> list[AuditEvent]:
        if not self.path.exists():
            return []
        with self._lock:
            lines = self.path.read_text(encoding="utf-8").splitlines()
        events: list[AuditEvent] = []
        for line in lines[-limit:]:
            if not line.strip():
                continue
            events.append(AuditEvent.model_validate(json.loads(line)))
        return events

