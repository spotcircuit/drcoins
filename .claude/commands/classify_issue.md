# Classify GitHub Issue

## Metadata
description: "Classify GitHub issue as feature, bug, or chore"

## Purpose
Analyze a GitHub issue and classify it into one of three types: feature, bug, or chore. Return the corresponding slash command.

## Variables
issue_json: $1

## Workflow

1. Parse the issue JSON
   - Extract title and body fields
   - Read the full description

2. Analyze the issue content
   - Look for keywords and patterns
   - Understand the intent and scope
   - Consider what type of work is being requested

3. Classify based on these rules
   - **Feature** (`/feature`): New functionality, enhancements, user stories, capabilities
     - Keywords: "add", "create", "implement", "new", "feature", "enhance", "user can"
     - Examples: "Add email ingestion", "Implement task board", "Create PDF parser"

   - **Bug** (`/bug`): Defects, errors, broken behavior, regressions
     - Keywords: "fix", "bug", "error", "broken", "not working", "crash", "issue"
     - Examples: "Fix login error", "Parser crashes on large PDFs", "Button not clickable"

   - **Chore** (`/chore`): Maintenance, refactoring, documentation, dependencies, config
     - Keywords: "refactor", "update", "upgrade", "documentation", "cleanup", "config", "deps"
     - Examples: "Update dependencies", "Refactor parser", "Add documentation", "Configure CI"

4. When uncertain
   - Default to `/feature` for new work
   - Default to `/bug` if describing something broken
   - Default to `/chore` for internal improvements

## Report

Return exclusively one of these slash commands with no additional text:
- `/feature`
- `/bug`
- `/chore`
