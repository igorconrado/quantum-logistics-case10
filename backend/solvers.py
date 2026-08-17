"""Solver registry for bounded single-vehicle TSP instances."""

from dataclasses import dataclass
from typing import Callable, Dict

import numpy as np

from backend.classic_solver import (
    solve_tsp_brute_force,
    solve_tsp_nearest_neighbor,
    solve_tsp_networkx,
)


Solver = Callable[[np.ndarray], Dict]


@dataclass(frozen=True)
class SolverSpec:
    name: str
    label: str
    max_locations: int
    solve: Solver
    execution: str


def _solve_exact_eigensolver(distance_matrix: np.ndarray) -> Dict:
    # Qiskit is intentionally loaded only for this bounded, optional path.
    from backend.quantum_solver import solve_quantum

    return solve_quantum(distance_matrix)


SOLVERS = {
    "brute_force": SolverSpec(
        "brute_force", "Exact brute force", 8, solve_tsp_brute_force, "classical"
    ),
    "nearest_neighbor": SolverSpec(
        "nearest_neighbor", "Nearest-neighbor heuristic", 27, solve_tsp_nearest_neighbor, "classical"
    ),
    "networkx": SolverSpec(
        "networkx", "NetworkX approximation", 27, solve_tsp_networkx, "classical"
    ),
    "exact_eigensolver": SolverSpec(
        "exact_eigensolver",
        "Exact classical eigensolver via Qiskit",
        4,
        _solve_exact_eigensolver,
        "classical_quantum_model",
    ),
}


def resolve_solver(name: str, location_count: int) -> SolverSpec:
    if name not in SOLVERS:
        raise ValueError(f"Unknown solver: {name}")

    solver = SOLVERS[name]
    if location_count > solver.max_locations:
        raise ValueError(
            f"Solver '{name}' supports at most {solver.max_locations} locations"
        )
    return solver


def solve_tsp(distance_matrix: np.ndarray, solver_name: str) -> Dict:
    solver = resolve_solver(solver_name, len(distance_matrix))
    result = solver.solve(distance_matrix)
    result["solver"] = solver.name
    result["solver_label"] = solver.label
    result["execution"] = solver.execution
    return result
