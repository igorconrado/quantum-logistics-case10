"""Offline regressions for demo capacity and ORS failure handling."""
import unittest
from unittest.mock import Mock, patch

import numpy as np
import requests
from backend import routing
from backend.capacity import validate_capacity
from backend.classic_solver import solve_tsp_brute_force
from backend.geo import generate_route
from server import app


class RoutingRegressions(unittest.TestCase):
    def setUp(self):
        routing.clear_cache()
        self.locations = [
            {'id': 0, 'name': 'Hub', 'lat': -19.9167, 'lon': -43.9345},
            {'id': 1, 'name': 'Stop', 'lat': -19.93, 'lon': -43.94},
        ]
        self.client = app.test_client()

    def matrix(self, payload):
        response = Mock(status_code=200)
        response.json.return_value = payload
        with patch.object(routing, 'is_api_key_configured', return_value=True), patch.object(
            routing.requests, 'post', return_value=response
        ) as post:
            result = routing.get_distance_matrix_real(self.locations)
        return result, post

    def test_matrix_coordinates_units_and_directed_distances(self):
        result, post = self.matrix({'distances': [[0, 1.25], [2.5, 0]], 'durations': [[0, 120], [180, 0]]})
        self.assertTrue(result.success)
        self.assertEqual(post.call_args.kwargs['json']['locations'][0], [-43.9345, -19.9167])
        self.assertEqual(post.call_args.kwargs['json']['units'], 'km')
        self.assertEqual(result.durations[0, 1], 2)
        self.assertEqual(solve_tsp_brute_force(result.distances)['total_distance'], 3.75)

    def test_unavailable_and_malformed_matrices_are_not_cached(self):
        for distances in ([[0, None], [None, 0]], [[0, 0], [0, 0]], [[0, 1]], [[0, -1], [2, 0]], [[0, float('inf')], [2, 0]]):
            with self.subTest(distances=distances):
                result, _ = self.matrix({'distances': distances, 'durations': [[0, 60], [60, 0]]})
                self.assertFalse(result.success)
                self.assertTrue(result.error)
                self.assertFalse(routing._matrix_cache)
        result, _ = self.matrix({'distances': [[0, 1], [2, 0]]})
        self.assertFalse(result.success)

    def test_ors_http_errors_and_timeout(self):
        for status in (401, 403, 429, 500):
            with self.subTest(status=status), patch.object(routing, 'is_api_key_configured', return_value=True), patch.object(
                routing.requests, 'post', return_value=Mock(status_code=status, text='API unavailable')
            ):
                self.assertFalse(routing.get_distance_matrix_real(self.locations).success)
        with patch.object(routing, 'is_api_key_configured', return_value=True), patch.object(
            routing.requests, 'post', side_effect=requests.exceptions.Timeout
        ):
            self.assertFalse(routing.get_distance_matrix_real(self.locations).success)

    def test_calculation_both_distance_modes_and_api_failure(self):
        payload = {'locations': self.locations, 'algorithm': 'classical', 'method': 'brute_force'}
        straight = self.client.post('/api/calculate', json=payload).get_json()
        self.assertTrue(straight['success'])
        self.assertGreater(straight['total_distance'], 0)
        self.assertFalse(straight['used_real_roads'])
        self.assertEqual(straight['method'], 'brute_force')
        response = Mock(status_code=200)
        response.json.return_value = {'distances': [[0, 1.25], [2.5, 0]], 'durations': [[0, 120], [180, 0]]}
        with patch('server.is_api_key_configured', return_value=True), patch.object(
            routing, 'is_api_key_configured', return_value=True
        ), patch.object(routing.requests, 'post', return_value=response), patch(
            'server.get_route_with_geometry', return_value=routing.RealRoute(3.75, 5, [[-43.9345, -19.9167]], True)
        ):
            road = self.client.post('/api/calculate', json={**payload, 'use_real_roads': True}).get_json()
            self.assertTrue(road['success'])
            self.assertEqual(road['total_distance'], 3.75)
            self.assertEqual(road['total_duration_min'], 5)
            routing.clear_cache()
            response.json.return_value['distances'] = [[0, None], [None, 0]]
            failed = self.client.post('/api/calculate', json={**payload, 'use_real_roads': True})
            self.assertGreaterEqual(failed.status_code, 400)
            self.assertFalse(failed.get_json()['success'])
            self.assertNotIn('total_distance', failed.get_json())

    def test_missing_key_invalid_coordinates_and_geometry_failure(self):
        payload = {'locations': self.locations, 'algorithm': 'classical', 'use_real_roads': True}
        with patch('server.is_api_key_configured', return_value=False):
            self.assertEqual(self.client.post('/api/calculate', json=payload).status_code, 400)
        invalid = {**payload, 'locations': [{**self.locations[0], 'lat': 100}, self.locations[1]]}
        self.assertEqual(self.client.post('/api/calculate', json=invalid).status_code, 400)
        matrix = routing.RealDistanceMatrix(np.array([[0, 1], [2, 0]]), np.array([[0, 2], [3, 0]]), True)
        with patch('server.is_api_key_configured', return_value=True), patch(
            'server.get_distance_matrix_real', return_value=matrix
        ), patch('server.get_route_with_geometry', return_value=routing.RealRoute(0, 0, [], False, 'Timeout')):
            failed = self.client.post('/api/calculate', json=payload)
            self.assertEqual(failed.status_code, 502)
            self.assertNotIn('total_distance', failed.get_json())


if __name__ == '__main__':
    unittest.main()
