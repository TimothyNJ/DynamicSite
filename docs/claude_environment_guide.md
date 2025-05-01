# Claude Environment Access Guide

## User Environment Overview

Timothy uses an M1 MacBook Pro with VS Code, Git Desktop, GitHub, and AWS. While he can use the terminal, he prefers explicit step-by-step instructions that include:
- Specific directories to navigate to
- Full command prompts with exact syntax
- No assumptions about current directory location

## Access Capabilities

As Claude, I have access to:

1. **File System Access**: I can read, write, and modify files in Timothy's environment using file system tools.

2. **Git Repository Access**: I can view, modify, and interact with Git repositories through:
   - Reading Git repository contents
   - Creating and modifying files
   - Committing changes (via executing Git commands)
   - Pushing changes to remote repositories

3. **GitHub Integration**: I can interact with GitHub repositories by:
   - Reading repository content
   - Creating and updating files
   - Creating pull requests
   - Managing issues

4. **AWS Access**: I can read logs and diagnose issues on AWS-hosted development sites.

5. **MCP Integration**: I have access to Model Context Protocol features, which allow me to:
   - Read documentation at https://modelcontextprotocol.io/examples and https://modelcontextprotocol.io/docs/tools/debugging
   - Implement MCP servers and debug their configuration

## Important Paths & Configurations

### Git Repository Location
- Main repository: `/Users/Timothy/Documents/GitFiles`
- Documentation: `/Users/Timothy/Documents/GitFiles/dynamicsite/docs`

### MCP Configuration
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

## Common Workflows

### Viewing Files
```bash
# Navigate to repository
cd /Users/Timothy/Documents/GitFiles

# List files
ls -la
```

### Modifying Files
```bash
# Create or edit files
# Using write_file function

# Commit changes
cd /Users/Timothy/Documents/GitFiles
git add <filename>
git commit -m "Descriptive message about changes"
git push origin <branch>
```

### Checking AWS Logs
```bash
# Use specific functions available to read AWS logs
# Remember to look for error patterns and environment-specific issues
```

## Debugging Approach

1. Check repository structure and documentation files
2. Examine AWS logs for error patterns
3. Verify MCP configuration and logs
4. Test specific components using the MCP Inspector
5. Document findings in the appropriate location

## Documentation Standards

When creating documentation:
1. Use Markdown format
2. Store architectural documentation in `/Users/Timothy/Documents/GitFiles/dynamicsite/docs`
3. Include specific command examples with full paths
4. Assume minimal prior knowledge when writing instructions

## Resources

- MCP Examples: https://modelcontextprotocol.io/examples
- MCP Debugging: https://modelcontextprotocol.io/docs/tools/debugging
- Previous configuration fixes are documented in `/Users/Timothy/Documents/GitFiles/dynamicsite/docs/mcp_git_configuration.md`

Remember: Always provide precise, clear instructions with full paths and commands.
