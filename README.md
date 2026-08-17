# Quantum Logistics — Experimental TSP Solver

An educational full-stack project that models small Traveling Salesman Problem (TSP) instances as a Quadratic Unconstrained Binary Optimization (QUBO) problem and compares their solution with classical routing methods.

## Problem

The application finds a closed route that visits each selected location once. It addresses the single-vehicle TSP, not the full Vehicle Routing Problem: vehicle capacities, multiple vehicles, delivery time windows, traffic, and other operational constraints are outside the current model.

## Implemented scope

- TSP formulation with `n²` binary variables, assignment constraints, and a distance-minimization objective.
- Conversion of the constrained `QuadraticProgram` to QUBO with Qiskit Optimization.
- Exact minimum-eigensolver execution through `NumPyMinimumEigensolver` for instances of up to four locations.
- Classical brute-force, nearest-neighbor, and NetworkX approximation solvers.
- A Flask JSON API for locations, route generation, calculation, routing status, and health checks.
- Optional OpenRouteService matrix and directions requests for road distances and route geometry; Haversine distance is the fallback.
- A responsive Next.js dashboard with Leaflet maps, algorithm selection, route history, and timing comparison.
- Data for Brazil's 27 state capitals and intra-city sample locations.

The repository contains a QAOA code path, but the application API currently always selects the exact eigensolver. QAOA should therefore be treated as incomplete and is not part of the demonstrated execution path. The timing comparison in the interface measures local classical implementations, including the classically executed exact eigensolver; it is not evidence of quantum advantage.

## Architecture

```text
Next.js dashboard
       │ HTTP/JSON
       ▼
Flask API (server.py)
       ├── geospatial data and Haversine matrices
       ├── classical TSP solvers
       ├── QUBO model + exact eigensolver
       └── OpenRouteService client (optional)
```

## Technologies

- Backend: Python, Flask, NumPy, NetworkX, Qiskit, Qiskit Optimization, Requests
- Frontend: TypeScript, Next.js 16, React 19, Tailwind CSS, shadcn/ui, Leaflet, Framer Motion
- Deployment configuration: Vercel for the frontend and Railway/Gunicorn for the API

## Technical limitations

This is an experimental demonstration, not a production logistics optimizer.

The time-indexed TSP formulation requires `n²` binary variables, which become qubits after conversion to an Ising operator. Classical simulation of a general quantum state grows exponentially with that qubit count. The backend consequently rejects more than four locations for its exact eigensolver path. The previous README's RAM table was not backed by a reproducible benchmark and has been removed.

Quantum hardware does not remove the model's qubit requirements. Practical execution is also constrained by available qubits, connectivity, circuit depth, sampling, noise, error mitigation, and optimizer behavior. No hardware execution, scaling study, statistically controlled benchmark, or quantum advantage is demonstrated here.

The classical solver uses brute force for at most eight locations and a NetworkX approximation above that threshold. Its results and timings should not be generalized beyond the tested instances.

## Screenshots

| Dashboard | Route result | Comparison |
| --- | --- | --- |
| ![Initial dashboard](snapshots/01_initial_light.png) | ![Calculated route](snapshots/04_route_calculated_light.png) | ![Algorithm comparison](snapshots/06_comparison_dark.png) |

Additional light and dark screenshots are available in [`snapshots/`](snapshots/).

## Run locally

### Backend

Python 3.10 or newer is recommended.

```bash
git clone https://github.com/igorconrado/quantum-logistics-case10.git
cd quantum-logistics-case10
python -m venv .venv
```

On macOS or Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

The development server defaults to `http://localhost:5001`. The Flask root route still references a removed server-rendered template, so use the JSON endpoints (for example, `http://localhost:5001/api/health`) or run the Next.js frontend.

### Frontend

In a second terminal:

```bash
cd frontend_base
npm ci
npm run dev
```

Open `http://localhost:3000`. The checked-in Next.js configuration proxies local `/api/*` requests to `http://localhost:5001`.

## Environment variables

Copy the example file and add only values needed for your environment:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `ORS_API_KEY` | No | Enables OpenRouteService road matrices and route geometry. Without it, the backend uses Haversine distances. |
| `PORT` | No | Flask port; defaults to `5001` when running `server.py`. |
| `FLASK_DEBUG` | No | Set to `1` to enable Flask debug mode locally. |
| `NEXT_PUBLIC_API_URL` | Deployment only | Base URL of the deployed Flask API. Leave unset for the local rewrite. |

Never commit `.env` files or API keys. Although a development endpoint can set an OpenRouteService key in process memory, environment-based configuration is preferred.

## Tests and checks

The root `test_*.py` files are executable integration scripts rather than a conventional isolated pytest suite. Start the backend on port 5000 before running them because they contain a fixed `http://localhost:5000` base URL:

```bash
PORT=5000 python server.py
python test_api.py
python test_capitals.py
python test_depot_selection.py
python test_implementation.py
python test_point_selection.py
```

On Windows PowerShell, use `$env:PORT = "5000"` before starting the server. These scripts primarily print responses and contain few or no assertions, so a zero exit code is not equivalent to comprehensive automated verification.

Frontend production build:

```bash
cd frontend_base
npm ci
npm run build
```

## Repository structure

```text
.
├── backend/          # Geospatial data, classical solvers, QUBO model, and ORS client
├── frontend_base/    # Next.js dashboard
├── snapshots/        # Existing UI screenshots
├── server.py         # Flask API entry point
├── test_*.py         # HTTP integration and exploratory scripts
├── requirements.txt  # Python dependencies
├── Procfile          # Gunicorn process definition
└── railway.json      # Railway deployment configuration
```

## References

- Edward Farhi, Jeffrey Goldstone, and Sam Gutmann, [A Quantum Approximate Optimization Algorithm](https://arxiv.org/abs/1411.4028) (2014).
- Chris Bernhardt, [Quantum Computing for Everyone](https://mitpress.mit.edu/9780262539531/quantum-computing-for-everyone/) (MIT Press, 2019).
- Danish Business Authority, [16 Danish Quantum Use Cases](https://erhvervsstyrelsen.dk/sites/default/files/2024-12/16%20Danish%20Quantum%20Use%20Cases%20-%20December%202024_0.pdf), including Case 10 on route planning by KPMG and TDC NET.
- [Qiskit Optimization documentation](https://qiskit-community.github.io/qiskit-optimization/)
- [OpenRouteService API documentation](https://openrouteservice.org/dev/#/api-docs)

## Links

- [Live frontend](https://quantum-logistics-case10.vercel.app) — the page was reachable on August 17, 2026; its `/api/health` route returned 404, so API-backed interactions may be unavailable.
- [LinkedIn](https://www.linkedin.com/in/igorconrado/)
- [GitHub profile](https://github.com/igorconrado)

## Realistic next steps

- Wire the QAOA selection through the API and configure a Qiskit sampler explicitly.
- Replace script-style checks with isolated unit tests and assertion-based API integration tests.
- Restore and document a reachable production API for the Vercel frontend.
- Add reproducible benchmark fixtures, environment metadata, and repeated measurements before publishing performance claims.
- Explore smaller encodings, decomposition, and hybrid heuristics before attempting larger instances or quantum hardware.
- Extend the model only with validated operational constraints such as capacity, multiple vehicles, or time windows.

## License and credits

Released under the [MIT License](LICENSE). The project was inspired by the Danish quantum use case on route planning and uses the open-source projects referenced above. Created by [Igor Conrado](https://github.com/igorconrado).
