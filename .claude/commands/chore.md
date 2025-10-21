# Chore Planning

## Metadata
description: "Create implementation plan for maintenance task"

## Purpose
Create a plan for maintenance work like refactoring, documentation, dependency updates, or infrastructure improvements.

## Variables
issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

IMPORTANT: You are writing a PLAN for a maintenance task, not implementing it.

- Extract chore details from `issue_json`
- Chores improve internal quality without changing external behavior
- Focus on maintainability, performance, or developer experience
- Ensure changes don't break existing functionality

## Workflow

1. Parse the issue JSON
   - Extract maintenance task description
   - Understand the goal (cleaner code, better docs, updated deps, etc.)
   - Identify why this work is valuable

2. Research the codebase
   - Understand current state
   - Identify what needs improvement
   - Check dependencies and related systems
   - Review best practices for this type of work

3. Plan the work
   - Define clear scope (what to change, what to leave alone)
   - Break into manageable steps
   - Plan how to verify nothing breaks
   - Consider impact on other developers

4. Write the plan file
   - Use exact format below
   - Save to: `specs/issue-{issue_number}-adw-{adw_id}-chore-{descriptive-name}.md`

## Plan Format

```markdown
# Chore: <chore title>

## Metadata
issue_number: {issue_number}
adw_id: {adw_id}
issue_json: {issue_json}

## Chore Description
<Detailed description of the maintenance work>

## Motivation
<Why is this work valuable?>
<What problem does it solve?>
<How does it improve the codebase?>

## Current State
<Describe what exists now>

## Desired State
<Describe what it should look like after>

## Relevant Files
<List files that will be modified>

### New Files
<List new files that will be created (if any)>

## Implementation Plan

### Phase 1: Preparation
<Any setup work needed>

### Phase 2: Core Changes
<Main implementation work>

### Phase 3: Validation
<Verify nothing broke>

## Step by Step Tasks

### Task 1: <First Task>
- <Specific steps>

### Task 2: <Second Task>
- <More steps>

<Continue with tasks>

### Final Task: Validation
- Run all validation commands
- Verify zero regressions
- Confirm improvements work as expected

## Testing Strategy

### Existing Tests
<All existing tests should still pass>

### New Tests (if applicable)
<Any new tests needed>

## Acceptance Criteria
- <Specific criterion 1>
- <Specific criterion 2>
- <All existing functionality still works>

## Validation Commands

Execute every command to validate changes work correctly with zero regressions.

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

## Notes
<Optional: Additional context, links to docs, future considerations>
```

## Report

Return exclusively the path to the plan file created.

Example: `specs/issue-123-adw-a1b2c3d4-chore-update-dependencies.md`
