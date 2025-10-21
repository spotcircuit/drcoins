"""Context handoff module for minimal inter-phase context passing.

ECE Integration: Enables efficient context passing between workflow phases
without stacking full context. Each phase receives only what it needs.
"""

import json
import os
from pathlib import Path
from typing import Dict, Any, Optional


class ContextHandoff:
    """Minimal context passing between workflow phases.

    Instead of carrying full context between phases, we pass only
    the essential keys needed for the next phase to continue.

    Example:
        # Phase 1: Plan
        handoff = ContextHandoff("abc12345")
        handoff.save("plan", {
            "plan_file": "specs/issue-1-plan.md",
            "issue_number": "1"
        })

        # Phase 2: Build
        handoff = ContextHandoff("abc12345")
        plan_context = handoff.load_for_phase("build")
        # plan_context = {"plan_file": "specs/issue-1-plan.md", "issue_number": "1"}
    """

    def __init__(self, adw_id: str):
        """Initialize context handoff for a specific ADW workflow.

        Args:
            adw_id: The ADW workflow ID
        """
        self.adw_id = adw_id

        # Get project root (3 levels up from this file)
        project_root = Path(__file__).parent.parent.parent
        self.handoff_file = project_root / "agents" / adw_id / "context_handoff.json"

        # Ensure directory exists
        self.handoff_file.parent.mkdir(parents=True, exist_ok=True)

    def save(self, phase: str, data: Dict[str, Any]) -> None:
        """Save minimal context for next phase.

        Args:
            phase: The phase name (e.g., "plan", "build", "test")
            data: Minimal context dictionary (only essential keys)
        """
        # Load existing handoff data
        handoff = self.load() if self.handoff_file.exists() else {}

        # Add this phase's data
        handoff[phase] = data

        # Save updated handoff
        with open(self.handoff_file, 'w') as f:
            json.dump(handoff, f, indent=2)

    def load(self) -> Dict[str, Dict[str, Any]]:
        """Load all handoff data.

        Returns:
            Dictionary of {phase_name: phase_data}
        """
        if not self.handoff_file.exists():
            return {}

        with open(self.handoff_file) as f:
            return json.load(f)

    def load_for_phase(self, phase: str) -> Dict[str, Any]:
        """Load accumulated context needed for this phase.

        This returns all context from previous phases up to this point.

        Args:
            phase: The current phase name

        Returns:
            Dictionary of accumulated minimal context
        """
        handoff = self.load()

        # Phase dependency order
        phase_order = ["plan", "build", "test", "review", "ship"]

        # Get index of current phase
        try:
            current_idx = phase_order.index(phase)
        except ValueError:
            # Unknown phase, return all available context
            return {k: v for phase_data in handoff.values() for k, v in phase_data.items()}

        # Accumulate context from all previous phases
        accumulated = {}
        for i in range(current_idx):
            previous_phase = phase_order[i]
            if previous_phase in handoff:
                accumulated.update(handoff[previous_phase])

        return accumulated

    def get_phase(self, phase: str) -> Optional[Dict[str, Any]]:
        """Get context from a specific phase.

        Args:
            phase: The phase name

        Returns:
            Phase data dictionary or None if not found
        """
        handoff = self.load()
        return handoff.get(phase)

    def clear(self) -> None:
        """Clear all handoff data for this workflow."""
        if self.handoff_file.exists():
            self.handoff_file.unlink()


# Phase-specific handoff schemas
# These define what each phase should save for the next phase

HANDOFF_SCHEMAS = {
    "plan": {
        "required": ["plan_file", "issue_number"],
        "optional": ["branch_name", "issue_class"]
    },
    "build": {
        "required": ["files_changed"],
        "optional": ["test_command", "build_warnings"]
    },
    "test": {
        "required": ["tests_passed"],
        "optional": ["coverage", "failed_tests"]
    },
    "review": {
        "required": ["approved"],
        "optional": ["comments", "issues"]
    },
    "ship": {
        "required": ["pr_url"],
        "optional": ["deployed"]
    }
}


def validate_handoff(phase: str, data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate that handoff data contains required keys.

    Args:
        phase: The phase name
        data: The handoff data to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    schema = HANDOFF_SCHEMAS.get(phase)
    if not schema:
        # Unknown phase, allow anything
        return True, None

    # Check required keys
    required = schema["required"]
    missing = [key for key in required if key not in data]

    if missing:
        return False, f"Missing required keys for {phase}: {', '.join(missing)}"

    return True, None
