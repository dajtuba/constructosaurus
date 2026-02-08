---
name: logging-issues
description: Guide for logging discovered work as Beads issues. Use when finding new work, bugs, or improvements during implementation.
---

# Logging Issues

## When to Use

Use this skill when you discover:
- New work that's out of scope for current task
- Bugs or issues that need fixing
- Improvements or optimizations
- Technical debt
- Missing documentation

## Quick Capture

For quick ideas without full context:
```bash
bd q "task idea or bug description"
```

## Full Issue Creation

For well-defined work:
```bash
bd create "Title" \
  --description "Detailed description" \
  --priority 0-4 \
  --type feature|bug|task|epic \
  --labels design|implementation|review
```

## Priority Levels

- **P0**: Critical, blocks progress
- **P1**: High priority, should do soon
- **P2**: Medium priority, normal work
- **P3**: Low priority, nice to have
- **P4**: Backlog, future consideration

## Dependencies

Link related work:
```bash
bd dep add <blocked-id> <blocker-id>  # blocker-id blocks blocked-id
```

## Best Practices

1. **Capture immediately**: Don't lose context
2. **Be specific**: Clear titles and descriptions
3. **Set priority**: Help with triage
4. **Link dependencies**: Show relationships
5. **Add labels**: Indicate phase (design/implementation/review)
