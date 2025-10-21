# Feature Planning

## Metadata
description: "Create implementation plan for new feature"

## Purpose
Create a detailed implementation plan for a new feature. Follow the exact Plan Format below to ensure the implementing agent has everything needed to build successfully.

## Variables
issue_number: $1
adw_id: $2
issue_json: $3

## Instructions

IMPORTANT: You are writing a PLAN to implement a feature, not implementing it.

- Extract feature details from `issue_json` (parse JSON, use title and body fields)
- The plan will be used by another agent to implement the code
- Research the codebase to understand existing patterns before planning
- Follow existing conventions - don't reinvent the wheel
- Design for extensibility and maintainability
- Break down complex tasks into clear, ordered steps
- If new libraries are needed, note them in the plan

## Workflow

1. Parse the issue JSON
   - Extract title and body
   - Understand feature requirements
   - Identify user value and business goal

2. Research existing codebase
   - Read README.md first
   - Look for similar features or patterns
   - Understand tech stack and architecture
   - Identify which files/modules are relevant

3. Design the solution
   - Define clear problem and solution statements
   - Plan phases: Foundation → Core → Integration
   - List specific files to create or modify
   - Identify dependencies and libraries needed

4. Create implementation tasks
   - Order tasks logically (shared/foundation first)
   - Be specific about what to do in each task
   - Include testing throughout (not just at end)
   - Plan validation commands to verify success

5. Write the plan file
   - Use exact format specified below
   - Fill every placeholder with detailed content
   - Save to: `specs/issue-{issue_number}-adw-{adw_id}-plan-{descriptive-name}.md`
   - {descriptive-name} = short kebab-case name (e.g., "email-ingestion", "task-board")

## Plan Format

```markdown
# Feature: <feature name>

## Metadata
issue_number: {issue_number}
adw_id: {adw_id}
issue_json: {issue_json}

## Feature Description
<Describe the feature in detail, including purpose and value to users>

## User Story
As a <type of user>
I want to <action/goal>
So that <benefit/value>

## Problem Statement
<Clearly define the specific problem or opportunity this feature addresses>

## Solution Statement
<Describe the proposed solution approach and how it solves the problem>

## Relevant Files

<List files relevant to implementation with brief explanation>

### New Files
<List new files that need to be created>

## Implementation Plan

### Phase 1: Foundation
<Describe foundational work needed before main implementation>

### Phase 2: Core Implementation
<Describe main implementation work for the feature>

### Phase 3: Integration
<Describe how feature integrates with existing functionality>

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### Task 1: <First Task>
- Specific sub-task
- Another sub-task
- Be very clear about what to do

### Task 2: <Second Task>
- More specific steps
- Continue ordering logically

<Continue with h3 headers for each major task>

### Final Task: Validation
- Run all validation commands below
- Verify zero regressions
- Confirm feature works as expected

## Testing Strategy

### Unit Tests
<Describe unit tests needed>

### Integration Tests
<Describe integration tests needed>

### Edge Cases
<List edge cases to test>

## Acceptance Criteria
- <Specific measurable criterion 1>
- <Specific measurable criterion 2>
- <Continue with all success criteria>

## Validation Commands

Execute every command to validate the feature works correctly with zero regressions.

```bash
# Example validation commands:
npm run type-check
npm run lint
npm run test
npm run build
```

<List specific commands for this project>

## Notes
<Optional: Additional context, future considerations, or helpful information>
```

## Report

Return exclusively the path to the plan file created and nothing else.

Example: `specs/issue-123-adw-a1b2c3d4-plan-email-ingestion.md`
