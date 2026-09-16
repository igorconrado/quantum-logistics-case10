"""
Módulo de Roteamento Real
Usa OpenRouteService para obter rotas com estradas reais

OpenRouteService API:
- Gratuito: 2000 requisições/dia
- Documentação: https://openrouteservice.org/dev/#/api-docs
"""

import requests
import hashlib
import json
import os
import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass


# ============================================================================
# CONFIGURAÇÃO
# ============================================================================

# API Key - Em produção, use variável de ambiente
ORS_API_KEY = os.getenv("ORS_API_KEY", "")
ORS_BASE_URL = "https://api.openrouteservice.org"

# Cache em memória para economizar requisições
_route_cache: Dict[str, any] = {}
_matrix_cache: Dict[str, any] = {}


# ============================================================================
# CLASSES DE DADOS
# ============================================================================

@dataclass
class RealRoute:
    """Representa uma rota real com geometria de estradas"""
    distance_km: float
    duration_min: float
    geometry: List[List[float]]  # Lista de [lon, lat]
    success: bool
    error: Optional[str] = None


@dataclass
class RealDistanceMatrix:
    """Matriz de distâncias usando rotas reais"""
    distances: np.ndarray  # Matriz NxN em km
    durations: np.ndarray  # Matriz NxN em minutos
    success: bool
    error: Optional[str] = None


# ============================================================================
# FUNÇÕES DE CACHE
# ============================================================================

def _get_cache_key(data: any) -> str:
    """Gera uma chave de cache única baseada nos dados"""
    json_str = json.dumps(data, sort_keys=True)
    return hashlib.md5(json_str.encode()).hexdigest()


def clear_cache():
    """Limpa o cache de rotas e matrizes"""
    global _route_cache, _matrix_cache
    _route_cache = {}
    _matrix_cache = {}
    print("[CACHE] Cache limpo")


# ============================================================================
# VALIDAÇÃO DE API KEY
# ============================================================================

def is_api_key_configured() -> bool:
    """Verifica se a API key está configurada"""
    return bool(ORS_API_KEY and len(ORS_API_KEY) > 10)


def set_api_key(api_key: str):
    """Define a API key programaticamente"""
    global ORS_API_KEY
    ORS_API_KEY = api_key
    print(f"[ORS] API Key configurada: {api_key[:8]}...")


def get_api_status() -> Dict:
    """Retorna o status da configuração da API"""
    return {
        "configured": is_api_key_configured(),
        "api_key_preview": ORS_API_KEY[:8] + "..." if ORS_API_KEY else None,
        "base_url": ORS_BASE_URL
    }


# ============================================================================
# FUNÇÕES DE ROTEAMENTO
# ============================================================================

def get_real_route(coordinates: List[Tuple[float, float]]) -> RealRoute:
    """
    Obtém rota real entre múltiplos pontos ordenados.

    Args:
        coordinates: Lista de (longitude, latitude) - ATENÇÃO: ORS usa lon,lat!

    Returns:
        RealRoute com distância, duração e geometria

    Exemplo:
        >>> coords = [[-46.6333, -23.5505], [-46.6825, -23.5629]]  # SP Centro -> Pinheiros
        >>> route = get_real_route(coords)
        >>> print(f"Distância: {route.distance_km:.2f} km")
    """
    if not is_api_key_configured():
        return RealRoute(
            distance_km=0,
            duration_min=0,
            geometry=[],
            success=False,
            error="API Key não configurada. Configure ORS_API_KEY."
        )

    if len(coordinates) < 2:
        return RealRoute(
            distance_km=0,
            duration_min=0,
            geometry=[],
            success=False,
            error="Mínimo 2 coordenadas necessárias"
        )

    # Verificar cache
    cache_key = _get_cache_key({"type": "route", "coords": coordinates})
    if cache_key in _route_cache:
        print(f"[CACHE] Rota encontrada no cache")
        return _route_cache[cache_key]

    try:
        url = f"{ORS_BASE_URL}/v2/directions/driving-car/geojson"

        headers = {
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json"
        }

        body = {
            "coordinates": coordinates
        }

        print(f"[ORS] Requisitando rota para {len(coordinates)} pontos...")
        response = requests.post(url, json=body, headers=headers, timeout=30)

        if response.status_code == 401:
            return RealRoute(
                distance_km=0,
                duration_min=0,
                geometry=[],
                success=False,
                error="API Key inválida ou expirada"
            )

        if response.status_code == 429:
            return RealRoute(
                distance_km=0,
                duration_min=0,
                geometry=[],
                success=False,
                error="Limite de requisições excedido (2000/dia)"
            )

        if response.status_code != 200:
            return RealRoute(
                distance_km=0,
                duration_min=0,
                geometry=[],
                success=False,
                error=f"Erro HTTP {response.status_code}: {response.text[:200]}"
            )

        data = response.json()

        if "features" not in data or len(data["features"]) == 0:
            return RealRoute(
                distance_km=0,
                duration_min=0,
                geometry=[],
                success=False,
                error=f"Resposta inválida: {data.get('error', 'Sem features')}"
            )

        feature = data["features"][0]
        properties = feature["properties"]

        # Calcular totais de todos os segmentos
        total_distance = properties.get("summary", {}).get("distance", 0) / 1000  # metros -> km
        total_duration = properties.get("summary", {}).get("duration", 0) / 60    # segundos -> min

        # Geometria da rota (lista de [lon, lat])
        geometry = feature["geometry"]["coordinates"]

        result = RealRoute(
            distance_km=total_distance,
            duration_min=total_duration,
            geometry=geometry,
            success=True
        )

        # Salvar no cache
        _route_cache[cache_key] = result
        print(f"[ORS] Rota obtida: {total_distance:.2f} km, {total_duration:.1f} min")

        return result

    except requests.exceptions.Timeout:
        return RealRoute(
            distance_km=0,
            duration_min=0,
            geometry=[],
            success=False,
            error="Timeout na requisição (30s)"
        )
    except requests.exceptions.RequestException as e:
        return RealRoute(
            distance_km=0,
            duration_min=0,
            geometry=[],
            success=False,
            error=f"Erro de conexão: {str(e)}"
        )
    except Exception as e:
        return RealRoute(
            distance_km=0,
            duration_min=0,
            geometry=[],
            success=False,
            error=f"Erro inesperado: {str(e)}"
        )


def get_distance_matrix_real(locations: List[Dict]) -> RealDistanceMatrix:
    """
    Cria matriz de distâncias usando rotas reais.

    Args:
        locations: Lista de {'lat': float, 'lon': float}

    Returns:
        RealDistanceMatrix com matrizes de distância e duração

    Exemplo:
        >>> locs = [
        ...     {'lat': -23.5505, 'lon': -46.6333},  # SP Centro
        ...     {'lat': -23.5629, 'lon': -46.6825},  # Pinheiros
        ... ]
        >>> matrix = get_distance_matrix_real(locs)
        >>> print(f"Centro -> Pinheiros: {matrix.distances[0][1]:.2f} km")
    """
    if not is_api_key_configured():
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error="API Key não configurada. Configure ORS_API_KEY."
        )

    if len(locations) < 2:
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error="Mínimo 2 localizações necessárias"
        )

    if len(locations) > 50:
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error="Máximo 50 localizações por requisição (limite ORS)"
        )

    # Verificar cache
    cache_key = _get_cache_key({"type": "matrix", "locs": locations})
    if cache_key in _matrix_cache:
        print(f"[CACHE] Matriz encontrada no cache")
        return _matrix_cache[cache_key]

    try:
        url = f"{ORS_BASE_URL}/v2/matrix/driving-car"

        headers = {
            "Authorization": ORS_API_KEY,
            "Content-Type": "application/json"
        }

        # ORS usa [longitude, latitude] - ordem invertida!
        coordinates = [[loc["lon"], loc["lat"]] for loc in locations]

        body = {
            "locations": coordinates,
            "metrics": ["distance", "duration"],
            "units": "km"
        }

        print(f"[ORS] Requisitando matriz {len(locations)}x{len(locations)}...")
        response = requests.post(url, json=body, headers=headers, timeout=60)

        if response.status_code == 401:
            return RealDistanceMatrix(
                distances=np.array([]),
                durations=np.array([]),
                success=False,
                error="API Key inválida ou expirada"
            )

        if response.status_code == 429:
            return RealDistanceMatrix(
                distances=np.array([]),
                durations=np.array([]),
                success=False,
                error="Limite de requisições excedido (2000/dia)"
            )

        if response.status_code != 200:
            return RealDistanceMatrix(
                distances=np.array([]),
                durations=np.array([]),
                success=False,
                error=f"Erro HTTP {response.status_code}: {response.text[:200]}"
            )

        data = response.json()

        if "distances" not in data:
            return RealDistanceMatrix(
                distances=np.array([]),
                durations=np.array([]),
                success=False,
                error=f"Resposta inválida: {data.get('error', 'Sem distances')}"
            )

        # Unreachable pairs are unavailable, never free edges for the solver.
        distances = np.asarray(data["distances"], dtype=float)
        durations = np.asarray(data.get("durations"), dtype=float)
        expected_shape = (len(locations), len(locations))
        for label, matrix in (("distances", distances), ("durations", durations)):
            if matrix.shape != expected_shape or not np.isfinite(matrix).all() or (matrix < 0).any():
                raise ValueError(f"ORS: matriz de {label} incompleta ou rota indisponível")
        if not np.any(distances > 0):
            raise ValueError("ORS: distância indisponível (matriz sem deslocamento)")
        durations = durations / 60  # ORS distances are requested in km; durations are seconds.

        result = RealDistanceMatrix(
            distances=distances,
            durations=durations,
            success=True
        )

        # Salvar no cache
        _matrix_cache[cache_key] = result
        print(f"[ORS] Matriz obtida: {distances.shape[0]}x{distances.shape[1]}")

        return result

    except requests.exceptions.Timeout:
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error="Timeout na requisição (60s)"
        )
    except requests.exceptions.RequestException as e:
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error=f"Erro de conexão: {str(e)}"
        )
    except Exception as e:
        return RealDistanceMatrix(
            distances=np.array([]),
            durations=np.array([]),
            success=False,
            error=f"Erro inesperado: {str(e)}"
        )


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def convert_route_to_ors_format(locations: List[Dict], route_indices: List[int]) -> List[List[float]]:
    """
    Converte uma rota (lista de índices) para formato ORS (lon, lat).

    Args:
        locations: Lista de {'lat': float, 'lon': float, ...}
        route_indices: Lista de índices representando a ordem da rota

    Returns:
        Lista de [longitude, latitude] na ordem da rota
    """
    coordinates = []
    for idx in route_indices:
        loc = locations[idx]
        coordinates.append([loc["lon"], loc["lat"]])
    return coordinates


def get_route_with_geometry(locations: List[Dict], route_indices: List[int]) -> RealRoute:
    """
    Obtém a geometria real de uma rota já calculada.
    Segments the route into consecutive pairs to avoid the ORS 6000km limit.

    Args:
        locations: Lista de localizações
        route_indices: Ordem da rota (output do solver)

    Returns:
        RealRoute com geometria das estradas (concatenated segments)
    """
    coordinates = convert_route_to_ors_format(locations, route_indices)

    if len(coordinates) < 2:
        return RealRoute(
            distance_km=0, duration_min=0, geometry=[], success=False,
            error="Mínimo 2 coordenadas necessárias"
        )

    # Try full route first (works for short routes)
    full_route = get_real_route(coordinates)
    if full_route.success:
        return full_route

    # Fallback: segment into consecutive pairs
    print(f"[ORS] Full route failed, segmenting into {len(coordinates) - 1} pairs...")
    all_geometry = []
    total_distance = 0.0
    total_duration = 0.0

    for i in range(len(coordinates) - 1):
        pair = [coordinates[i], coordinates[i + 1]]
        segment = get_real_route(pair)

        if not segment.success:
            print(f"[ORS] Segment {i} failed: {segment.error}")
            return RealRoute(
                distance_km=total_distance, duration_min=total_duration,
                geometry=all_geometry, success=False,
                error=f"Segment {i} failed: {segment.error}"
            )

        # Avoid duplicate points at segment boundaries
        if all_geometry and segment.geometry:
            all_geometry.extend(segment.geometry[1:])
        else:
            all_geometry.extend(segment.geometry)

        total_distance += segment.distance_km
        total_duration += segment.duration_min

    print(f"[ORS] Segmented route: {total_distance:.2f} km, {total_duration:.1f} min, {len(all_geometry)} geometry points")

    return RealRoute(
        distance_km=total_distance,
        duration_min=total_duration,
        geometry=all_geometry,
        success=True
    )


# ============================================================================
# TESTE DO MÓDULO
# ============================================================================

def test_routing_module():
    """Testa o módulo de roteamento"""
    print("=" * 60)
    print("TESTE DO MÓDULO DE ROTEAMENTO")
    print("=" * 60)

    # Verificar configuração
    print("\n1. Verificando configuração da API...")
    status = get_api_status()
    print(f"   Configurada: {status['configured']}")
    print(f"   API Key: {status['api_key_preview']}")

    if not status['configured']:
        print("\n[AVISO] API Key não configurada!")
        print("   Configure a variável de ambiente ORS_API_KEY")
        print("   Ou use: set_api_key('sua-api-key')")
        print("\n" + "=" * 60)
        return

    # Teste de rota simples
    print("\n2. Testando rota São Paulo Centro -> Pinheiros...")
    coords = [
        [-46.6333, -23.5505],  # SP Centro
        [-46.6825, -23.5629],  # Pinheiros
    ]

    route = get_real_route(coords)

    if route.success:
        print(f"   [OK] Rota obtida!")
        print(f"   Distância: {route.distance_km:.2f} km")
        print(f"   Duração: {route.duration_min:.1f} min")
        print(f"   Pontos na geometria: {len(route.geometry)}")
    else:
        print(f"   [ERRO] {route.error}")

    # Teste de matriz
    print("\n3. Testando matriz de distâncias (3 pontos)...")
    locations = [
        {'lat': -23.5505, 'lon': -46.6333, 'name': 'Centro'},
        {'lat': -23.5629, 'lon': -46.6825, 'name': 'Pinheiros'},
        {'lat': -23.5880, 'lon': -46.6386, 'name': 'Vila Mariana'},
    ]

    matrix = get_distance_matrix_real(locations)

    if matrix.success:
        print(f"   [OK] Matriz obtida!")
        print(f"   Dimensões: {matrix.distances.shape}")
        print(f"\n   Matriz de Distâncias (km):")
        for i, loc in enumerate(locations):
            print(f"   {loc['name']}: {matrix.distances[i]}")
    else:
        print(f"   [ERRO] {matrix.error}")

    print("\n" + "=" * 60)
    print("TESTE CONCLUÍDO!")
    print("=" * 60)


if __name__ == "__main__":
    test_routing_module()
