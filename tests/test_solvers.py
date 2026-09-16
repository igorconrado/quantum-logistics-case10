import numpy as np
import pytest

from backend.quantum_model import build_tsp_qubo, qubo_to_dict
from backend.solvers import resolve_solver, solve_tsp


MATRIX = np.array([[0, 2, 3], [2, 0, 1], [3, 1, 0]], dtype=float)


@pytest.mark.parametrize("name", ["brute_force", "nearest_neighbor", "networkx"])
def test_classical_solver_contract(name):
    result = solve_tsp(MATRIX, name)
    assert result["route"][0] == result["route"][-1] == 0
    assert result["total_distance"] == pytest.approx(6)
    assert result["solver"] == name
    assert result["execution"] == "classical"


def test_solver_selection_and_limits():
    assert resolve_solver("exact_eigensolver", 4).max_locations == 4
    with pytest.raises(ValueError, match="at most 4"):
        resolve_solver("exact_eigensolver", 5)
    with pytest.raises(ValueError, match="Unknown solver"):
        resolve_solver("qaoa", 3)


def test_qubo_formulation_has_expected_variables_and_constraints():
    model = build_tsp_qubo(MATRIX)
    summary = qubo_to_dict(model)
    assert summary["num_variables"] == 9
    assert summary["num_constraints"] == 6
    assert set(summary["constraints"]) == {
        "city_0_once", "city_1_once", "city_2_once",
        "time_0_once", "time_1_once", "time_2_once",
    }


def test_exact_eigensolver_contract():
    result = solve_tsp(MATRIX, "exact_eigensolver")
    assert result["route"][0] == result["route"][-1] == 0
    assert result["total_distance"] == pytest.approx(6)
    assert result["execution"] == "classical_quantum_model"
