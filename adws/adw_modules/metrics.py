"""Metrics tracking for ADW workflows with ECE optimization monitoring.

Tracks token usage, costs, and optimization effectiveness across workflow phases.
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime


class WorkflowMetrics:
    """Track TAC workflow efficiency with ECE optimizations.

    Captures metrics for each phase to measure the impact of
    output style optimization and context handoff strategies.

    Example:
        metrics = WorkflowMetrics("abc12345")

        start = time.time()
        response = execute_template(request)
        duration = time.time() - start

        metrics.record_phase(
            phase="plan",
            input_tokens=45000,
            output_tokens=200,  # vs 2000 without optimization
            output_style="concise-ultra",
            duration_seconds=duration,
            cost_usd=response.total_cost_usd
        )

        # Get summary
        summary = metrics.get_workflow_summary()
        print(f"Total savings: {summary['optimization_rate']*100:.1f}%")
    """

    def __init__(self, adw_id: str):
        """Initialize metrics tracking for a workflow.

        Args:
            adw_id: The ADW workflow ID
        """
        self.adw_id = adw_id

        # Get project root (3 levels up from this file)
        project_root = Path(__file__).parent.parent.parent
        self.metrics_file = project_root / "agents" / adw_id / "metrics.json"

        # Ensure directory exists
        self.metrics_file.parent.mkdir(parents=True, exist_ok=True)

    def record_phase(
        self,
        phase: str,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        output_style: Optional[str] = None,
        duration_seconds: Optional[float] = None,
        cost_usd: Optional[float] = None
    ) -> None:
        """Record metrics for a workflow phase.

        Args:
            phase: Phase name (e.g., "plan", "build", "test")
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            output_style: Output style used (e.g., "concise-ultra")
            duration_seconds: Phase duration in seconds
            cost_usd: Total cost in USD
        """
        metrics = self.load()

        phase_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "output_style": output_style,
            "duration_seconds": duration_seconds,
            "cost_usd": cost_usd or self._calculate_cost(input_tokens, output_tokens)
        }

        if phase not in metrics:
            metrics[phase] = []
        metrics[phase].append(phase_data)

        self.save(metrics)

    def load(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load all metrics data.

        Returns:
            Dictionary of {phase_name: [phase_data_list]}
        """
        if not self.metrics_file.exists():
            return {}

        with open(self.metrics_file) as f:
            return json.load(f)

    def save(self, metrics: Dict) -> None:
        """Save metrics data.

        Args:
            metrics: Metrics dictionary to save
        """
        with open(self.metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)

    def get_workflow_summary(self) -> Dict[str, Any]:
        """Get summary metrics for entire workflow.

        Returns:
            Dictionary with aggregated metrics:
            - total_input_tokens: Sum of all input tokens
            - total_output_tokens: Sum of all output tokens
            - total_cost_usd: Sum of all costs
            - phases: Number of phases executed
            - optimization_rate: Percentage of token reduction
            - avg_duration_seconds: Average phase duration
        """
        metrics = self.load()

        total_input = sum(
            sum(p.get("input_tokens", 0) or 0 for p in phases)
            for phases in metrics.values()
        )
        total_output = sum(
            sum(p.get("output_tokens", 0) or 0 for p in phases)
            for phases in metrics.values()
        )
        total_cost = sum(
            sum(p.get("cost_usd", 0) or 0 for p in phases)
            for phases in metrics.values()
        )

        # Calculate average duration
        all_durations = [
            p.get("duration_seconds", 0) or 0
            for phases in metrics.values()
            for p in phases
            if p.get("duration_seconds") is not None
        ]
        avg_duration = sum(all_durations) / len(all_durations) if all_durations else 0

        return {
            "adw_id": self.adw_id,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_cost_usd": total_cost,
            "phases": len(metrics),
            "phase_executions": sum(len(phases) for phases in metrics.values()),
            "optimization_rate": self._calculate_optimization_rate(metrics),
            "avg_duration_seconds": avg_duration,
            "phases_breakdown": {
                phase: {
                    "executions": len(phases),
                    "total_output_tokens": sum(p.get("output_tokens", 0) or 0 for p in phases),
                    "avg_output_tokens": sum(p.get("output_tokens", 0) or 0 for p in phases) / len(phases),
                    "output_style": phases[-1].get("output_style") if phases else None
                }
                for phase, phases in metrics.items()
            }
        }

    def _calculate_optimization_rate(self, metrics: Dict) -> float:
        """Calculate how much ECE optimizations helped.

        Compares actual output vs baseline (no output styles).

        Args:
            metrics: Metrics dictionary

        Returns:
            Optimization rate as decimal (e.g., 0.85 = 85% reduction)
        """
        # Baseline estimates without output styles (rough averages)
        BASELINE_OUTPUT_TOKENS = {
            "plan": 2000,
            "build": 5000,
            "test": 3000,
            "review": 4000,
            "ship": 1000,
        }

        total_baseline = 0
        total_actual = 0

        for phase, phases in metrics.items():
            baseline_per_execution = BASELINE_OUTPUT_TOKENS.get(phase, 3000)
            for p in phases:
                total_baseline += baseline_per_execution
                total_actual += p.get("output_tokens", baseline_per_execution) or baseline_per_execution

        if total_baseline == 0:
            return 0.0

        return (total_baseline - total_actual) / total_baseline

    def _calculate_cost(
        self,
        input_tokens: Optional[int],
        output_tokens: Optional[int]
    ) -> float:
        """Calculate cost based on token usage.

        Uses Claude Sonnet 4 pricing:
        - Input: $3 per 1M tokens
        - Output: $15 per 1M tokens

        Args:
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD
        """
        if input_tokens is None and output_tokens is None:
            return 0.0

        input_cost = (input_tokens or 0) * (3.0 / 1_000_000)
        output_cost = (output_tokens or 0) * (15.0 / 1_000_000)

        return input_cost + output_cost

    def export_csv(self, output_path: Optional[str] = None) -> str:
        """Export metrics to CSV format.

        Args:
            output_path: Path to save CSV (default: agents/{adw_id}/metrics.csv)

        Returns:
            Path to created CSV file
        """
        import csv

        if output_path is None:
            output_path = str(self.metrics_file.parent / "metrics.csv")

        metrics = self.load()

        with open(output_path, 'w', newline='') as f:
            writer = csv.writer(f)

            # Header
            writer.writerow([
                "phase", "timestamp", "input_tokens", "output_tokens",
                "output_style", "duration_seconds", "cost_usd"
            ])

            # Data rows
            for phase, phases in metrics.items():
                for p in phases:
                    writer.writerow([
                        phase,
                        p.get("timestamp"),
                        p.get("input_tokens"),
                        p.get("output_tokens"),
                        p.get("output_style"),
                        p.get("duration_seconds"),
                        p.get("cost_usd")
                    ])

        return output_path


# Global metrics helper
def record_phase_metrics(
    adw_id: str,
    phase: str,
    response: Any,  # AgentPromptResponse
    start_time: float,
    output_style: Optional[str] = None
) -> None:
    """Convenience function to record phase metrics.

    Args:
        adw_id: ADW workflow ID
        phase: Phase name
        response: AgentPromptResponse object
        start_time: Start time from time.time()
        output_style: Output style used
    """
    metrics = WorkflowMetrics(adw_id)

    duration = time.time() - start_time

    metrics.record_phase(
        phase=phase,
        input_tokens=None,  # Could estimate from request
        output_tokens=getattr(response, 'output_tokens', None),
        output_style=output_style,
        duration_seconds=duration,
        cost_usd=getattr(response, 'total_cost_usd', None)
    )
