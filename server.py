"""Flask API for the Quantum Logistics educational TSP application."""

import logging
import os
from math import isfinite
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from backend.geo import (
    BRAZIL_CAPITALS_LOCATIONS,
    CITIES_DATA,
    SAO_PAULO_TEST_LOCATIONS,
    DistanceMatrix,
    Location,
    generate_route,
)
from backend.routing import (
    get_api_status,
    get_distance_matrix_real,
    get_route_with_geometry,
    is_api_key_configured,
)
from backend.solvers import SOLVERS, solve_tsp

load_dotenv()

MAX_LOCATIONS = 27
MAX_REQUEST_BYTES = 64 * 1024


def _allowed_origins() -> list[str]:
    configured = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def create_app(testing: bool = False) -> Flask:
    app = Flask(__name__)
    app.config.update(
        TESTING=testing,
        JSON_SORT_KEYS=False,
        MAX_CONTENT_LENGTH=MAX_REQUEST_BYTES,
    )
    CORS(app, resources={r"/api/*": {"origins": _allowed_origins()}})

    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logger = logging.getLogger("quantum_logistics.api")

    @app.get("/")
    def index():
        return jsonify(
            service="quantum-logistics-api",
            problem="single-vehicle-tsp",
            documentation="https://github.com/igorconrado/quantum-logistics-case10",
            endpoints=["/api/health", "/api/solvers", "/api/calculate"],
        )

    @app.get("/api/health")
    def health():
        return jsonify(status="healthy", service="quantum-logistics-api")

    @app.get("/api/solvers")
    def solvers():
        return jsonify(
            success=True,
            solvers=[
                {
                    "name": spec.name,
                    "label": spec.label,
                    "max_locations": spec.max_locations,
                    "execution": spec.execution,
                }
                for spec in SOLVERS.values()
            ],
        )

    @app.get("/api/test-data")
    def test_data():
        return jsonify(success=True, locations=_serialize_locations(SAO_PAULO_TEST_LOCATIONS))

    @app.get("/api/brazil-capitals")
    def brazil_capitals():
        return jsonify(success=True, locations=_serialize_locations(BRAZIL_CAPITALS_LOCATIONS))

    @app.get("/api/cities")
    def cities():
        values = [
            {"id": data["id"], "key": key, "name": data["name"]}
            for key, data in CITIES_DATA.items()
        ]
        return jsonify(success=True, cities=sorted(values, key=lambda item: item["id"]))

    @app.get("/api/city-neighborhoods/<city_key>")
    def city_neighborhoods(city_key: str):
        data = CITIES_DATA.get(city_key)
        if data is None:
            return _error("City not found", 404)
        return jsonify(
            success=True,
            city_name=data["name"],
            hub=_serialize_location(data["hub"]),
            neighborhoods=_serialize_locations(data["neighborhoods"]),
        )

    @app.post("/api/generate-route")
    def generate_route_endpoint():
        payload = _json_object()
        city_key = payload.get("city_key")
        algorithm = payload.get("algorithm", "classical")
        num_points = payload.get("num_points", 3)
        if not isinstance(city_key, str) or city_key not in CITIES_DATA:
            return _error("A valid city_key is required", 400)
        if not isinstance(num_points, int) or isinstance(num_points, bool):
            return _error("num_points must be an integer", 400)
        try:
            locations = generate_route(city_key, algorithm, num_points)
        except ValueError as exc:
            return _error(str(exc), 400)
        return jsonify(
            success=True,
            city_name=CITIES_DATA[city_key]["name"],
            locations=_serialize_locations(locations),
            total_points=len(locations),
            algorithm=algorithm,
        )

    @app.post("/api/calculate")
    def calculate():
        payload = _json_object()
        raw_locations = payload.get("locations")
        solver_name = payload.get("solver") or _legacy_solver(payload.get("algorithm"))
        use_real_roads = payload.get("use_real_roads", False)

        try:
            locations = _validate_locations(raw_locations)
            if not isinstance(use_real_roads, bool):
                raise ValueError("use_real_roads must be a boolean")
            if use_real_roads and not is_api_key_configured():
                raise ValueError("OpenRouteService is not configured")

            if use_real_roads:
                matrix_result = get_distance_matrix_real(raw_locations)
                if not matrix_result.success:
                    logger.warning("OpenRouteService matrix failed: %s", matrix_result.error)
                    return _error("Road distance service failed", 502)
                distance_matrix = matrix_result.distances
                duration_matrix = matrix_result.durations
            else:
                distance_matrix = DistanceMatrix(locations).matrix
                duration_matrix = None

            logger.info(
                "Solving TSP solver=%s locations=%d real_roads=%s",
                solver_name,
                len(locations),
                use_real_roads,
            )
            result = solve_tsp(distance_matrix, solver_name)
            if not result.get("success", True):
                logger.error("Solver failed solver=%s error=%s", solver_name, result.get("error"))
                return _error("Optimization failed", 422)

            response: dict[str, Any] = {
                "success": True,
                "route": result["route"],
                "total_distance": float(result["total_distance"]),
                "time_ms": float(result["time_ms"]),
                "method": result["method"],
                "solver": result["solver"],
                "solver_label": result["solver_label"],
                "execution": result["execution"],
                "used_real_roads": use_real_roads,
            }
            _add_real_road_details(response, raw_locations, result["route"], duration_matrix)
            return jsonify(response)
        except ValueError as exc:
            return _error(str(exc), 400)

    @app.get("/api/routing-status")
    def routing_status():
        configured = get_api_status()["configured"]
        return jsonify(
            success=True,
            real_roads_available=configured,
            api_configured=configured,
            message="OpenRouteService configured" if configured else "OpenRouteService not configured",
        )

    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):
        return _error(exc.description, exc.code or 500)

    @app.errorhandler(ValueError)
    def handle_value_error(exc: ValueError):
        return _error(str(exc), 400)

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):
        logger.exception("Unhandled API error")
        return _error("Internal server error", 500)

    def _add_real_road_details(response, raw_locations, route, duration_matrix):
        if duration_matrix is None:
            return
        response["total_duration_min"] = float(
            sum(duration_matrix[route[index]][route[index + 1]] for index in range(len(route) - 1))
        )
        route_result = get_route_with_geometry(raw_locations, route)
        if route_result.success:
            response["route_geometry"] = route_result.geometry
            response["total_duration_min"] = float(route_result.duration_min)
        else:
            logger.warning("OpenRouteService geometry failed: %s", route_result.error)

    return app


def _json_object() -> dict:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object")
    return payload


def _legacy_solver(algorithm: Any) -> str:
    return "exact_eigensolver" if algorithm == "quantum" else "nearest_neighbor"


def _validate_locations(raw_locations: Any) -> list[Location]:
    if not isinstance(raw_locations, list):
        raise ValueError("locations must be an array")
    if not 2 <= len(raw_locations) <= MAX_LOCATIONS:
        raise ValueError(f"locations must contain between 2 and {MAX_LOCATIONS} items")

    locations = []
    for index, value in enumerate(raw_locations):
        if not isinstance(value, dict):
            raise ValueError(f"locations[{index}] must be an object")
        name = value.get("name")
        lat = value.get("lat")
        lon = value.get("lon")
        if not isinstance(name, str) or not name.strip() or len(name) > 120:
            raise ValueError(f"locations[{index}].name is invalid")
        if isinstance(lat, bool) or not isinstance(lat, (int, float)) or not isfinite(lat) or not -90 <= lat <= 90:
            raise ValueError(f"locations[{index}].lat is invalid")
        if isinstance(lon, bool) or not isinstance(lon, (int, float)) or not isfinite(lon) or not -180 <= lon <= 180:
            raise ValueError(f"locations[{index}].lon is invalid")
        locations.append(Location(id=index, name=name.strip(), lat=float(lat), lon=float(lon)))
    return locations


def _serialize_location(location: Location) -> dict:
    return {"id": location.id, "name": location.name, "lat": location.lat, "lon": location.lon}


def _serialize_locations(locations) -> list[dict]:
    return [_serialize_location(location) for location in locations]


def _error(message: str, status: int):
    return jsonify(success=False, error=message), status


app = create_app()


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5001")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
        threaded=True,
    )
