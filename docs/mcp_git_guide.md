# MCP Git Guide for Claude

## Overview

This comprehensive guide explains how to use Git through Model Context Protocol (MCP) with Claude. It covers configuration requirements, available functions, usage examples, and troubleshooting tips.

## Configuration Requirements

### System Setup (For M1/M2 Macs)

The Python MCP server requires ARM64 compatibility for Apple Silicon Macs:

```bash
# Install compatible pydantic versions
pip install --force-reinstall "pydantic>=2.8.0"

# Always use arch -arm64 prefix for commands
```

### Repository Configuration

Ensure your Git repository is properly initialized:
```bash
cd /Users/Timothy/Documents/GitFiles
git init
```

### MCP Configuration

The correct configuration for the Git server in Claude Desktop Settings:

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

## Available Git Functions

### Reading Repository State
- `git_status` - Shows the working tree status
- `git_log` - Shows commit logs
- `git_diff` - Shows differences between branches or commits
- `git_diff_staged` - Shows changes staged for commit
- `git_diff_unstaged` - Shows changes in working directory not yet staged
- `git_show` - Shows contents of a specific commit

### Making Changes
- `git_add` - Adds file contents to staging area
- `git_commit` - Records changes to repository
- `git_reset` - Unstages all staged changes

### Branch Management
- `git_checkout` - Switches branches
- `git_create_branch` - Creates a new branch from optional base branch

## Usage Examples

### Checking Repository Status
```
git_status(repo_path="/Users/Timothy/Documents/GitFiles")
```

### Viewing Commit History
```
git_log(repo_path="/Users/Timothy/Documents/GitFiles", max_count=5)
```

### Viewing Changes
```
git_diff_unstaged(repo_path="/Users/Timothy/Documents/GitFiles")
git_diff_staged(repo_path="/Users/Timothy/Documents/GitFiles")
git_diff(repo_path="/Users/Timothy/Documents/GitFiles", target="HEAD~1")
```

### Making Changes
```
git_add(repo_path="/Users/Timothy/Documents/GitFiles", files=["file1.txt", "file2.md"])
git_commit(repo_path="/Users/Timothy/Documents/GitFiles", message="Update documentation")
git_reset(repo_path="/Users/Timothy/Documents/GitFiles")
```

### Branch Management
```
git_create_branch(repo_path="/Users/Timothy/Documents/GitFiles", branch_name="feature/new-docs")
git_checkout(repo_path="/Users/Timothy/Documents/GitFiles", branch_name="feature/new-docs")
```

## Important Notes

- The NPM package `@modelcontextprotocol/server-git` mentioned in some documentation doesn't exist in the registry.
- The Python module `mcp_server_git` uses `-r` for specifying repositories, not `--repository` or `--allow-push`.
- Check logs at `~/Library/Logs/Claude/mcp-server-git.log` for debugging issues.

## Environment Information

### Important Paths
- Main repository: `/Users/Timothy/Documents/GitFiles`
- Documentation: `/Users/Timothy/Documents/GitFiles/dynamicsite/docs`

### User Environment
Timothy uses an M1 MacBook Pro with VS Code, Git Desktop, GitHub, and AWS. Provide explicit step-by-step instructions that include:
- Specific directories to navigate to
- Full command prompts with exact syntax
- No assumptions about current directory location

## Documentation Standards

When creating documentation:
1. Use Markdown format
2. Store architectural documentation in `/Users/Timothy/Documents/GitFiles/dynamicsite/docs`
3. Include specific command examples with full paths
4. Assume minimal prior knowledge when writing instructions

## Resources

- MCP Examples: https://modelcontextprotocol.io/examples
- MCP Debugging: https://modelcontextprotocol.io/docs/tools/debugging

Last updated: April 30, 2025
