from typing import Any
from urllib.parse import quote

import httpx

from businessclaw.discord_bot.formatting import (
    format_employee_list,
    format_employee_response,
    format_task_list,
    inline_code,
    split_discord_message,
)
from businessclaw.settings import get_settings


class DiscordUnavailable(RuntimeError):
    pass


async def call_api(path: str, method: str = "GET", json: dict[str, Any] | None = None) -> dict:
    settings = get_settings()
    base_url = f"http://{settings.agent_api_host}:{settings.agent_api_port}"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(method, f"{base_url}{path}", json=json)
        response.raise_for_status()
        return response.json()


def require_discord_imports():
    try:
        import discord
        from discord import app_commands
    except ImportError as exc:
        raise DiscordUnavailable(
            "discord.py is not installed. Install with: pip install -e .[discord]"
        ) from exc
    return discord, app_commands


async def main() -> None:
    settings = get_settings()
    if not settings.discord_bot_token:
        raise RuntimeError("DISCORD_BOT_TOKEN is required to run the Discord bot.")

    discord, app_commands = require_discord_imports()

    intents = discord.Intents.default()
    client = discord.Client(intents=intents)
    tree = app_commands.CommandTree(client)
    owner_ids = settings.discord_owner_ids

    def is_owner(interaction) -> bool:
        return str(interaction.user.id) in owner_ids

    async def owner_only(interaction) -> bool:
        if is_owner(interaction):
            return True
        await interaction.response.send_message(
            "Only configured BusinessClaw owners can use company commands.",
            ephemeral=True,
        )
        return False

    async def send_markdown(interaction, markdown: str, ephemeral: bool = True) -> None:
        chunks = split_discord_message(markdown)
        await interaction.response.send_message(chunks[0], ephemeral=ephemeral)
        for chunk in chunks[1:]:
            await interaction.followup.send(chunk, ephemeral=ephemeral)

    async def send_followup_markdown(interaction, markdown: str, ephemeral: bool = True) -> None:
        for chunk in split_discord_message(markdown):
            await interaction.followup.send(chunk, ephemeral=ephemeral)

    @tree.command(name="status", description="Show BusinessClaw company status.")
    async def status(interaction):
        if not await owner_only(interaction):
            return
        data = await call_api("/status")
        await send_markdown(
            interaction,
            "\n".join(
                [
                    "**BusinessClaw Status**",
                    f"Status: {inline_code(data['status'])}",
                    f"Goal: {data['goal']}",
                    f"Employees: {inline_code(len(data['employees']))}",
                    f"Earned capital: {inline_code(data.get('earned_capital_usd', 0))}",
                ]
            ),
        )

    @tree.command(name="pause", description="Pause BusinessClaw.")
    async def pause(interaction):
        if not await owner_only(interaction):
            return
        data = await call_api("/command", "POST", {"command": "pause", "actor": str(interaction.user.id)})
        await send_markdown(interaction, data["message"])

    @tree.command(name="resume", description="Resume BusinessClaw.")
    async def resume(interaction):
        if not await owner_only(interaction):
            return
        data = await call_api("/command", "POST", {"command": "resume", "actor": str(interaction.user.id)})
        await send_markdown(interaction, data["message"])

    @tree.command(name="goal", description="Set the company goal.")
    async def goal(interaction, goal_text: str):
        if not await owner_only(interaction):
            return
        data = await call_api(
            "/command",
            "POST",
            {
                "command": "goal",
                "actor": str(interaction.user.id),
                "actor_name": interaction.user.display_name,
                "args": {"goal": goal_text},
            },
        )
        await send_markdown(interaction, data["message"])

    @tree.command(name="employees", description="Show current AI employees and their work.")
    async def employees(interaction):
        if not await owner_only(interaction):
            return
        data = await call_api("/employees")
        await send_markdown(interaction, format_employee_list(data["employees"]))

    @tree.command(name="employee", description="Show one BusinessClaw employee's current work.")
    async def employee(interaction, employee: str):
        if not await owner_only(interaction):
            return
        data = await call_api(f"/employees/{quote(employee)}")
        if not data["ok"]:
            await send_markdown(interaction, data["message"])
            return
        await send_markdown(interaction, format_employee_list([data["data"]["employee"]]))

    @tree.command(name="talk", description="Talk to a specific BusinessClaw employee.")
    async def talk(interaction, employee: str, message: str):
        if not await owner_only(interaction):
            return
        clean_message = message.strip()
        if not clean_message:
            await interaction.response.send_message("Message cannot be empty.", ephemeral=True)
            return
        await interaction.response.defer(ephemeral=False, thinking=True)
        try:
            data = await call_api(
                "/discord/employee-message",
                "POST",
                {
                    "employee": employee,
                    "message": clean_message,
                    "owner_id": str(interaction.user.id),
                    "owner_name": interaction.user.display_name,
                    "discord": {
                        "guild_id": str(interaction.guild_id) if interaction.guild_id else None,
                        "channel_id": str(interaction.channel_id) if interaction.channel_id else None,
                        "message_id": str(interaction.id),
                    },
                },
            )
        except httpx.HTTPError as exc:
            await interaction.followup.send(
                f"BusinessClaw API error while contacting {inline_code(employee)}: {inline_code(exc)}",
                ephemeral=True,
            )
            return
        if not data["ok"]:
            await interaction.followup.send(data["markdown"], ephemeral=True)
            return
        markdown = format_employee_response(
            data.get("employee_name") or employee,
            data.get("employee_role"),
            data["markdown"],
        )
        await send_followup_markdown(interaction, markdown, ephemeral=False)

    @tree.command(name="work", description="Run one BusinessClaw work cycle.")
    async def work(interaction, employee: str | None = None, cycles: int = 1):
        if not await owner_only(interaction):
            return
        await interaction.response.defer(ephemeral=False, thinking=True)
        cycle_count = max(1, min(cycles, 5))
        data = await call_api(
            "/company/tick",
            "POST",
            {"employee": employee, "cycles": cycle_count, "owner_visible": True},
        )
        for result in data["results"]:
            if not result["ok"]:
                await interaction.followup.send(result["markdown"], ephemeral=True)
                continue
            markdown = format_employee_response(
                result.get("employee_name") or "BusinessClaw",
                None,
                result["markdown"],
            )
            await send_followup_markdown(interaction, markdown, ephemeral=False)

    @tree.command(name="tasks", description="Show BusinessClaw tasks.")
    async def tasks(interaction, include_done: bool = False):
        if not await owner_only(interaction):
            return
        data = await call_api(f"/tasks?include_done={str(include_done).lower()}")
        await send_markdown(interaction, format_task_list(data["tasks"]))

    @tree.command(name="task", description="Create a BusinessClaw task.")
    async def task(
        interaction,
        title: str,
        employee: str | None = None,
        description: str = "",
        expected_value: str = "",
    ):
        if not await owner_only(interaction):
            return
        data = await call_api(
            "/tasks",
            "POST",
            {
                "title": title,
                "description": description,
                "employee": employee,
                "expected_value": expected_value or None,
                "source": str(interaction.user.id),
            },
        )
        await send_markdown(interaction, data["message"])

    @tree.command(name="reporting", description="Change an employee's reporting style.")
    async def reporting(interaction, employee: str, preferences: str):
        if not await owner_only(interaction):
            return
        data = await call_api(
            "/employees/reporting",
            "POST",
            {
                "employee": employee,
                "preferences": preferences,
                "owner_id": str(interaction.user.id),
                "owner_name": interaction.user.display_name,
            },
        )
        await send_markdown(interaction, data["message"])

    @tree.command(name="finances", description="Show wallet and earned-capital status.")
    async def finances(interaction):
        if not await owner_only(interaction):
            return
        wallet = await call_api("/wallet/status")
        await send_markdown(
            interaction,
            "\n".join(
                [
                    "**BusinessClaw Finances**",
                    f"Wallet mode: {inline_code(wallet['mode'])}",
                    f"Address: {inline_code(wallet.get('address') or 'not set')}",
                    f"Native balance: {inline_code(wallet.get('native_balance') or 'unknown')}",
                ]
            ),
        )

    @client.event
    async def on_ready():
        if settings.discord_guild_id:
            guild = discord.Object(id=int(settings.discord_guild_id))
            tree.copy_global_to(guild=guild)
            await tree.sync(guild=guild)
        else:
            await tree.sync()
        print(f"BusinessClaw Discord bot logged in as {client.user}")

    await client.start(settings.discord_bot_token)
