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


class CapacityRegressions(unittest.TestCase):
    def setUp(self):
        routing.clear_cache()
        self.locations = [
            {'id': 0, 'name': 'Hub', 'lat': -19.9167, 'lon': -43.9345},
            {'id': 1, 'name': 'Stop', 'lat': -19.93, 'lon': -43.94},
        ]
        self.client = app.test_client()

    def test_capacity_counts_origin(self):
        for algorithm, method, limit in [('quantum', 'quantum_numpy', 4), ('classical', 'brute_force', 8)]:
            with self.subTest(method=method):
                self.assertEqual(validate_capacity(algorithm, method, limit), method)
                with self.assertRaises(ValueError):
                    validate_capacity(algorithm, method, limit + 1)
                route = generate_route('belo_horizonte', algorithm, limit - 1, method)
                self.assertEqual(len(route), limit)
                with self.assertRaises(ValueError):
                    generate_route('belo_horizonte', algorithm, limit, method)
                response = self.client.post('/api/calculate', json={
                    'locations': self.locations * limit, 'algorithm': algorithm, 'method': method
                })
                self.assertEqual(response.status_code, 400)
        with self.assertRaises(ValueError):
            solve_tsp_brute_force(np.ones((9, 9)))
