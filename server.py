"""
Flask Server for Quantum Logistics
Provides REST API endpoints for the HTML/CSS/JS frontend
"""

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

from backend.geo import (
    Location, DistanceMatrix,
    SAO_PAULO_TEST_LOCATIONS, BRAZIL_CAPITALS_LOCATIONS,
    CITIES_DATA, generate_route, get_city_by_index
)
from backend.classic_solver import solve_classic
from backend.quantum_solver import solve_quantum
from backend.routing import (
    get_distance_matrix_real,
    get_route_with_geometry,
    is_api_key_configured,
    get_api_status,
    set_api_key
)

app = Flask(__name__)
CORS(app)


@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')


@app.route('/api/test-data', methods=['GET'])
def get_test_data():
    """Return test data (São Paulo locations)"""
    locations_data = []
    for loc in SAO_PAULO_TEST_LOCATIONS:
        locations_data.append({
            'id': loc.id,
            'name': loc.name,
            'lat': loc.lat,
            'lon': loc.lon
        })

    return jsonify({
        'success': True,
        'locations': locations_data
    })


@app.route('/api/brazil-capitals', methods=['GET'])
def get_brazil_capitals():
    """Return Brazil capitals data (10 major capitals)"""
    locations_data = []
    for loc in BRAZIL_CAPITALS_LOCATIONS:
        locations_data.append({
            'id': loc.id,
            'name': loc.name,
            'lat': loc.lat,
            'lon': loc.lon
        })

    return jsonify({
        'success': True,
        'locations': locations_data
    })


@app.route('/api/cities', methods=['GET'])
def get_cities():
    """Return all cities with their metadata (for route type selection)"""
    cities_list = []
    for city_key, city_data in CITIES_DATA.items():
        cities_list.append({
            'id': city_data['id'],
            'key': city_key,
            'name': city_data['name']
        })

    # Sort by ID to maintain consistent order
    cities_list.sort(key=lambda x: x['id'])

    return jsonify({
        'success': True,
        'cities': cities_list
    })


@app.route('/api/city-neighborhoods/<city_key>', methods=['GET'])
def get_city_neighborhoods(city_key):
    """Return hub and neighborhoods for a specific city"""
    if city_key not in CITIES_DATA:
        return jsonify({
            'success': False,
            'error': f'City not found: {city_key}'
        }), 404

    city_data = CITIES_DATA[city_key]
    hub = city_data['hub']
    neighborhoods = city_data['neighborhoods']

    return jsonify({
        'success': True,
        'city_name': city_data['name'],
        'hub': {
            'id': hub.id,
            'name': hub.name,
            'lat': hub.lat,
            'lon': hub.lon
        },
        'neighborhoods': [
            {
                'id': loc.id,
                'name': loc.name,
                'lat': loc.lat,
                'lon': loc.lon
            } for loc in neighborhoods
        ]
    })


@app.route('/api/generate-route', methods=['POST'])
def generate_route_endpoint():
    """Generate a route with hub + random neighborhoods for intra-city routing"""
    try:
        data = request.json
        city_key = data.get('city_key')
        algorithm = data.get('algorithm', 'classical')
        num_points = data.get('num_points', 3)

        # Validate inputs
        if not city_key:
            return jsonify({
                'success': False,
                'error': 'city_key is required'
            }), 400

        if city_key not in CITIES_DATA:
            return jsonify({
                'success': False,
                'error': f'Invalid city: {city_key}'
            }), 400

        # Generate route using the business logic
        route = generate_route(city_key, algorithm, num_points)

        # Convert to JSON format
        locations_data = []
        for loc in route:
            locations_data.append({
                'id': loc.id,
                'name': loc.name,
                'lat': loc.lat,
                'lon': loc.lon
            })

        return jsonify({
            'success': True,
            'city_name': CITIES_DATA[city_key]['name'],
            'locations': locations_data,
            'total_points': len(locations_data),
            'algorithm': algorithm
        })

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        print(f"Error in generate_route_endpoint: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/calculate', methods=['POST'])
def calculate_route():
    """Calculate optimized route with optional real roads"""
    try:
        data = request.json
        locations_data = data.get('locations', [])
        algorithm = data.get('algorithm', 'classical')
        use_real_roads = data.get('use_real_roads', False)

        # Validate input
        if len(locations_data) < 2:
            return jsonify({
                'success': False,
                'error': 'At least 2 locations required'
            }), 400

        if algorithm == 'quantum' and len(locations_data) > 4:
            return jsonify({
                'success': False,
                'error': 'Quantum mode limited to 4 points due to exponential RAM memory growth (2^(n²))'
            }), 400

        # Check if real roads requested but API not configured
        if use_real_roads and not is_api_key_configured():
            return jsonify({
                'success': False,
                'error': 'Real roads requested but OpenRouteService API key not configured. Set ORS_API_KEY environment variable.'
            }), 400

        # Create distance matrix
        if use_real_roads:
            # Use real road distances from OpenRouteService
            print(f"[SERVER] Using real road distances for {len(locations_data)} points...")
            matrix_result = get_distance_matrix_real(locations_data)

            if not matrix_result.success:
                return jsonify({
                    'success': False,
                    'error': f'Failed to get real distances: {matrix_result.error}'
                }), 500

            dm_matrix = matrix_result.distances
            duration_matrix = matrix_result.durations
        else:
            # Use Haversine (straight-line) distances
            locations = []
            for loc_data in locations_data:
                loc = Location(
                    id=loc_data['id'],
                    name=loc_data['name'],
                    lat=loc_data['lat'],
                    lon=loc_data['lon']
                )
                locations.append(loc)

            dm = DistanceMatrix(locations)
            dm_matrix = dm.matrix
            duration_matrix = None

        # Solve based on algorithm
        if algorithm == 'classical':
            result = solve_classic(dm_matrix)
        elif algorithm == 'quantum':
            result = solve_quantum(dm_matrix, use_exact=True)
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown algorithm: {algorithm}'
            }), 400

        # Check if quantum solver succeeded
        if not result.get('success', True):
            return jsonify({
                'success': False,
                'error': result.get('error', 'Optimization failed')
            }), 500

        # Get route geometry if using real roads
        route_geometry = None
        total_duration = None

        if use_real_roads and result.get('route'):
            print(f"[SERVER] Getting route geometry for optimized route...")
            route_result = get_route_with_geometry(locations_data, result['route'])

            if route_result.success:
                route_geometry = route_result.geometry
                total_duration = route_result.duration_min
                # Use the real route distance (may differ slightly from matrix sum)
                # result['total_distance'] = route_result.distance_km
            else:
                print(f"[SERVER] Warning: Could not get route geometry: {route_result.error}")

        # Calculate total duration from matrix if available
        if duration_matrix is not None and total_duration is None:
            route = result['route']
            total_duration = 0
            for i in range(len(route) - 1):
                total_duration += duration_matrix[route[i]][route[i + 1]]

        # Build response
        response_data = {
            'success': True,
            'route': result['route'],
            'total_distance': float(result['total_distance']),
            'time_ms': float(result['time_ms']),
            'method': result['method'],
            'used_real_roads': use_real_roads
        }

        if route_geometry:
            response_data['route_geometry'] = route_geometry

        if total_duration is not None:
            response_data['total_duration_min'] = float(total_duration)

        return jsonify(response_data)

    except Exception as e:
        print(f"Error in calculate_route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/routing-status', methods=['GET'])
def routing_status():
    """Check if real roads routing is available"""
    status = get_api_status()
    return jsonify({
        'success': True,
        'real_roads_available': status['configured'],
        'api_configured': status['configured'],
        'message': 'OpenRouteService API configured' if status['configured'] else 'ORS_API_KEY not set'
    })


@app.route('/api/set-api-key', methods=['POST'])
def set_routing_api_key():
    """Set the OpenRouteService API key (for development/testing)"""
    try:
        data = request.json
        api_key = data.get('api_key', '')

        if not api_key or len(api_key) < 10:
            return jsonify({
                'success': False,
                'error': 'Invalid API key'
            }), 400

        set_api_key(api_key)

        return jsonify({
            'success': True,
            'message': 'API key configured successfully'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    routing_status = get_api_status()
    return jsonify({
        'status': 'healthy',
        'service': 'quantum-logistics-api',
        'real_roads_available': routing_status['configured']
    })


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5001))

    print("=" * 60)
    print("QUANTUM LOGISTICS SERVER")
    print("=" * 60)

    # Check routing API status
    routing_status = get_api_status()
    if routing_status['configured']:
        print(f"\n[OK] Real roads routing: ENABLED")
        print(f"     API Key: {routing_status['api_key_preview']}")
    else:
        print(f"\n[INFO] Real roads routing: DISABLED")
        print(f"       Set ORS_API_KEY environment variable to enable")
        print(f"       Get free API key at: https://openrouteservice.org")

    print(f"\nServer starting at: http://localhost:{port}")
    print("Press Ctrl+C to stop the server\n")
    print("=" * 60)

    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,
        threaded=True
    )
