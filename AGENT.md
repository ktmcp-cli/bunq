# AGENT.md — bunq CLI for AI Agents

This document explains how to use the bunq CLI as an AI agent.

## Overview

The `bunq` CLI provides access to the bunq API.

## Authentication

Set your API key before use:

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
# List resources of a type
bunq resources list <type>

# Get a specific resource
bunq resources get <type> <id>
```

## JSON Output

Always use `--json` when parsing results programmatically:

```bash
bunq resources list items --json
bunq resources get items 123 --json
```

## Error Handling

The CLI exits with code 1 on error. Common errors:

- `Authentication failed` — Check your API key
- `Resource not found` — Check the ID is correct
- `Rate limit exceeded` — Wait before retrying

## Tips for Agents

1. Always use `--json` when you need to parse results
2. Set the API key via `config set` before making any API calls
3. Handle errors gracefully and check exit codes
