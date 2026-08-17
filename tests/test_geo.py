import pytest

from backend.geo import DistanceMatrix, Location, generate_route, haversine


def test_haversine_is_symmetric_and_zero_on_diagonal():
    forward = haversine(-23.5505, -46.6333, -22.9068, -43.1729)
    reverse = haversine(-22.9068, -43.1729, -23.5505, -46.6333)
    assert forward == pytest.approx(reverse)
    assert haversine(-23.5505, -46.6333, -23.5505, -46.6333) == 0


def test_distance_matrix_shape_and_diagonal():
    points = [Location(0, "A", 0, 0), Location(1, "B", 1, 1)]
    matrix = DistanceMatrix(points).matrix
    assert matrix.shape == (2, 2)
    assert matrix[0, 0] == matrix[1, 1] == 0
    assert matrix[0, 1] == pytest.approx(matrix[1, 0])


def test_generate_route_validates_algorithm_limit():
    with pytest.raises(ValueError, match="entre 1 e 3"):
        generate_route("sao_paulo", "quantum", 4)
