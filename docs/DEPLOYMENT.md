# Deployment

## Recommended Production Shape

Run the project as Docker Compose on one small server:

- Agent API container
- Discord bot container
- Employee runner container
- Dashboard container
- Reverse proxy container
- SQLite volume or Postgres container

For the first deployment, SQLite is acceptable if there is a backup plan. Postgres is better once the agent starts doing important work.

## Oracle Cloud Always Free

Oracle Cloud Always Free can be a very good fit for an API-driven agent because the Ampere A1 allocation is generous for a free server. The usual Always Free ARM allocation is up to 4 OCPUs and 24 GB RAM across eligible Ampere A1 instances, subject to regional capacity and account limits.

Pros:

- Excellent free RAM/CPU if you can provision it.
- Enough for API service, Discord bot, dashboard, queue, and small database.
- Good bandwidth for a hobby service.

Cons:

- Capacity can be frustrating in some regions.
- Account/provisioning experience can be inconsistent.
- ARM architecture can complicate some packages.
- Free accounts need careful limit checks and budget alerts.

## $5 VPS Option

A low-cost VPS is usually easier and more predictable than Oracle, but the hardware is smaller. At roughly `$5-6/month`, expect about 1 vCPU and 512 MB to 1 GB RAM from many mainstream providers.

Pros:

- Simple provisioning.
- Predictable support and billing.
- Usually x86 by default.

Cons:

- Much less RAM than Oracle A1.
- Monthly cost.
- May struggle with browser automation and multiple employees.

## Recommendation

Use Oracle Cloud Always Free if you can get an Ampere A1 instance. Use a paid VPS if you value simplicity more than free resources.

For BusinessClaw specifically:

- Oracle A1 is better for the full service stack.
- A cheap VPS is fine for the Discord bot and API if employee/browser automation stays light.
- Heavy browser automation should eventually move to a separate employee runner or paid box.

## Server Setup Checklist

1. Create a non-root deploy user.
2. Enable firewall rules for SSH, HTTP, and HTTPS only.
3. Install Docker and Docker Compose.
4. Configure a domain DNS A record to the server IP.
5. Run Caddy or Nginx for HTTPS.
6. Add budget alerts in the cloud provider console.
7. Add uptime monitoring.
8. Add daily database backups.
9. Configure systemd to restart Docker Compose after reboot.
10. Test pause/resume and kill switch after deployment.
