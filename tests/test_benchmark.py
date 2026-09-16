from benchmarks.evaluate import evaluate


def test_evaluation_is_structured_and_explicit():
    report = evaluate(3, ["nearest_neighbor"])
    result = report["results"][0]
    assert report["distance"] == "Haversine kilometers"
    assert "do not establish quantum advantage" in report["interpretation"]
    assert result["solver"] == "nearest_neighbor"
    assert result["city_count"] == 3
    assert result["route_cost_km"] > 0
