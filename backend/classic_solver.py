"""
Solver Clássico para VRP/TSP

Implementa algoritmos clássicos de otimização de rotas:
- Brute Force (para N pequeno)
- Heurística Nearest Neighbor
- Algoritmo de NetworkX (Christofides)
"""

from backend.capacity import ALGORITHM_LIMITS

import itertools
import numpy as np
import networkx as nx
from typing import List, Dict, Tuple
import time


def solve_tsp_brute_force(distance_matrix: np.ndarray) -> Dict:
    """
    Resolve TSP usando força bruta (testa todas as permutações).
    ATENÇÃO: Só use para N < 9 (muito lento para N >= 9)

    Args:
        distance_matrix: Matriz NxN de distâncias

    Returns:
        Dict com 'route' (lista de índices), 'total_distance' (float), 'method' (str), 'time_ms' (float)
    """
    start_time = time.time()
    n = len(distance_matrix)

    if n < 2:
        return {
            "route": [0],
            "total_distance": 0.0,
            "method": "brute_force",
            "time_ms": 0.0
        }

    if n > ALGORITHM_LIMITS["brute_force"]:
        raise ValueError("Brute force limited to 8 total points, including the origin")

    # Gerar todas as permutações (excluindo o depósito que é fixo)
    cities = list(range(1, n))
    best_route = None
    best_distance = float('inf')

    for perm in itertools.permutations(cities):
        # Rota completa: depósito (0) -> cidades -> depósito (0)
        route = [0] + list(perm) + [0]
        distance = _calculate_route_distance(route, distance_matrix)

        if distance < best_distance:
            best_distance = distance
            best_route = route

    elapsed_time = (time.time() - start_time) * 1000

    return {
        "route": best_route,
        "total_distance": best_distance,
        "method": "brute_force",
        "time_ms": elapsed_time
    }


def solve_tsp_nearest_neighbor(distance_matrix: np.ndarray) -> Dict:
    """
    Resolve TSP usando heurística Nearest Neighbor (vizinho mais próximo).
    Rápido mas não garante solução ótima.

    Args:
        distance_matrix: Matriz NxN de distâncias

    Returns:
        Dict com 'route', 'total_distance', 'method', 'time_ms'
    """
    start_time = time.time()
    n = len(distance_matrix)

    if n < 2:
        return {
            "route": [0],
            "total_distance": 0.0,
            "method": "nearest_neighbor",
            "time_ms": 0.0
        }

    # Começar no depósito (índice 0)
    unvisited = set(range(1, n))
    route = [0]
    current = 0

    while unvisited:
        # Encontrar cidade não visitada mais próxima
        nearest = min(unvisited, key=lambda city: distance_matrix[current][city])
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest

    # Retornar ao depósito
    route.append(0)

    total_distance = _calculate_route_distance(route, distance_matrix)
    elapsed_time = (time.time() - start_time) * 1000

    return {
        "route": route,
        "total_distance": total_distance,
        "method": "nearest_neighbor",
        "time_ms": elapsed_time
    }


def solve_tsp_networkx(distance_matrix: np.ndarray) -> Dict:
    """
    Resolve TSP usando algoritmo aproximado do NetworkX.
    Usa heurística mais sofisticada (similar a Christofides).

    Args:
        distance_matrix: Matriz NxN de distâncias

    Returns:
        Dict com 'route', 'total_distance', 'method', 'time_ms'
    """
    start_time = time.time()
    n = len(distance_matrix)

    if n < 2:
        return {
            "route": [0],
            "total_distance": 0.0,
            "method": "networkx_approx",
            "time_ms": 0.0
        }

    # Criar grafo completo com pesos
    G = nx.Graph()
    for i in range(n):
        for j in range(i + 1, n):
            G.add_edge(i, j, weight=distance_matrix[i][j])

    # Usar algoritmo aproximado do NetworkX
    # traveling_salesman_problem retorna ciclo começando e terminando no mesmo nó
    try:
        route = nx.approximation.traveling_salesman_problem(G, cycle=True)

        # Garantir que começa em 0
        if route[0] != 0:
            idx = route.index(0)
            route = route[idx:] + route[:idx]

        total_distance = _calculate_route_distance(route, distance_matrix)
    except Exception as e:
        # Fallback para nearest neighbor se NetworkX falhar
        print(f"NetworkX falhou: {e}. Usando Nearest Neighbor como fallback.")
        return solve_tsp_nearest_neighbor(distance_matrix)

    elapsed_time = (time.time() - start_time) * 1000

    return {
        "route": route,
        "total_distance": total_distance,
        "method": "networkx_approx",
        "time_ms": elapsed_time
    }


def solve_classic(distance_matrix: np.ndarray, force_method: str = None) -> Dict:
    """
    Resolve TSP usando o método clássico mais apropriado.

    Args:
        distance_matrix: Matriz NxN de distâncias
        force_method: Se especificado, força uso de método específico
                     ('brute_force', 'nearest_neighbor', 'networkx')

    Returns:
        Dict com 'route', 'total_distance', 'method', 'time_ms'
    """
    n = len(distance_matrix)

    if force_method:
        if force_method == "brute_force":
            return solve_tsp_brute_force(distance_matrix)
        elif force_method == "nearest_neighbor":
            return solve_tsp_nearest_neighbor(distance_matrix)
        elif force_method == "networkx":
            return solve_tsp_networkx(distance_matrix)

    # Escolher automaticamente o melhor método baseado no tamanho
    if n <= ALGORITHM_LIMITS["brute_force"]:
        # Para 8 ou menos cidades, brute force é viável e garante solução ótima
        return solve_tsp_brute_force(distance_matrix)
    else:
        # Para mais cidades, usar NetworkX (mais sofisticado que Nearest Neighbor)
        return solve_tsp_networkx(distance_matrix)


def _calculate_route_distance(route: List[int], distance_matrix: np.ndarray) -> float:
    """
    Calcula distância total de uma rota.

    Args:
        route: Lista de índices representando a rota
        distance_matrix: Matriz de distâncias

    Returns:
        Distância total em km
    """
    total = 0.0
    for i in range(len(route) - 1):
        total += distance_matrix[route[i]][route[i + 1]]
    return total


def test_classic_solver():
    """Testa o solver clássico"""
    print("=" * 60)
    print("TESTE DO SOLVER CLÁSSICO")
    print("=" * 60)

    # Criar matriz de distância de teste (4 cidades)
    test_matrix = np.array([
        [0.0, 5.2, 4.2, 3.4],
        [5.2, 0.0, 5.3, 8.6],
        [4.2, 5.3, 0.0, 5.9],
        [3.4, 8.6, 5.9, 0.0]
    ])

    print("\nMatriz de Distância (4 cidades):")
    print(test_matrix)

    # Teste 1: Brute Force
    print("\n1. Brute Force:")
    result_bf = solve_tsp_brute_force(test_matrix)
    print(f"   Rota: {result_bf['route']}")
    print(f"   Distância Total: {result_bf['total_distance']:.2f} km")
    print(f"   Tempo: {result_bf['time_ms']:.2f} ms")

    # Teste 2: Nearest Neighbor
    print("\n2. Nearest Neighbor:")
    result_nn = solve_tsp_nearest_neighbor(test_matrix)
    print(f"   Rota: {result_nn['route']}")
    print(f"   Distância Total: {result_nn['total_distance']:.2f} km")
    print(f"   Tempo: {result_nn['time_ms']:.2f} ms")

    # Teste 3: NetworkX
    print("\n3. NetworkX Approximation:")
    result_nx = solve_tsp_networkx(test_matrix)
    print(f"   Rota: {result_nx['route']}")
    print(f"   Distância Total: {result_nx['total_distance']:.2f} km")
    print(f"   Tempo: {result_nx['time_ms']:.2f} ms")

    # Teste 4: Auto (solve_classic)
    print("\n4. Auto Selection (solve_classic):")
    result_auto = solve_classic(test_matrix)
    print(f"   Método Escolhido: {result_auto['method']}")
    print(f"   Rota: {result_auto['route']}")
    print(f"   Distância Total: {result_auto['total_distance']:.2f} km")
    print(f"   Tempo: {result_auto['time_ms']:.2f} ms")

    print("\n" + "=" * 60)
    print("TESTE CONCLUÍDO COM SUCESSO!")
    print("=" * 60)


if __name__ == "__main__":
    test_classic_solver()
