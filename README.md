# Quantum Logistics — Experimental Brazilian TSP

An educational full-stack application for comparing classical route solvers with exact classical evaluation of a QUBO model on small Traveling Salesman Problem (TSP) instances. The included dataset covers Brazil's 27 state capitals.

[Live application](https://quantum-logistics-case10.vercel.app) · [API health](https://quantum-logistics-api.vercel.app/api/health) · [API root](https://quantum-logistics-api.vercel.app/)

## Scope

The application finds a closed route for one vehicle that visits each selected location once. It is a TSP demonstrator, not a general Vehicle Routing Problem optimizer: multiple vehicles, capacities, time windows, traffic, and operational dispatch constraints are not modeled.

Implemented solvers:

| Solver | Execution | Limit | Purpose |
| --- | --- | ---: | --- |
| Brute force | Classical | 8 locations | Reproducible exact baseline |
| Nearest neighbor | Classical | 27 locations | Fast greedy heuristic |
| NetworkX approximation | Classical | 27 locations | Graph-based approximation |
| Exact eigensolver | Classical, through Qiskit's quantum optimization stack | 4 locations | Exact evaluation of the QUBO-derived Hamiltonian |

The eigensolver is not quantum hardware execution or evidence of quantum advantage. QAOA is not exposed because it was not reliable in the current application architecture.

## Architecture

```text
Browser
  └── Next.js dashboard (Vercel)
        └── /api rewrite via API_URL
              └── Flask API (separate Vercel project)
                    ├── input validation and solver registry
                    ├── Haversine distance matrix
                    ├── classical TSP solvers
                    ├── QUBO model + exact eigensolver
                    └── OpenRouteService client (optional)
```

The frontend uses a server-side `API_URL`; no backend URL or secret is exposed through a `NEXT_PUBLIC_*` variable. The API restricts CORS with `CORS_ALLOWED_ORIGINS`.

## Screenshots

| Dashboard | Route | Comparison |
| --- | --- | --- |
| ![Dashboard](snapshots/01_initial_light.png) | ![Calculated route](snapshots/04_route_calculated_light.png) | ![Solver comparison](snapshots/06_comparison_dark.png) |

## Local setup

Requirements: Python 3.10+ and Node.js 20+.

```bash
git clone https://github.com/igorconrado/quantum-logistics-case10.git
cd quantum-logistics-case10
python -m venv .venv
```

Activate the virtual environment and start the API:

```bash
# macOS/Linux
source .venv/bin/activate

# Windows PowerShell
# .\.venv\Scripts\Activate.ps1

pip install -r requirements-dev.txt
python server.py
```

The API starts at `http://localhost:5001`. In another terminal:

```bash
cd frontend_base
npm ci
npm run dev
```

Open `http://localhost:3000`. The local Next.js rewrite defaults to `http://localhost:5001`.

## Configuration

Copy `.env.example` to `.env` for the backend. The committed example contains no credentials.

| Variable | Required | Description |
| --- | --- | --- |
| `HOST` | No | Flask bind host; defaults to `0.0.0.0` |
| `PORT` | No | Flask port; defaults to `5001` |
| `FLASK_DEBUG` | No | Local debug flag; disabled by default |
| `LOG_LEVEL` | No | Python logging level |
| `CORS_ALLOWED_ORIGINS` | Production | Comma-separated trusted frontend origins |
| `ORS_API_KEY` | No | Enables OpenRouteService matrices and geometry |
| `API_URL` | Frontend deployment | Server-side Flask API base URL |

Without `ORS_API_KEY`, route costs use Haversine distances. API keys cannot be submitted through a public endpoint and must remain in the backend environment.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | Service metadata and endpoint links |
| `GET` | `/api/health` | Stable health response |
| `GET` | `/api/solvers` | Solver capabilities and limits |
| `GET` | `/api/brazil-capitals` | Dataset of 27 capitals |
| `GET` | `/api/cities` | Supported intra-city datasets |
| `GET` | `/api/city-neighborhoods/<key>` | Hub and sample locations |
| `POST` | `/api/generate-route` | Generate a bounded sample instance |
| `POST` | `/api/calculate` | Solve a validated TSP instance |
| `GET` | `/api/routing-status` | OpenRouteService availability |

Example request:

```bash
curl -X POST http://localhost:5001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "solver": "nearest_neighbor",
    "use_real_roads": false,
    "locations": [
      {"id": 0, "name": "São Paulo", "lat": -23.5505, "lon": -46.6333},
      {"id": 1, "name": "Rio de Janeiro", "lat": -22.9068, "lon": -43.1729},
      {"id": 2, "name": "Belo Horizonte", "lat": -19.9167, "lon": -43.9345}
    ]
  }'
```

## Quality gates

```bash
# Backend
python -m pytest -v

# Reproducible small evaluation
python -m benchmarks.evaluate --cities 3

# Frontend
cd frontend_base
npm ci
npm run lint
npm run build
npm audit
```

Tests use Flask's test client and mock OpenRouteService. They require no manually started server.

The evaluation records its deterministic input selection, runtime context, solver, route cost, and execution time. Its timings compare implementations on one machine; they do not establish quantum advantage.

## Deployment

- `frontend_base/` is deployed as the `quantum-logistics-case10` Vercel project.
- `api/index.py` exposes Flask as the separate `quantum-logistics-api` Vercel project.
- Set frontend `API_URL=https://quantum-logistics-api.vercel.app`.
- Set backend `CORS_ALLOWED_ORIGINS=https://quantum-logistics-case10.vercel.app`.
- `railway.json` and `Procfile` remain valid alternatives for a Gunicorn deployment.

No secrets belong in Git or in public frontend variables.

## Technical limitations

- The time-indexed QUBO formulation uses `n²` binary variables. Exact diagonalization grows exponentially and is bounded to four locations.
- The API limits payload size and accepts at most 27 locations. Brute force is separately capped at eight.
- Vercel functions have execution limits and are appropriate here only because requests are deliberately bounded.
- OpenRouteService availability, quota, and road data are external dependencies.
- No controlled scaling study, QAOA result, hardware quantum run, or quantum advantage is claimed.
- The project is educational and experimental, not production-scale logistics software.

## Repository structure

```text
api/                 Vercel Flask entry point
backend/             Geospatial logic, routing client, QUBO, and solver strategies
benchmarks/          Reproducible bounded evaluation
frontend_base/       Next.js dashboard
snapshots/           UI screenshots
tests/               Assertion-based unit and API integration tests
server.py            Flask application factory and local entry point
requirements*.txt    Bounded Python runtime and development dependencies
```

## References

- Edward Farhi, Jeffrey Goldstone, and Sam Gutmann, [A Quantum Approximate Optimization Algorithm](https://arxiv.org/abs/1411.4028) (2014).
- Danish Business Authority, [16 Danish Quantum Use Cases](https://erhvervsstyrelsen.dk/sites/default/files/2024-12/16%20Danish%20Quantum%20Use%20Cases%20-%20December%202024_0.pdf), including Case 10 on route planning by KPMG and TDC NET.
- [Qiskit Optimization documentation](https://qiskit-community.github.io/qiskit-optimization/)
- [OpenRouteService API documentation](https://openrouteservice.org/dev/#/api-docs)

## Author and license

[Igor Conrado](https://github.com/igorconrado) · [LinkedIn](https://www.linkedin.com/in/igorconrado/) · [MIT License](LICENSE)

## COBENGE demo regression checks

Total-point capacity includes the origin once. `frontend_base/lib/algorithm-limits.json`
is shared by the Python backend and TypeScript frontend: quantum methods allow 4
total points (2 or 3 neighborhoods in the UI), and brute force allows 8 total
points (at most 7 neighborhoods). Switching algorithms clamps the requested count
and keeps the first allowed points, preserving the origin and their order.

The previous intracity selector treated a total-point limit as a neighborhood
limit. It therefore generated 5 points for a quantum selection of 4 neighborhoods.
The existing solver selection contract is preserved and capacity is validated
before either routing or optimization.

Two independent error paths produced misleading zero metrics: ORS matrix `null`
entries were converted to zero-cost edges, and frontend request failures created
a result object with zero distance, time and fuel cost. The UI displayed that
object without checking success. The request was already awaited; this was not
an early asynchronous calculation. Integer rounding also discarded short distances.

Unavailable, malformed, nonfinite, negative and all-zero road matrices now fail
explicitly and are not cached. HTTP errors, missing credentials, timeout and
geometry failures do not publish metrics or history. Successful distances retain
their precision; fuel cost remains distance in km times R$0.635/km. ORS receives
`[longitude, latitude]`, with distances requested in km and durations converted
from seconds to minutes, as specified in the
[ORS matrix documentation](https://giscience.github.io/openrouteservice-r/reference/ors_matrix.html).
The displayed road matrix is the matrix used by the solver. Haversine is explicitly
labeled as a straight-line estimate; there is no automatic distance fallback.

Run offline regression checks from the repository root:

```sh
python -m pytest -q
python -m unittest test_capacity test_routing_regressions -v
cd frontend_base
npm ci
npm test
npx tsc --noEmit
npm run build
```

Manual validation (`python server.py` and `npm run dev` in separate terminals):

1. Choose Intracidade and Belo Horizonte. Quantum must offer only 2 and 3
   neighborhoods. Generate 3: the list must contain 4 points, starting at the hub.
2. Choose classical brute force. Generate 7 neighborhoods: 8 total points must
   calculate successfully. Switching back to quantum must retain only 4 points
   and set the neighborhood count to 3.
3. With real roads disabled, calculate and verify positive distance, fuel cost
   and the Haversine estimate label. Local browser checks produced 6.68283 km
   for the 4-point quantum route and 28.378 km for the 8-point brute-force route.
4. With real roads enabled and a valid `ORS_API_KEY`, verify loading followed by
   road metrics and the ORS matrix. Without a configured key, verify an explicit
   error and no numeric result cards. Retry with roads disabled to recover.
5. Offline tests inject a directed ORS matrix with 1.25/2.5 km edges and 120/180
   second durations: the result must be 3.75 km and 5 minutes. Tests also cover
   null entries, malformed matrices, HTTP 401/403/429/500, timeout, missing key,
   geometry failure, delayed responses, stale responses, and HTTP-200 error bodies.

Validation on 2026-09-16: 21 existing Python tests, 6 new Python tests and 15 frontend tests passed, along with
TypeScript and production build. Browser checks passed for both capacity limits,
actual quantum and brute-force Haversine calculations, and missing-key failure.
A live authenticated ORS success was not tested because this local environment
had no key; ORS success and service failures were tested using controlled responses.
