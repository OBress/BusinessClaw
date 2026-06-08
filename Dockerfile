FROM node:22-slim

WORKDIR /app

# curl is required by the OpenClaw install script
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

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

# Declare the data directory as a volume — Railway mounts a persistent
# disk here so businessclaw-*.json files survive redeployments.
VOLUME ["/app/data"]

# Railway injects $PORT at runtime; forwarded via the startup script
EXPOSE 4177

CMD ["/app/scripts/start-production.sh"]
