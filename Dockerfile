FROM node:22-slim

WORKDIR /app

# curl for OpenClaw, python3+pip+git for SearXNG sidecar
RUN apt-get update && apt-get install -y curl python3 python3-pip git && rm -rf /var/lib/apt/lists/*

# Install SearXNG — web search sidecar, runs on 127.0.0.1:8888
RUN git clone https://github.com/searxng/searxng /searxng --depth 1 && \
    python3 -m pip install --break-system-packages --no-cache-dir -r /searxng/requirements.txt

# Install OpenClaw via its official Linux installer
RUN curl -fsSL https://openclaw.ai/install.sh | bash

# Copy project files
COPY . .

# Bootstrap workspace, register agents, configure Discord channel bindings,
# and install dashboard deps. BUSINESSCLAW_REPO_URL is intentionally unset so
# bootstrap skips the git clone (files are already here from COPY).
# openclaw gateway install/start will fail silently — no systemd in Docker.
RUN BUSINESSCLAW_ROOT=/app bash /app/scripts/bootstrap-vps.sh

RUN mkdir -p /app/data && \
    chmod +x /app/scripts/start-production.sh

# Railway injects $PORT at runtime; forwarded via the startup script
EXPOSE 4177

CMD ["/app/scripts/start-production.sh"]
