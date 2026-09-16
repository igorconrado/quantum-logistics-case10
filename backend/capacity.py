"""Shared total-point limits, including the depot exactly once."""

import json
from pathlib import Path

ALGORITHM_LIMITS = json.loads(
    (Path(__file__).resolve().parents[1] / "frontend_base/lib/algorithm-limits.json").read_text()
)


def validate_capacity(algorithm, method, count):
    default = "quantum_numpy" if algorithm == "quantum" else "nearest_neighbor"
    method = method or default
    allowed = ("quantum_numpy",) if algorithm == "quantum" else (
        "brute_force", "nearest_neighbor", "networkx"
    )
    if algorithm not in ("classical", "quantum") or method not in allowed:
        raise ValueError("Invalid algorithm or method")
    limit = ALGORITHM_LIMITS[method]
    if count < 2 or count > limit:
        raise ValueError(f"{method}: expected 2 to {limit} total points, including the origin")
    return method
