#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Plan Optimized - Example workflow with ECE integration

This demonstrates the hybrid TAC + ECE approach:
- TAC: Automated SDLC workflow structure
- ECE: Context optimization with output styles and handoff

Key Improvements:
1. Output style "concise-ultra" reduces planning output by 90%
2. Context handoff saves only essential data for next phase
3. Metrics tracking shows optimization effectiveness

Usage:
  uv run adw_plan_optimized_example.py <issue-number>

Compare:
  - Original: adw_plan_iso.py (no optimization)
  - Optimized: adw_plan_optimized_example.py (with ECE)
"""

import sys
import os
import time
import logging
from typing import Optional
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import (
    fetch_issue,
    make_issue_comment,
    get_repo_url,
    extract_repo_path,
)
from adw_modules.workflow_ops import (
    classify_issue,
    build_plan,
    generate_branch_name,
    create_commit,
    format_issue_message,
    ensure_adw_id,
    AGENT_PLANNER,
)
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.data_types import GitHubIssue, IssueClassSlashCommand, AgentTemplateRequest
from adw_modules.agent import execute_template
from adw_modules.worktree_ops import (
    create_worktree,
    validate_worktree,
    get_ports_for_adw,
    is_port_available,
    find_next_available_ports,
    setup_worktree_environment,
)

# ECE Integration imports
from adw_modules.context_handoff import ContextHandoff
from adw_modules.metrics import WorkflowMetrics, record_phase_metrics


def main():
    """Main entry point with ECE optimization."""
    # Load environment variables
    load_dotenv()

    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_plan_optimized_example.py <issue-number>")
        sys.exit(1)

    issue_number = sys.argv[1]
    adw_id = ensure_adw_id(issue_number, None, None)

    # Initialize ECE components
    handoff = ContextHandoff(adw_id)
    metrics = WorkflowMetrics(adw_id)

    # Load state
    state = ADWState.load(adw_id, None)
    if not state.get("adw_id"):
        state.update(adw_id=adw_id)
    state.append_adw_id("adw_plan_optimized")

    # Set up logger
    logger = setup_logger(adw_id, "adw_plan_optimized")
    logger.info(f"🎯 ADW Plan Optimized (ECE Integration) - ID: {adw_id}, Issue: {issue_number}")

    # Validate environment
    check_env_vars(logger)

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        repo_path = extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Setup worktree (TAC infrastructure)
    valid, error = validate_worktree(adw_id, state)
    if valid:
        worktree_path = state.get("worktree_path")
        backend_port = state.get("backend_port")
        frontend_port = state.get("frontend_port")
    else:
        backend_port, frontend_port = get_ports_for_adw(adw_id)
        if not (is_port_available(backend_port) and is_port_available(frontend_port)):
            backend_port, frontend_port = find_next_available_ports(adw_id)

        state.update(backend_port=backend_port, frontend_port=frontend_port)
        state.save("adw_plan_optimized")

    # Fetch issue details
    issue: GitHubIssue = fetch_issue(issue_number, repo_path)

    logger.info("📝 Classifying issue with optimization...")
    make_issue_comment(
        issue_number, format_issue_message(adw_id, "ops", "✅ Starting optimized planning (ECE)")
    )

    # PHASE 1: Classify Issue (with ECE optimization)
    start_time = time.time()

    classify_request = AgentTemplateRequest(
        agent_name="classifier",
        slash_command="/classify_issue",
        args=[issue_number, adw_id, issue.model_dump_json(by_alias=True)],
        adw_id=adw_id,
        output_style="concise-ultra"  # ECE: Minimal output for classification
    )

    classify_response = execute_template(classify_request)

    # Record metrics
    record_phase_metrics(
        adw_id=adw_id,
        phase="classify",
        response=classify_response,
        start_time=start_time,
        output_style="concise-ultra"
    )

    if not classify_response.success:
        logger.error(f"Error classifying issue: {classify_response.output}")
        sys.exit(1)

    issue_command = classify_response.output.strip()
    state.update(issue_class=issue_command)
    state.save("adw_plan_optimized")

    logger.info(f"✅ Issue classified as: {issue_command}")

    # PHASE 2: Generate Branch Name (with ECE optimization)
    start_time = time.time()

    branch_request = AgentTemplateRequest(
        agent_name="branch_gen",
        slash_command="/generate_branch_name",
        args=[issue_number, adw_id, issue.model_dump_json(by_alias=True), issue_command],
        adw_id=adw_id,
        output_style="concise-done"  # ECE: Just need the branch name
    )

    branch_response = execute_template(branch_request)

    record_phase_metrics(
        adw_id=adw_id,
        phase="branch_gen",
        response=branch_response,
        start_time=start_time,
        output_style="concise-done"
    )

    if not branch_response.success:
        logger.error(f"Error generating branch name: {branch_response.output}")
        sys.exit(1)

    branch_name = branch_response.output.strip()
    state.update(branch_name=branch_name)
    state.save("adw_plan_optimized")

    # Create worktree if needed
    if not valid:
        worktree_path, error = create_worktree(adw_id, branch_name, logger)
        if error:
            logger.error(f"Error creating worktree: {error}")
            sys.exit(1)

        state.update(worktree_path=worktree_path)
        state.save("adw_plan_optimized")

        setup_worktree_environment(worktree_path, backend_port, frontend_port, logger)

    logger.info(f"🌳 Worktree: {worktree_path}")

    # PHASE 3: Build Plan (with ECE optimization)
    logger.info("📋 Building implementation plan with optimization...")

    start_time = time.time()

    # Use context handoff - pass minimal context from previous phases
    plan_context = handoff.load_for_phase("plan")

    plan_request = AgentTemplateRequest(
        agent_name=AGENT_PLANNER,
        slash_command=issue_command,  # /chore, /bug, or /feature
        args=[issue_number, adw_id, issue.model_dump_json(by_alias=True)],
        adw_id=adw_id,
        working_dir=worktree_path,
        output_style="concise-ultra",  # ECE: Plan goes in file, not output
        context_handoff=plan_context  # ECE: Minimal context from classify/branch phases
    )

    plan_response = execute_template(plan_request)

    record_phase_metrics(
        adw_id=adw_id,
        phase="plan",
        response=plan_response,
        start_time=start_time,
        output_style="concise-ultra"
    )

    if not plan_response.success:
        logger.error(f"Error building plan: {plan_response.output}")
        sys.exit(1)

    plan_file_path = plan_response.output.strip()

    # Validate plan file exists
    if not plan_file_path or not os.path.exists(os.path.join(worktree_path, plan_file_path)):
        logger.error(f"Plan file not created: {plan_file_path}")
        sys.exit(1)

    state.update(plan_file=plan_file_path)
    state.save("adw_plan_optimized")

    # ECE: Save handoff for next phase (build)
    handoff.save("plan", {
        "plan_file": plan_file_path,
        "issue_number": issue_number,
        "branch_name": branch_name
    })

    logger.info(f"✅ Plan file created: {plan_file_path}")

    # Commit the plan
    commit_msg = f"Add implementation plan for issue #{issue_number}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

    success, error = commit_changes(commit_msg, cwd=worktree_path)
    if not success:
        logger.error(f"Error committing plan: {error}")
        sys.exit(1)

    logger.info("✅ Plan committed")

    # Finalize git operations
    finalize_git_operations(state, logger, cwd=worktree_path)

    # Print optimization summary
    summary = metrics.get_workflow_summary()

    logger.info("\n" + "="*60)
    logger.info("📊 ECE OPTIMIZATION SUMMARY")
    logger.info("="*60)
    logger.info(f"Total output tokens: {summary['total_output_tokens']}")
    logger.info(f"Optimization rate: {summary['optimization_rate']*100:.1f}%")
    logger.info(f"Total cost: ${summary['total_cost_usd']:.4f}")
    logger.info(f"Phases executed: {summary['phase_executions']}")
    logger.info("="*60)

    print("\n✨ Optimized planning complete!")
    print(f"📊 Token optimization: {summary['optimization_rate']*100:.1f}%")
    print(f"💰 Cost: ${summary['total_cost_usd']:.4f}")
    print(f"📁 Metrics: agents/{adw_id}/metrics.json")
    print(f"🔗 Context handoff: agents/{adw_id}/context_handoff.json")


if __name__ == "__main__":
    main()
