import numpy as np

import server


def test_root_returns_api_documentation(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json()["problem"] == "single-vehicle-tsp"


def test_health_is_small_and_stable(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json() == {
        "service": "quantum-logistics-api",
        "status": "healthy",
    }


def test_capitals_preserve_utf8(client):
    response = client.get("/api/brazil-capitals")
    names = [item["name"] for item in response.get_json()["locations"]]
    assert response.status_code == 200
    assert len(names) == 27
    assert "Hub São Paulo" in names


def test_calculate_nearest_neighbor(client, locations):
    response = client.post(
        "/api/calculate",
        json={"locations": locations, "solver": "nearest_neighbor", "use_real_roads": False},
    )
    result = response.get_json()
    assert response.status_code == 200
    assert result["success"] is True
    assert result["route"][0] == result["route"][-1] == 0
    assert set(result["route"][:-1]) == {0, 1, 2}
    assert result["execution"] == "classical"
    assert result["total_distance"] > 0


def test_calculate_rejects_bad_inputs(client, locations):
    cases = [
        ({}, "locations must be an array"),
        ({"locations": locations[:1]}, "between 2 and 27"),
        ({"locations": locations, "solver": "missing"}, "Unknown solver"),
        ({"locations": [{**locations[0], "lat": 100}, locations[1]]}, "lat is invalid"),
        ({"locations": locations, "use_real_roads": "yes"}, "must be a boolean"),
    ]
    for payload, message in cases:
        response = client.post("/api/calculate", json=payload)
        assert response.status_code == 400
        assert message in response.get_json()["error"]


def test_calculate_rejects_oversized_exact_eigensolver(client, locations):
    response = client.post(
        "/api/calculate",
        json={"locations": locations + [locations[0], locations[1]], "solver": "exact_eigensolver"},
    )
    assert response.status_code == 400
    assert "at most 4" in response.get_json()["error"]


def test_real_roads_requires_configuration(client, locations, monkeypatch):
    monkeypatch.setattr(server, "is_api_key_configured", lambda: False)
    response = client.post(
        "/api/calculate",
        json={"locations": locations, "solver": "nearest_neighbor", "use_real_roads": True},
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "OpenRouteService is not configured"


def test_real_roads_failure_is_a_bad_gateway(client, locations, monkeypatch):
    class MatrixFailure:
        success = False
        error = "timeout"

    monkeypatch.setattr(server, "is_api_key_configured", lambda: True)
    monkeypatch.setattr(server, "get_distance_matrix_real", lambda _: MatrixFailure())
    response = client.post(
        "/api/calculate",
        json={"locations": locations, "solver": "nearest_neighbor", "use_real_roads": True},
    )
    assert response.status_code == 502
    assert response.get_json()["error"] == "Road distance service failed"


def test_real_roads_result_is_serialized(client, locations, monkeypatch):
    class MatrixSuccess:
        success = True
        distances = np.array([[0, 1, 3], [1, 0, 1], [3, 1, 0]], dtype=float)
        durations = np.array([[0, 10, 30], [10, 0, 10], [30, 10, 0]], dtype=float)

    class RouteSuccess:
        success = True
        geometry = [[-46.6, -23.5], [-43.1, -22.9]]
        duration_min = 50

    monkeypatch.setattr(server, "is_api_key_configured", lambda: True)
    monkeypatch.setattr(server, "get_distance_matrix_real", lambda _: MatrixSuccess())
    monkeypatch.setattr(server, "get_route_with_geometry", lambda *_: RouteSuccess())
    response = client.post(
        "/api/calculate",
        json={"locations": locations, "solver": "nearest_neighbor", "use_real_roads": True},
    )
    result = response.get_json()
    assert response.status_code == 200
    assert result["used_real_roads"] is True
    assert result["route_geometry"] == RouteSuccess.geometry
    assert result["total_duration_min"] == 50


def test_json_errors_are_consistent(client):
    response = client.post("/api/calculate", data="not-json", content_type="text/plain")
    assert response.status_code == 400
    assert response.content_type == "application/json"
    assert response.get_json()["success"] is False


def test_cors_allows_only_configured_origin(client):
    allowed = client.get("/api/health", headers={"Origin": "https://example.test"})
    rejected = client.get("/api/health", headers={"Origin": "https://invalid.test"})
    assert allowed.headers["Access-Control-Allow-Origin"] == "https://example.test"
    assert "Access-Control-Allow-Origin" not in rejected.headers
