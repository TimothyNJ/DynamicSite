# MCP Git Usage Guide for Claude

## Understanding MCP Git Access

As Claude, I have direct access to Git repositories through specialized MCP tools instead of relying on shell scripts or terminal commands. This guide documents how to correctly use these tools for future reference.

## Available Git Functions

The MCP Git integration provides these key functions:

1. **Reading Repository State**
   - `git_status` - Show repository status
   - `git_log` - View commit history
   - `git_diff` - Show changes between commits, branches, etc.
   - `git_diff_staged` - Show staged changes
   - `git_diff_unstaged` - Show unstaged changes
   - `git_show` - View specific commit content

2. **Making Changes**
   - `git_add` - Stage files for commit
   - `git_commit` - Create a new commit
   - `git_reset` - Unstage changes

3. **Branch Management**
   - `git_checkout` - Switch branches
   - `git_create_branch` - Create a new branch

## Correct Usage Examples

### Checking Repository Status

```
<function_calls>
<invoke name="git_status">
<parameter name="repo_path">/Users/Timothy/Documents/GitFiles