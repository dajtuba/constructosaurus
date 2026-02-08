---
name: git-commit-message
description: Standards for writing clear, conventional git commit messages. Use when committing code changes.
---

# Git Commit Messages

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling

## Scope

Optional, indicates what part of codebase:
- `vision`: Vision AI processing
- `search`: Search engine
- `mcp`: MCP server
- `processing`: Document processing
- `storage`: Database/storage

## Subject

- Use imperative mood ("add" not "added")
- No period at end
- Max 50 characters
- Lowercase first letter

## Body

- Wrap at 72 characters
- Explain what and why, not how
- Separate from subject with blank line

## Examples

```
feat(vision): add CAD drawing analysis with Claude Vision

Implements vision-based analysis of construction drawings using
Claude's vision API. Extracts structural details, dimensions, and
material specifications from CAD PDFs.

fix(search): correct reranking score calculation

The reranking service was using raw scores instead of normalized
scores, causing incorrect result ordering.

docs: update MCP setup instructions

chore(deps): upgrade @anthropic-ai/sdk to 0.32.1
```
