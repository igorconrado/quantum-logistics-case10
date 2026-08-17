"""
Solver Quântico para TSP

Executa a otimização quântica usando o problema QUBO formulado.
Usa simulador Qiskit Aer localmente.
"""

import numpy as np
import time
from typing import Dict, List
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import NumPyMinimumEigensolver
from qiskit_optimization.converters import QuadraticProgramToQubo

try:
    from backend.quantum_model import build_tsp_qubo
except ImportError:
    from quantum_model import build_tsp_qubo


def decode_quantum_solution(solution_vector: np.ndarray, n: int) -> List[int]:
    """
    Decodifica o vetor de solução quântica para uma rota TSP.

    Args:
        solution_vector: Vetor binário de tamanho n*n representando x[i][t]
        n: Número de cidades

    Returns:
        Lista de índices representando a rota (começando e terminando em 0)
    """
    # Reorganizar vetor em matriz n x n
    # x[i][t] = 1 significa que a cidade i é visitada no tempo t
    x_matrix = solution_vector.reshape(n, n)

    # Construir rota: para cada tempo t, encontrar qual cidade i tem x[i][t] = 1
    route = []
    for t in range(n):
        for i in range(n):
            if x_matrix[i][t] > 0.5:  # Usar threshold para lidar com imprecisão numérica
                route.append(i)
                break

    # Garantir que a rota começa em 0 (depósito)
    if route and route[0] != 0:
        idx = route.index(0)
        route = route[idx:] + route[:idx]

    # Adicionar retorno ao depósito
    if route:
        route.append(0)

    return route


def calculate_route_distance(route: List[int], distance_matrix: np.ndarray) -> float:
    """
    Calcula a distância total de uma rota.

    Args:
        route: Lista de índices da rota
        distance_matrix: Matriz de distâncias

    Returns:
        Distância total em km
    """
    total = 0.0
    for i in range(len(route) - 1):
        total += distance_matrix[route[i]][route[i + 1]]
    return total


def solve_quantum(distance_matrix: np.ndarray) -> Dict:
    """
    Resolve TSP usando otimização quântica (simulação).

    Args:
        distance_matrix: Matriz NxN de distâncias
    Returns:
        Dict com 'route', 'total_distance', 'method', 'time_ms', 'success'
    """
    start_time = time.time()
    n = len(distance_matrix)

    # The n²-variable formulation and exact diagonalization are intentionally bounded.
    if n > 4:
        elapsed_time = (time.time() - start_time) * 1000
        return {
            "route": [],
            "total_distance": float('inf'),
            "method": "quantum_failed",
            "time_ms": elapsed_time,
            "success": False,
            "error": f"Exact eigensolver limited to 4 locations (received {n})"
        }

    try:
        # Construir QUBO
        qp = build_tsp_qubo(distance_matrix)

        # Converter para QUBO puro (sem constraints como penalidades)
        converter = QuadraticProgramToQubo()
        qubo = converter.convert(qp)

        # Exact diagonalization is classical; Qiskit supplies the modeling stack.
        solver = NumPyMinimumEigensolver()
        method = "exact_eigensolver"

        # Executar otimização
        optimizer = MinimumEigenOptimizer(solver)
        result = optimizer.solve(qubo)

        # Decodificar solução
        solution_vector = np.array([result.x[i] for i in range(len(result.x))])
        route = decode_quantum_solution(solution_vector, n)

        # Calcular distância real
        if len(route) > 1:
            total_distance = calculate_route_distance(route, distance_matrix)
        else:
            total_distance = 0.0

        elapsed_time = (time.time() - start_time) * 1000

        return {
            "route": route,
            "total_distance": total_distance,
            "method": method,
            "time_ms": elapsed_time,
            "success": True
        }

    except Exception as e:
        elapsed_time = (time.time() - start_time) * 1000
        print(f"Erro na otimização quântica: {e}")

        return {
            "route": [],
            "total_distance": float('inf'),
            "method": "quantum_failed",
            "time_ms": elapsed_time,
            "success": False,
            "error": str(e)
        }


def test_quantum_solver():
    """Testa o solver quântico"""
    print("=" * 60)
    print("TESTE DO SOLVER QUÂNTICO")
    print("=" * 60)

    # Criar matriz de distância pequena (3 cidades)
    test_matrix = np.array([
        [0.0, 5.2, 4.2],
        [5.2, 0.0, 5.3],
        [4.2, 5.3, 0.0]
    ])

    print("\nMatriz de Distância (3 cidades):")
    print(test_matrix)

    # Teste com solver exato
    print("\nExecutando Solver Quântico (Exato - NumPy)...")
    result = solve_quantum(test_matrix)

    if result['success']:
        print(f"\n[OK] Solução encontrada!")
        print(f"  Método: {result['method']}")
        print(f"  Rota: {result['route']}")
        print(f"  Distância Total: {result['total_distance']:.2f} km")
        print(f"  Tempo: {result['time_ms']:.2f} ms")
    else:
        print(f"\n[ERRO] Falha na otimização:")
        print(f"  {result.get('error', 'Erro desconhecido')}")

    print("\n" + "=" * 60)
    print("TESTE CONCLUÍDO!")
    print("=" * 60)


if __name__ == "__main__":
    test_quantum_solver()
