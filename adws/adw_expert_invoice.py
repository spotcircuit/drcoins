#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Expert Invoice - Agent Expert workflow for invoice parsing tasks

Usage:
  uv run adw_expert_invoice.py <task-description> [adw-id]

Example:
  uv run adw_expert_invoice.py "Extract invoice data from sample PDFs"

Workflow:
1. Expert Plan - invoice_parsing expert analyzes task and creates plan
2. Expert Build - invoice_parsing expert implements the plan
3. Expert Improve - invoice_parsing expert analyzes results and updates knowledge

This demonstrates the Agent Experts Pattern from Elite Context Engineering,
where specialized experts become domain masters through self-improvement.
"""

import sys
import os
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

from adw_modules.agent import execute_template
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.utils import setup_logger, make_adw_id
from adw_modules.metrics import WorkflowMetrics
from adw_modules.context_handoff import ContextHandoff

# Load environment variables
load_dotenv()


def main():
    """Main entry point for expert invoice workflow."""
    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_expert_invoice.py <task-description> [adw-id]")
        print("\nExample:")
        print('  uv run adw_expert_invoice.py "Extract invoice data from sample PDFs"')
        sys.exit(1)

    task_description = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else make_adw_id()

    # Set up logger
    logger = setup_logger(adw_id, "expert_invoice")
    logger.info(f"Starting Expert Invoice workflow - ID: {adw_id}")
    logger.info(f"Task: {task_description}")

    # Initialize ECE components
    metrics = WorkflowMetrics(adw_id)
    handoff = ContextHandoff(adw_id)

    print(f"\n{'='*80}")
    print(f"🧠 Agent Expert Workflow - Invoice Parsing")
    print(f"{'='*80}")
    print(f"ADW ID: {adw_id}")
    print(f"Task: {task_description}")
    print(f"{'='*80}\n")

    # ========================================================================
    # PHASE 1: EXPERT PLAN
    # ========================================================================
    print("📋 Phase 1: Expert Plan")
    print("-" * 80)

    # The plan expert analyzes the task and creates a detailed extraction plan
    plan_request = AgentTemplateRequest(
        agent_name="invoice_parsing_planner",
        slash_command="/expert_invoice_plan",
        args=[task_description],
        adw_id=adw_id,
        output_style="verbose-yaml-structured"  # Detailed planning output
    )

    logger.info("Invoking plan expert...")
    plan_response = execute_template(plan_request)

    if not plan_response.success:
        logger.error(f"Plan expert failed: {plan_response.output}")
        print(f"❌ Planning failed: {plan_response.output}")
        sys.exit(1)

    # Extract plan file path from response
    plan_file = plan_response.output.strip()
    logger.info(f"Plan created: {plan_file}")
    print(f"✅ Plan created: {plan_file}")

    # Record metrics for planning phase
    metrics.record_phase(
        phase="expert_plan",
        output_tokens=plan_response.output_tokens,
        output_style="verbose-yaml-structured",
        cost_usd=plan_response.total_cost_usd
    )

    # Save context for build phase
    handoff.save("expert_plan", {
        "plan_file": plan_file,
        "task_description": task_description
    })

    print()

    # ========================================================================
    # PHASE 2: EXPERT BUILD
    # ========================================================================
    print("🔨 Phase 2: Expert Build")
    print("-" * 80)

    # Load context from plan phase
    plan_context = handoff.load_for_phase("expert_build")

    # The build expert implements the plan
    build_request = AgentTemplateRequest(
        agent_name="invoice_parsing_builder",
        slash_command="/expert_invoice_build",
        args=[plan_file],
        adw_id=adw_id,
        output_style="concise-done",  # Just need confirmation
        context_handoff=plan_context  # ECE: Minimal context passing
    )

    logger.info("Invoking build expert...")
    build_response = execute_template(build_request)

    if not build_response.success:
        logger.error(f"Build expert failed: {build_response.output}")
        print(f"❌ Build failed: {build_response.output}")
        sys.exit(1)

    logger.info("Build complete")
    print(f"✅ Build complete: {build_response.output}")

    # Record metrics for build phase
    metrics.record_phase(
        phase="expert_build",
        output_tokens=build_response.output_tokens,
        output_style="concise-done",
        cost_usd=build_response.total_cost_usd
    )

    # Save context for improve phase
    handoff.save("expert_build", {
        "plan_file": plan_file,
        "build_status": "success"
    })

    print()

    # ========================================================================
    # PHASE 3: EXPERT IMPROVE
    # ========================================================================
    print("📈 Phase 3: Expert Improve (Self-Learning)")
    print("-" * 80)

    # Load context from build phase
    build_context = handoff.load_for_phase("expert_improve")

    # The improve expert analyzes results and updates knowledge base
    improve_request = AgentTemplateRequest(
        agent_name="invoice_parsing_improver",
        slash_command="/expert_invoice_improve",
        args=[],  # Analyzes git diff and test results
        adw_id=adw_id,
        output_style="verbose-yaml-structured",  # Detailed analysis
        context_handoff=build_context  # ECE: Minimal context passing
    )

    logger.info("Invoking improve expert...")
    improve_response = execute_template(improve_request)

    if not improve_response.success:
        logger.error(f"Improve expert failed: {improve_response.output}")
        print(f"⚠️  Improve analysis failed: {improve_response.output}")
        # Don't exit - improvement is optional
    else:
        logger.info("Expert knowledge updated")
        print(f"✅ Expert knowledge updated")
        print(f"\n{improve_response.output}\n")

    # Record metrics for improve phase
    metrics.record_phase(
        phase="expert_improve",
        output_tokens=improve_response.output_tokens,
        output_style="verbose-yaml-structured",
        cost_usd=improve_response.total_cost_usd
    )

    print()

    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("=" * 80)
    print("📊 Expert Workflow Summary")
    print("=" * 80)

    # Get workflow metrics
    summary = metrics.get_workflow_summary()

    print(f"ADW ID: {adw_id}")
    print(f"Total Phases: {summary['total_phases']}")
    print(f"Total Tokens: {summary['total_output_tokens']}")
    print(f"Total Cost: ${summary['total_cost']:.4f}")

    if summary.get('optimization_rate'):
        print(f"Token Optimization: {summary['optimization_rate']*100:.1f}%")

    print(f"\nPhase Breakdown:")
    for phase_name, phase_data in summary['phases'].items():
        avg_tokens = phase_data['avg_output_tokens']
        count = phase_data['count']
        print(f"  {phase_name}: {avg_tokens:.0f} tokens (×{count})")

    print(f"\n📁 Outputs:")
    print(f"  Plan: {plan_file}")
    print(f"  Metrics: agents/{adw_id}/metrics.json")
    print(f"  Context: agents/{adw_id}/context_handoff.json")

    # Check if expert knowledge was updated
    expert_plan_path = Path(".claude/commands/experts/invoice_parsing/plan.md")
    expert_build_path = Path(".claude/commands/experts/invoice_parsing/build.md")

    if expert_plan_path.exists() and expert_build_path.exists():
        print(f"\n🧠 Expert Knowledge:")
        print(f"  Plan Expert: {expert_plan_path}")
        print(f"  Build Expert: {expert_build_path}")
        print(f"  (Check 'Knowledge Base' sections for updates)")

    print(f"\n{'='*80}")
    print("✅ Expert workflow complete!")
    print(f"{'='*80}\n")

    logger.info("Expert Invoice workflow completed successfully")


if __name__ == "__main__":
    main()
