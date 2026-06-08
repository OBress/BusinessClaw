FROM node:20-slim

WORKDIR /app

# Install OpenClaw CLI so the gateway and agents can run inside the container
RUN npm install -g openclaw

# Copy project files
COPY . .

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Make startup script executable
RUN chmod +x /app/scripts/start-production.sh

# Railway injects $PORT at runtime; we forward it via the startup script
EXPOSE 4177

CMD ["/app/scripts/start-production.sh"]
