"""Run a deterministic, small TSP evaluation and emit machine-readable results."""

import argparse
import json
import platform
import sys
from datetime import datetime, timezone

from backend.geo import BRAZIL_CAPITALS_LOCATIONS, DistanceMatrix
from backend.solvers import solve_tsp


def evaluate(city_count: int, solvers: list[str]) -> dict:
    locations = BRAZIL_CAPITALS_LOCATIONS[:city_count]
    matrix = DistanceMatrix(locations).matrix
    results = []
    for solver in solvers:
        result = solve_tsp(matrix, solver)
        results.append(
            {
                "solver": result["solver"],
                "execution": result["execution"],
                "city_count": city_count,
                "route": result["route"],
                "route_cost_km": round(float(result["total_distance"]), 6),
                "execution_time_ms": round(float(result["time_ms"]), 6),
            }
        )
    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": "first capitals in backend.geo.BRAZIL_CAPITALS_LOCATIONS",
        "distance": "Haversine kilometers",
        "runtime": {
            "python": sys.version.split()[0],
            "platform": platform.platform(),
            "processor": platform.processor() or "unknown",
        },
        "results": results,
        "interpretation": (
            "Timings compare local implementations on this runtime and do not establish "
            "quantum advantage. exact_eigensolver is executed classically."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cities", type=int, default=3, choices=range(2, 5))
    parser.add_argument(
        "--solvers",
        nargs="+",
        default=["brute_force", "nearest_neighbor", "exact_eigensolver"],
    )
    args = parser.parse_args()
    print(json.dumps(evaluate(args.cities, args.solvers), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
