# Bug Fix Planning

## Metadata
description: "Create implementation plan to fix a bug"

## Purpose
Create a detailed plan to diagnose and fix a bug. Focus on root cause analysis and preventing regressions.

## Variables
issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

IMPORTANT: You are writing a PLAN to fix a bug, not fixing it.

- Extract bug details from `issue_json`
- Understand the expected vs actual behavior
- Plan diagnosis steps before jumping to solutions
- Ensure fix doesn't introduce regressions
- Include tests to prevent bug from recurring

## Workflow

1. Parse the issue JSON
   - Extract bug description
   - Identify expected behavior
   - Identify actual (broken) behavior
   - Note reproduction steps if provided

2. Research the codebase
   - Locate relevant files and functions
   - Understand the code path involved
   - Check for similar bugs or patterns
   - Review recent changes that may have introduced bug

3. Plan diagnosis
   - Steps to reproduce the bug
   - Tools and techniques to investigate
   - Hypotheses about root cause

4. Design the fix
   - Identify root cause
   - Plan minimal change to fix issue
   - Consider edge cases and side effects
   - Plan tests to prevent regression

5. Write the plan file
   - Use exact format below
   - Save to: `specs/issue-{issue_number}-adw-{adw_id}-bugfix-{descriptive-name}.md`

## Plan Format

```markdown
# Bug Fix: <bug title>

## Metadata
issue_number: {issue_number}
adw_id: {adw_id}
issue_json: {issue_json}

## Bug Description
<Detailed description of the bug>

## Expected Behavior
<What should happen>

## Actual Behavior
<What currently happens (broken behavior)>

## Reproduction Steps
1. <Step to reproduce>
2. <Another step>
3. <Bug occurs>

## Root Cause Analysis
<Hypothesis about what's causing the bug>

## Relevant Files
<List files involved in the bug>

## Fix Plan

### Phase 1: Diagnosis
<Steps to confirm root cause>

### Phase 2: Implementation
<Steps to fix the bug>

### Phase 3: Testing
<Steps to verify fix and prevent regression>

## Step by Step Tasks

### Task 1: Reproduce Bug
- <Steps to reliably reproduce>

### Task 2: Diagnose Root Cause
- <Investigation steps>

### Task 3: Implement Fix
- <Specific code changes>

### Task 4: Add Regression Tests
- <Tests to prevent bug from recurring>

### Task 5: Validation
- Run all validation commands
- Verify bug is fixed
- Confirm no regressions

## Testing Strategy

### Reproduction Test
<Test that fails before fix, passes after>

### Regression Tests
<Tests to ensure bug doesn't come back>

### Related Tests
<Existing tests that should still pass>

## Acceptance Criteria
- <Bug is fixed>
- <No regressions introduced>
- <Tests prevent future occurrence>

## Validation Commands

```bash
# Verify fix works
npm run test
npm run build
# Add specific commands to test the fix
```

## Notes
<Optional: Context about the bug, related issues, etc.>
```

## Report

Return exclusively the path to the plan file created.

Example: `specs/issue-123-adw-a1b2c3d4-bugfix-login-error.md`
