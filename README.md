> "Six months ago, everyone was talking about MCPs. And I was like, screw MCPs. Every MCP would be better as a CLI."
>
> — [Peter Steinberger](https://twitter.com/steipete), Founder of OpenClaw
> [Watch on YouTube (~2:39:00)](https://www.youtube.com/@lexfridman) | [Lex Fridman Podcast #491](https://lexfridman.com/peter-steinberger/)

# bunq CLI

A command-line interface for the bunq API. Access banking, payments, and account data from your terminal.

> **Disclaimer**: This is an unofficial CLI tool and is not affiliated with, endorsed by, or supported by bunq.

## Features

- **Resource Management** — List, get, create, update, and delete resources
- **JSON output** — All commands support `--json` for scripting and piping
- **Colorized output** — Clean, readable terminal output

## Why CLI > MCP

MCP servers are complex, stateful, and require a running server process. A CLI is:

- **Simpler** — Just a binary you call directly
- **Composable** — Pipe output to `jq`, `grep`, `awk`, and other tools
- **Scriptable** — Use in shell scripts, CI/CD pipelines, cron jobs
- **Debuggable** — See exactly what's happening with `--json` flag
- **AI-friendly** — AI agents can call CLIs just as easily as MCPs, with less overhead

## Installation

```bash
npm install -g @ktmcp-cli/bunq
```

## Authentication

Set your API key:

```bash
bunq config set --api-key YOUR_API_KEY
```

## Commands

### Configuration

```bash
# Set API key
bunq config set --api-key <key>

# Show configuration
bunq config show
```

### Resources

```bash
# List resources
bunq resources list <type>

# Get specific resource
bunq resources get <type> <id>

# JSON output
bunq resources list <type> --json
```

## Examples

```bash
# List all resources
bunq resources list items --json

# Get a specific item
bunq resources get items 123 --json
```

## Contributing

Issues and pull requests are welcome at [github.com/ktmcp-cli/bunq](https://github.com/ktmcp-cli/bunq).

## License

MIT — see [LICENSE](LICENSE) for details.

---

Part of the [KTMCP CLI](https://killthemcp.com) project — replacing MCPs with simple, composable CLIs.


---

## Support KTMCP

If you find this CLI useful, we'd greatly appreciate your support! Share your experience on:
- Reddit
- Twitter/X
- Hacker News

**Incentive:** Users who can demonstrate that their support/advocacy helped advance KTMCP will have their feature requests and issues prioritized.

Just be mindful - these are real accounts and real communities. Authentic mentions and genuine recommendations go a long way!

## Support This Project

If you find this CLI useful, we'd appreciate support across Reddit, Twitter, Hacker News, or Moltbook. Please be mindful - these are real community accounts. Contributors who can demonstrate their support helped advance KTMCP will have their PRs and feature requests prioritized.
