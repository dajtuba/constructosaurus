# Agent Workflow and Phase Transitions

## Overview

Constructosaurus uses a multi-agent workflow to process construction documents through distinct phases. This document explains how agents coordinate work from raw ideas to completed features.

## Agent Roles

### Work Producer (`workProducer`)
**Purpose**: Transforms raw task ideas into work-ready tasks with full planning

**Responsibilities**:
- Processes raw tasks from backlog
- Creates investigation, design, and implementation subtasks
- Ensures tasks have clear acceptance criteria
- Marks tasks as work-ready when planning complete

**Workflow**:
1. Find raw tasks: `bd list --label raw --status open`
2. Claim task: `bd update <id> --status in_progress`
3. Create subtasks:
   - `investigation:` - Research and analysis
   - `design:` - Architecture and approach
   - `create-subtasks:` - Break down implementation
   - `implement:` - Code implementation tasks
   - `test:` - Verification tasks
   - `review:` - Code review
   - `merge:` - Integration to mainline
4. Add `work-ready` label: `bd update <id> --label work-ready`
5. Close task when planning complete

### Work Consumer (`workConsumer`)
**Purpose**: Orchestrates implementation of work-ready tasks

**Responsibilities**:
- Processes work-ready tasks with subtasks
- Delegates subtasks to specialized agents
- Ensures dependency order is respected
- Validates completion and closes parent tasks

**Workflow**:
1. Find work: `bd list --label work-ready --status open`
2. Claim parent: `bd update <id> --status in_progress`
3. Process subtasks in dependency order:
   - Check dependencies: `bd show <subtask-id>`
   - Delegate to appropriate agent
   - Wait for completion
   - Validate results
4. Close parent when all subtasks complete
5. Loop continuously for next work

### Software Architect (`software-architect`)
**Purpose**: Implements technical work (investigation, design, code, tests)

**Responsibilities**:
- Investigates technical questions
- Designs solutions and architectures
- Implements code changes
- Writes and runs tests
- Reviews code quality

**Workflow**:
1. Receives bead ID from work consumer
2. Reads task and comments: `bd show <id>`
3. Implements solution (minimal code)
4. Runs tests and validates
5. Closes task with reason
6. Returns control to work consumer

## Phase Transitions

### Phase 1: Raw → Work-Ready
**Agent**: Work Producer

```
Raw Task
  ↓
Investigation (research, analysis)
  ↓
Design (architecture, approach)
  ↓
Create Subtasks (break down work)
  ↓
Work-Ready Task (with implementation subtasks)
```

**Transition Criteria**:
- Investigation complete with findings
- Design approved with clear approach
- Implementation subtasks created with acceptance criteria
- All subtasks have proper dependencies
- Task labeled `work-ready`

### Phase 2: Work-Ready → In Progress
**Agent**: Work Consumer

```
Work-Ready Task
  ↓
Claim Parent Task (in_progress)
  ↓
Process Subtasks (delegate to software-architect)
  ↓
Validate Completion
  ↓
Close Parent Task
```

**Transition Criteria**:
- Parent task claimed by work consumer
- Subtasks processed in dependency order
- Each subtask closed with reason
- All tests passing
- Changes committed to git

### Phase 3: Implementation Subtasks
**Agent**: Software Architect (via Work Consumer delegation)

```
Implement Subtask
  ↓
Add Types (src/types.ts)
  ↓
Create Service (src/services/)
  ↓
Write Tests (src/tools/test-*.ts)
  ↓
Build & Verify (npm run build)
  ↓
Close Subtask
```

**Transition Criteria**:
- Types added to src/types.ts
- Service implemented with minimal code
- Tests created and passing
- Build successful
- Subtask closed with descriptive reason

### Phase 4: Review & Merge
**Agent**: Work Consumer (direct git operations)

```
All Subtasks Complete
  ↓
Review Task (verify all work done)
  ↓
Merge Task (git commit)
  ↓
Close Parent (mark complete)
  ↓
Sync (bd sync)
```

**Transition Criteria**:
- All implementation subtasks closed
- All tests passing
- Code committed with conventional commit message
- Parent task closed
- Changes synced to JSONL

## Dependency Management

### Subtask Dependencies
- **implement** tasks can run in parallel (no dependencies)
- **test** tasks depend on their **implement** tasks
- **review** task depends on all **implement** and **test** tasks
- **merge** task depends on **review** task

### Blocking Behavior
- Work consumer checks dependencies before delegating
- Blocked subtasks are skipped until dependencies complete
- `bd blocked` shows all blocked issues
- `bd ready` shows only unblocked work

## Communication Patterns

### Work Consumer → Software Architect
```bash
# Delegate with bead ID
"implement beads-XXX"
"test beads-XXX"
"review beads-XXX"
```

### Software Architect → Work Consumer
```bash
# Close with reason
bd close <id> --reason "Added types, created service, tests passing"

# Ask question (creates investigation bead)
bd comments add <id> "QUESTION: How should we handle edge case X?"
```

### Handling Questions
When implementer has a question:
1. Work consumer detects "QUESTION:" in comments
2. Creates investigation bead as sibling task
3. Delegates investigation to software architect
4. Copies answer back to implementation task
5. Re-delegates implementation with answer

## Best Practices

### For Work Producer
- Create clear acceptance criteria for all subtasks
- Break down large tasks into small, focused subtasks
- Ensure proper dependency chains
- Add `work-ready` label only when planning complete

### For Work Consumer
- Process stale in-progress tasks first (>1 hour old)
- Respect dependency order strictly
- Validate each subtask completion
- Run continuous loop until no work available

### For Software Architect
- Write minimal code to meet acceptance criteria
- Always run tests before closing
- Close with descriptive reasons
- Ask questions early if blocked

## Example: Complete Feature Workflow

```
1. Work Producer finds raw task "Add validation"
   - Creates investigation subtask
   - Creates design subtask
   - Creates create-subtasks subtask
   - Marks work-ready

2. Work Consumer picks up "Add validation"
   - Delegates investigation to software-architect
   - Waits for completion
   - Delegates design to software-architect
   - Waits for completion
   - Delegates create-subtasks to software-architect
   - Software architect creates:
     * implement: Add validation types
     * implement: Create validation service
     * implement: Add validation rules
     * test: Test validation service
     * review: Review all validation code
     * merge: Merge to mainline

3. Work Consumer processes implementation subtasks
   - Delegates "Add validation types" to software-architect
     * Adds types to src/types.ts
     * Closes subtask
   - Delegates "Create validation service" to software-architect
     * Creates src/services/validation-service.ts
     * Closes subtask
   - Delegates "Add validation rules" to software-architect
     * Creates src/services/validation-rules.ts
     * Closes subtask
   - Delegates "Test validation service" to software-architect
     * Creates src/tools/test-validation.ts
     * Runs tests
     * Closes subtask
   - Delegates "Review all validation code" to software-architect
     * Reviews implementation
     * Closes subtask

4. Work Consumer handles merge
   - Runs git commit with conventional message
   - Closes merge subtask
   - Closes parent task
   - Runs bd sync

5. Work Consumer loops to find next work
```

## Monitoring and Debugging

### Check Work Status
```bash
bd ready                    # Show available work
bd list --status in_progress  # Show active work
bd blocked                  # Show blocked issues
bd stats                    # Project statistics
```

### Debug Stuck Work
```bash
bd show <id>                # See dependencies and blockers
bd comments list <id>       # Check for questions
bd list --parent <id>       # See subtask status
```

### Recovery
```bash
bd update <id> --status open  # Reset stuck task
bd dep remove <id> <dep>      # Remove bad dependency
bd sync                       # Sync state
```

## Summary

The agent workflow ensures:
- **Clear separation of concerns**: Planning vs. implementation
- **Dependency management**: Work happens in correct order
- **Continuous flow**: Agents loop until no work available
- **Quality gates**: Tests and review before merge
- **Traceability**: All work tracked in beads system

This workflow enables autonomous, continuous development with minimal human intervention.
