# Model Setup

OpenClaw is installed and BusinessClaw agents are registered, but the local setup still needs model authentication before the agents can think.

Current status:

```text
openclaw models status
```

reported missing OpenAI auth for the default model.

## Cheapest Local/Dev Default

For local development and low-cost routine work, keep the default on:

```powershell
openclaw models set openai/gpt-5-nano
```

As of June 5, 2026, OpenAI lists `gpt-5-nano` as the cheapest OpenAI text model by input price.

## Option 1: OpenAI

```powershell
$env:OPENAI_API_KEY="..."
openclaw models auth login --provider openai
openclaw models status
openclaw gateway restart
```

## Option 2: OpenRouter

OpenClaw includes an OpenRouter provider. Configure it through:

```powershell
openclaw configure
```

or use the relevant `openclaw models` command once you choose the provider/model.

## Option 3: Local Model

OpenClaw includes local/provider plugins such as LM Studio, Ollama, vLLM, and LiteLLM.

Use:

```powershell
openclaw models list
openclaw configure
```

Then select the provider and model.

## Verification

```powershell
openclaw models status
openclaw agent --message "BusinessClaw status check: introduce yourself briefly."
```
