# Ulak CLI Reference

Live sources when anything looks stale: `ulak --help`, `ulak <command> --help`,
https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/reference/cli-commands

### Global Flags

```
ulak [flags] [command]        (no subcommand = interactive chat)

  --version, -V             Show version
  -z, --oneshot PROMPT      One-shot: print ONLY the final response (for scripts/pipes)
  -m MODEL  --provider P    Model/provider override for this invocation
  -t, --toolsets LIST       Comma-separated toolsets for this invocation
  --resume, -r SESSION      Resume session by ID or title
  --continue, -c [NAME]     Resume by name, or most recent session
  --worktree, -w            Isolated git worktree mode (parallel agents)
  --skills, -s SKILL        Preload skills (comma-separate or repeat)
  --profile, -p NAME        Use a named profile
  --yolo                    Skip dangerous command approval
  --tui / --cli             Force the Ink TUI / classic REPL
  --ignore-rules            Skip AGENTS.md/SOUL.md/memory/skill injection
  --safe-mode               Disable ALL customizations (troubleshooting)
  --pass-session-id         Include session ID in system prompt
```

### Chat

```
ulak chat [flags]
  -q, --query TEXT          Single query, non-interactive
  --image PATH              Attach a local image to a single query
  -Q, --quiet               Suppress banner, spinner, tool previews
  --checkpoints             Enable filesystem checkpoints (/rollback)
  --max-turns N             Cap tool-calling iterations
  --source TAG              Session source tag (default: cli)
```
(plus the global flags above)

### Configuration

```
ulak setup [section]      Wizard (model|tts|terminal|gateway|tools|agent)
ulak model                Interactive model/provider picker
ulak fallback [add|remove|list]  Fallback provider chain
ulak config [show|edit|get|set|unset|path|env-path|check|migrate]
ulak login / logout       OAuth sign-in / clear stored auth
ulak doctor [--fix]       Check dependencies and config
ulak status [--all]       Component status
```

### Tools & Skills

```
ulak tools [list|enable NAME|disable NAME]   Per-platform toolsets (curses UI with no args)

ulak skills list|browse|search QUERY|inspect ID
ulak skills install ID    Hub identifier OR a direct https://…/SKILL.md URL
ulak skills config        Enable/disable skills per platform
ulak skills check|update|uninstall|publish PATH
ulak skills tap add REPO  Add a GitHub repo as a skill source
ulak bundles              Skill bundles (one /<name> alias loads several skills)
```

### MCP Servers

```
ulak mcp add NAME (--url or --command) | remove | list | test NAME
ulak mcp catalog | install NAME     Curated catalog install
ulak mcp configure NAME             Toggle tool selection
ulak mcp serve                      Run Ulak as an MCP server
```
Details (transport, tool discovery, catalog): `references/native-mcp.md`.

### Gateway (Messaging Platforms)

```
ulak gateway run|install|start|stop|restart|status|setup
```

20+ platforms: Telegram, Discord, Slack, WhatsApp (Baileys + Business Cloud API), iMessage (Photon — `ulak photon setup`), Signal, Email, SMS, Matrix, Mattermost, Teams, LINE, SimpleX, ntfy, Google Chat, Home Assistant, DingTalk, Feishu, WeCom, Weixin, API Server, Webhooks. Open WebUI connects via the API Server adapter. Most adapters ship under `plugins/platforms/`.
Docs: https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/user-guide/messaging/

### Sessions

```
ulak sessions list|browse|rename ID TITLE|delete ID|export OUT|prune|stats
```

### Cron / Webhooks

```
ulak cron list|create SCHED|edit ID|pause|resume|run ID|remove|status
    Schedules: '30m', 'every 2h', '0 9 * * *', ISO timestamp
ulak webhook subscribe NAME|list|remove NAME|test NAME
```
Webhook payloads/routes: `references/webhooks.md`.

### Profiles

```
ulak profile list|create NAME (--clone|--clone-all|--clone-from)|use|show|delete
ulak profile rename A B | alias NAME | export NAME | import FILE
```

### Credentials & Pools

```
ulak auth                 Interactive credential manager
ulak auth add [PROVIDER]  Add OAuth or API-key credential (nous, openai-codex, qwen-oauth, …)
ulak auth list|remove P IDX|reset PROVIDER|status
```
Multiple credentials per provider form a pool that rotates automatically and skips exhausted keys.

### Other

```
ulak desktop / gui        Native desktop app
ulak dashboard            Web admin panel + embedded chat (--stop / --status)
ulak proxy                OpenAI-compatible local proxy backed by an OAuth provider
ulak portal               Quick setup / sign in via Nous Portal
ulak kanban <verb>        Multi-agent work-queue board
ulak project              Named multi-folder workspaces
ulak skin list|use|set    Switch/tweak skins (see references/themes.md)
ulak pets <verb>          Pet mascots (see references/petdex.md)
ulak memory setup|status|off|reset   Memory provider
ulak secrets bitwarden|onepassword   External secret stores
ulak moa                  Mixture-of-Agents slots
ulak hooks / security / backup / import / checkpoints / console
ulak logs [-f] [errors]   View agent/error logs
ulak send                 One-off message through a gateway platform
ulak pairing / plugins / insights / journey / computer-use
ulak acp                  ACP server (IDE integration)
ulak completion bash|zsh|fish
ulak update / uninstall / claw migrate
```

Plugin- and provider-supplied subcommands (e.g. `ulak photon setup`) only appear once their plugin is installed/active.

### Where to Find Things

| Looking for... | Location |
|---|---|
| Config options | `ulak config edit` · [Configuration docs](https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/user-guide/configuration) |
| Tools / toolsets | `ulak tools list` · [Tools reference](https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/reference/tools-reference) |
| Skills catalog | `ulak skills browse` · [Skills catalog](https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/reference/skills-catalog) |
| Provider setup | `ulak model` · [Providers guide](https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/integrations/providers) |
| Env variables | `ulak config env-path` · [Env vars reference](https://ulak-agent.github.com/ErkanOzdemir-Labs/docs/reference/environment-variables) |
| Gateway logs | `~/.ulak/logs/gateway.log` (or `ulak logs`) |
| Sessions | `ulak sessions browse` (reads state.db) |
