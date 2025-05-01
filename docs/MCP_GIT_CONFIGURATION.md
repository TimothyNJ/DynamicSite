# Git MCP Server Configuration Guide

## Setup Requirements

This repository serves as a Git repository for the Model Context Protocol (MCP) Git server. The following setup was required to make it work properly:

### 1. Architecture Compatibility (For M1/M2 Macs)

The Python MCP server requires ARM64 compatibility for Apple Silicon Macs. This was fixed by:

- Installing specific versions of pydantic and pydantic-core compatible with Python 3.13:
  ```bash
  pip install --force-reinstall "pydantic>=2.8.0"
  ```
- Using the `arch -arm64` command prefix for proper architecture support

### 2. Repository Configuration

This directory must be initialized as a valid Git repository:
```bash
cd /Users/Timothy/Documents/GitFiles
git init
```

### 3. Correct MCP Configuration

The correct configuration for the Git server in the Claude Desktop Settings:

```json
"git": {
  "command": "arch",
  "args": [
    "-arm64",
    "python",
    "-m",
    "mcp_server_git",
    "-r",
    "/Users/Timothy/Documents/GitFiles"
  ],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN"
  }
}
```

### Notes

- The NPM package `@modelcontextprotocol/server-git` mentioned in some documentation doesn't exist in the registry.
- The Python module `mcp_server_git` uses `-r` for specifying repositories, not `--repository` or `--allow-push`.
- Check logs at `~/Library/Logs/Claude/mcp-server-git.log` for debugging issues.

Last updated: April 30, 2025
