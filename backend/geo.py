"""
Módulo de Geografia e Cálculos de Distância

Contém classes e funções para:
- Representação de localizações geográficas
- Cálculo de distâncias usando fórmula de Haversine
- Geração de matriz de distâncias
"""

import math
import numpy as np
from typing import List
from dataclasses import dataclass


@dataclass
class Location:
    """Representa uma localização geográfica"""
    id: int
    name: str
    lat: float
    lon: float

    def __repr__(self):
        return f"Location({self.id}, '{self.name}', {self.lat:.4f}, {self.lon:.4f})"


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine.

    Args:
        lat1, lon1: Latitude e longitude do primeiro ponto (em graus)
        lat2, lon2: Latitude e longitude do segundo ponto (em graus)

    Returns:
        Distância em quilômetros
    """
    # Raio da Terra em km
    R = 6371.0

    # Converter graus para radianos
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    # Diferenças
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    # Fórmula de Haversine
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance


def calculate_distance(loc1: Location, loc2: Location) -> float:
    """
    Calcula a distância entre duas localizações.

    Args:
        loc1: Primeira localização
        loc2: Segunda localização

    Returns:
        Distância em quilômetros
    """
    return haversine(loc1.lat, loc1.lon, loc2.lat, loc2.lon)


class DistanceMatrix:
    """
    Gera e armazena matriz de distâncias entre múltiplas localizações.
    """

    def __init__(self, locations: List[Location]):
        """
        Inicializa a matriz de distâncias.

        Args:
            locations: Lista de objetos Location
        """
        self.locations = locations
        self.n = len(locations)
        self.matrix = self._compute_matrix()

    def _compute_matrix(self) -> np.ndarray:
        """
        Computa a matriz de distâncias NxN.

        Returns:
            Array NumPy NxN com distâncias em km
        """
        matrix = np.zeros((self.n, self.n))

        for i in range(self.n):
            for j in range(self.n):
                if i != j:
                    matrix[i][j] = calculate_distance(
                        self.locations[i],
                        self.locations[j]
                    )

        return matrix

    def get_distance(self, i: int, j: int) -> float:
        """
        Retorna a distância entre dois pontos pelos índices.

        Args:
            i: Índice do primeiro ponto
            j: Índice do segundo ponto

        Returns:
            Distância em quilômetros
        """
        return self.matrix[i][j]

    def __repr__(self):
        return f"DistanceMatrix({self.n}x{self.n})\n{self.matrix}"


# Test data
SAO_PAULO_TEST_LOCATIONS = [
    Location(0, "Depósito Centro", -23.5505, -46.6333),
    Location(1, "Pinheiros", -23.5629, -46.6825),
    Location(2, "Vila Mariana", -23.5880, -46.6386),
    Location(3, "Mooca", -23.5489, -46.5997),
    Location(4, "Santana", -23.5050, -46.6289),
    Location(5, "Tatuapé", -23.5403, -46.5768),
    Location(6, "Butantã", -23.5730, -46.7206),
    Location(7, "Ipiranga", -23.5944, -46.6070),
]

# ============================================================================
# ALL 27 BRAZILIAN STATE CAPITALS - Hub + 10 Neighborhoods each
# ============================================================================

def _make_city(hub_name, hub_lat, hub_lon, neighborhoods):
    """Helper to build a city's location list: hub (id=0) + neighborhoods (id=1..N)."""
    locs = [Location(0, hub_name, hub_lat, hub_lon)]
    for i, (name, lat, lon) in enumerate(neighborhoods, start=1):
        locs.append(Location(i, name, lat, lon))
    return locs

# --- Data per capital ---

RIO_BRANCO_LOCATIONS = _make_city("Hub Rio Branco", -9.9754, -67.8249, [
    ("Centro", -9.9747, -67.8100),
    ("Bosque", -9.9650, -67.8150),
    ("Estação Experimental", -9.9560, -67.8250),
    ("Aviário", -9.9700, -67.8350),
    ("Morada do Sol", -9.9850, -67.8400),
    ("Vila Ivonete", -9.9600, -67.8450),
    ("Palheiral", -9.9800, -67.8050),
    ("Parque da Maternidade", -9.9720, -67.8180),
    ("Mercado Velho", -9.9740, -67.8080),
    ("Gameleira", -9.9680, -67.8300),
])

MACEIO_LOCATIONS = _make_city("Hub Maceió", -9.6658, -35.7353, [
    ("Pajuçara", -9.6700, -35.7150),
    ("Ponta Verde", -9.6650, -35.7080),
    ("Jatiúca", -9.6550, -35.7050),
    ("Farol", -9.6720, -35.7300),
    ("Cruz das Almas", -9.6580, -35.7250),
    ("Jaraguá", -9.6680, -35.7400),
    ("Gruta de Lourdes", -9.6500, -35.7350),
    ("Serraria", -9.6350, -35.7500),
    ("Tabuleiro do Martins", -9.6200, -35.7600),
    ("Benedito Bentes", -9.6100, -35.7750),
])

MACAPA_LOCATIONS = _make_city("Hub Macapá", 0.0349, -51.0694, [
    ("Centro", 0.0380, -51.0550),
    ("Trem", 0.0300, -51.0600),
    ("Buritizal", 0.0250, -51.0700),
    ("Santa Inês", 0.0200, -51.0750),
    ("Laguinho", 0.0350, -51.0480),
    ("Zerão", 0.0150, -51.0650),
    ("Cabralzinho", 0.0100, -51.0550),
    ("Jardim Marco Zero", 0.0050, -51.0500),
    ("Fortaleza de São José", 0.0410, -51.0490),
    ("Trapiche Eliezer Levy", 0.0395, -51.0530),
])

MANAUS_LOCATIONS = _make_city("Hub Manaus", -3.1190, -60.0217, [
    ("Centro", -3.1300, -60.0230),
    ("Adrianópolis", -3.0808, -60.0258),
    ("Ponta Negra", -3.0600, -60.1050),
    ("Vieiralves", -3.1008, -60.0489),
    ("Parque 10 de Novembro", -3.0900, -60.0300),
    ("Aleixo", -3.1144, -59.9908),
    ("Flores", -3.1047, -60.0144),
    ("Cidade Nova", -2.9986, -60.0467),
    ("Distrito Industrial", -3.1350, -59.9550),
    ("Teatro Amazonas", -3.1305, -60.0233),
])

SALVADOR_LOCATIONS = _make_city("Hub Salvador", -12.9714, -38.5014, [
    ("Pelourinho", -12.9736, -38.5100),
    ("Barra", -13.0094, -38.5328),
    ("Rio Vermelho", -13.0130, -38.4900),
    ("Ondina", -13.0080, -38.5100),
    ("Pituba", -13.0047, -38.4536),
    ("Caminho das Árvores", -12.9850, -38.4550),
    ("Itapuã", -12.9497, -38.3664),
    ("Graça", -13.0020, -38.5200),
    ("Vitória", -12.9950, -38.5230),
    ("Comércio", -12.9700, -38.5130),
])

FORTALEZA_LOCATIONS = _make_city("Hub Fortaleza", -3.7172, -38.5433, [
    ("Meireles", -3.7275, -38.4931),
    ("Aldeota", -3.7328, -38.5011),
    ("Praia de Iracema", -3.7220, -38.5130),
    ("Mucuripe", -3.7230, -38.4830),
    ("Varjota", -3.7330, -38.4930),
    ("Cocó", -3.7450, -38.4780),
    ("Centro", -3.7240, -38.5280),
    ("Benfica", -3.7400, -38.5350),
    ("Praia do Futuro", -3.7380, -38.4650),
    ("Montese", -3.7661, -38.5461),
])

BRASILIA_LOCATIONS = _make_city("Hub Brasília", -15.7939, -47.8828, [
    ("Asa Sul", -15.8267, -47.9218),
    ("Asa Norte", -15.7801, -47.8919),
    ("Lago Sul", -15.8350, -47.8569),
    ("Lago Norte", -15.7500, -47.8400),
    ("Sudoeste", -15.7950, -47.9350),
    ("Noroeste", -15.7650, -47.9050),
    ("Cruzeiro", -15.8000, -47.9400),
    ("Águas Claras", -15.8350, -48.0267),
    ("Esplanada dos Ministérios", -15.7990, -47.8630),
    ("Praça dos Três Poderes", -15.7997, -47.8605),
])

VITORIA_LOCATIONS = _make_city("Hub Vitória", -20.3155, -40.3128, [
    ("Praia do Canto", -20.2950, -40.2900),
    ("Jardim da Penha", -20.2830, -40.2950),
    ("Jardim Camburi", -20.2700, -40.2800),
    ("Enseada do Suá", -20.3000, -40.2850),
    ("Centro", -20.3190, -40.3380),
    ("Mata da Praia", -20.2780, -40.2880),
    ("Bento Ferreira", -20.3100, -40.3100),
    ("Ilha do Boi", -20.3050, -40.2800),
    ("Ilha do Frade", -20.3020, -40.2750),
    ("Parque Pedra da Cebola", -20.2860, -40.2920),
])

GOIANIA_LOCATIONS = _make_city("Hub Goiânia", -16.6869, -49.2648, [
    ("Setor Bueno", -16.7050, -49.2600),
    ("Setor Marista", -16.7000, -49.2500),
    ("Setor Oeste", -16.6800, -49.2750),
    ("Jardim Goiás", -16.7100, -49.2400),
    ("Centro", -16.6790, -49.2550),
    ("Setor Sul", -16.6950, -49.2650),
    ("Setor Pedro Ludovico", -16.7150, -49.2700),
    ("Parque Flamboyant", -16.7080, -49.2480),
    ("Praça Cívica", -16.6830, -49.2620),
    ("Parque Vaca Brava", -16.7010, -49.2570),
])

SAO_LUIS_LOCATIONS = _make_city("Hub São Luís", -2.5297, -44.2825, [
    ("Centro Histórico", -2.5250, -44.2850),
    ("Ponta d'Areia", -2.4850, -44.2700),
    ("Renascença", -2.5000, -44.2800),
    ("Calhau", -2.4900, -44.2450),
    ("São Francisco", -2.5100, -44.2750),
    ("Cohama", -2.5200, -44.2550),
    ("Turu", -2.5300, -44.2400),
    ("Vinhais", -2.5350, -44.2350),
    ("Lagoa da Jansen", -2.4950, -44.2700),
    ("Espigão Costeiro", -2.4880, -44.2600),
])

CUIABA_LOCATIONS = _make_city("Hub Cuiabá", -15.6014, -56.0979, [
    ("Centro", -15.5960, -56.0970),
    ("Goiabeiras", -15.5800, -56.0750),
    ("Duque de Caxias", -15.6100, -56.0850),
    ("Bosque da Saúde", -15.5700, -56.0650),
    ("Jardim das Américas", -15.5850, -56.0550),
    ("CPA", -15.5650, -56.0800),
    ("Porto", -15.6150, -56.1050),
    ("Coxipó", -15.6200, -56.0500),
    ("Parque Mãe Bonifácia", -15.5750, -56.0900),
    ("Arena Pantanal", -15.6050, -56.1130),
])

CAMPO_GRANDE_LOCATIONS = _make_city("Hub Campo Grande", -20.4697, -54.6201, [
    ("Centro", -20.4630, -54.6150),
    ("Jardim dos Estados", -20.4500, -54.6100),
    ("Chácara Cachoeira", -20.4550, -54.5950),
    ("Tiradentes", -20.4800, -54.6300),
    ("Afonso Pena", -20.4700, -54.6100),
    ("Monte Castelo", -20.4450, -54.6250),
    ("Carandá Bosque", -20.4600, -54.5850),
    ("Parque das Nações Indígenas", -20.4530, -54.5980),
    ("Mercadão Municipal", -20.4650, -54.6180),
    ("Orla Morena", -20.4750, -54.5900),
])

BELO_HORIZONTE_LOCATIONS = _make_city("Hub Belo Horizonte", -19.9167, -43.9345, [
    ("Savassi", -19.9386, -43.9353),
    ("Lourdes", -19.9350, -43.9450),
    ("Funcionários", -19.9369, -43.9269),
    ("Centro", -19.9200, -43.9380),
    ("Belvedere", -19.9600, -43.9550),
    ("Pampulha", -19.8511, -43.9719),
    ("Floresta", -19.9220, -43.9250),
    ("Santa Tereza", -19.9180, -43.9150),
    ("Praça da Liberdade", -19.9320, -43.9380),
    ("Mercado Central", -19.9190, -43.9420),
])

BELEM_LOCATIONS = _make_city("Hub Belém", -1.4558, -48.5024, [
    ("Batista Campos", -1.4550, -48.4900),
    ("Umarizal", -1.4450, -48.4850),
    ("Nazaré", -1.4500, -48.4950),
    ("Cidade Velha", -1.4530, -48.5050),
    ("Reduto", -1.4480, -48.4980),
    ("Marco", -1.4350, -48.4750),
    ("São Brás", -1.4380, -48.4830),
    ("Estação das Docas", -1.4490, -48.5010),
    ("Ver-o-Peso", -1.4530, -48.5070),
    ("Mangal das Garças", -1.4580, -48.5030),
])

JOAO_PESSOA_LOCATIONS = _make_city("Hub João Pessoa", -7.1195, -34.8450, [
    ("Tambaú", -7.1150, -34.8300),
    ("Manaíra", -7.1100, -34.8350),
    ("Cabo Branco", -7.1300, -34.8200),
    ("Bessa", -7.0950, -34.8350),
    ("Altiplano", -7.1200, -34.8150),
    ("Centro", -7.1200, -34.8750),
    ("Bancários", -7.1500, -34.8500),
    ("Intermares", -7.0800, -34.8400),
    ("Farol do Cabo Branco", -7.1480, -34.8120),
    ("Parque Solon de Lucena", -7.1190, -34.8700),
])

CURITIBA_LOCATIONS = _make_city("Hub Curitiba", -25.4284, -49.2733, [
    ("Batel", -25.4414, -49.2831),
    ("Centro Cívico", -25.4180, -49.2700),
    ("Mercês", -25.4280, -49.2850),
    ("Água Verde", -25.4464, -49.2544),
    ("Bigorrilho", -25.4350, -49.2900),
    ("Santa Felicidade", -25.4078, -49.3336),
    ("Jardim Botânico", -25.4420, -49.2370),
    ("Cabral", -25.4100, -49.2650),
    ("Portão", -25.4856, -49.2925),
    ("Ópera de Arame", -25.3840, -49.2760),
])

RECIFE_LOCATIONS = _make_city("Hub Recife", -8.0476, -34.8770, [
    ("Boa Viagem", -8.1300, -34.9019),
    ("Pina", -8.0900, -34.8800),
    ("Recife Antigo", -8.0630, -34.8710),
    ("Casa Forte", -8.0200, -34.9100),
    ("Espinheiro", -8.0394, -34.8892),
    ("Graças", -8.0411, -34.8972),
    ("Derby", -8.0530, -34.8980),
    ("Boa Vista", -8.0500, -34.8800),
    ("Madalena", -8.0550, -34.9100),
    ("Marco Zero", -8.0630, -34.8710),
])

TERESINA_LOCATIONS = _make_city("Hub Teresina", -5.0892, -42.8019, [
    ("Centro", -5.0900, -42.8050),
    ("Jóquei", -5.0700, -42.7700),
    ("Fátima", -5.0800, -42.7850),
    ("São Cristóvão", -5.0750, -42.7950),
    ("Ininga", -5.0500, -42.7700),
    ("Ilhotas", -5.0950, -42.8100),
    ("Dirceu Arcoverde", -5.1100, -42.7600),
    ("Parque Potycabana", -5.0650, -42.7800),
    ("Ponte Estaiada", -5.0860, -42.8180),
    ("Encontro dos Rios", -5.0850, -42.8200),
])

RIO_DE_JANEIRO_LOCATIONS = _make_city("Hub Rio de Janeiro", -22.9068, -43.1729, [
    ("Copacabana", -22.9711, -43.1822),
    ("Ipanema", -22.9838, -43.2096),
    ("Leblon", -22.9830, -43.2250),
    ("Barra da Tijuca", -23.0045, -43.3647),
    ("Botafogo", -22.9519, -43.1824),
    ("Flamengo", -22.9330, -43.1730),
    ("Centro", -22.9080, -43.1770),
    ("Lapa", -22.9130, -43.1800),
    ("Santa Teresa", -22.9220, -43.1850),
    ("Tijuca", -22.9256, -43.2450),
])

NATAL_LOCATIONS = _make_city("Hub Natal", -5.7945, -35.2110, [
    ("Ponta Negra", -5.8750, -35.1830),
    ("Tirol", -5.7800, -35.2100),
    ("Petrópolis", -5.7950, -35.2200),
    ("Lagoa Nova", -5.8150, -35.2150),
    ("Candelária", -5.8300, -35.2100),
    ("Capim Macio", -5.8500, -35.2000),
    ("Ribeira", -5.7750, -35.2050),
    ("Praia do Meio", -5.7720, -35.1950),
    ("Morro do Careca", -5.8850, -35.1750),
    ("Forte dos Reis Magos", -5.7560, -35.1950),
])

PORTO_ALEGRE_LOCATIONS = _make_city("Hub Porto Alegre", -30.0346, -51.2177, [
    ("Moinhos de Vento", -30.0286, -51.2078),
    ("Cidade Baixa", -30.0450, -51.2200),
    ("Bom Fim", -30.0336, -51.2144),
    ("Centro Histórico", -30.0330, -51.2300),
    ("Bela Vista", -30.0480, -51.1900),
    ("Menino Deus", -30.0586, -51.2258),
    ("Praia de Belas", -30.0500, -51.2300),
    ("Tristeza", -30.1172, -51.2425),
    ("Orla do Guaíba", -30.0400, -51.2350),
    ("Parque Farroupilha", -30.0370, -51.2190),
])

PORTO_VELHO_LOCATIONS = _make_city("Hub Porto Velho", -8.7612, -63.9004, [
    ("Centro", -8.7600, -63.9000),
    ("Olaria", -8.7500, -63.8900),
    ("Embratel", -8.7400, -63.8750),
    ("Flodoaldo Pontes Pinto", -8.7700, -63.8850),
    ("Agenor de Carvalho", -8.7800, -63.8800),
    ("Nova Porto Velho", -8.7300, -63.9100),
    ("Estrada de Ferro Madeira-Mamoré", -8.7550, -63.9100),
    ("Parque Natural de Porto Velho", -8.7350, -63.9200),
    ("Três Caixas D'Água", -8.7650, -63.9050),
    ("Mercado Cultural", -8.7580, -63.9020),
])

BOA_VISTA_LOCATIONS = _make_city("Hub Boa Vista", 2.8195, -60.6714, [
    ("Centro", 2.8200, -60.6700),
    ("São Francisco", 2.8300, -60.6750),
    ("Caçari", 2.8100, -60.6600),
    ("Paraviana", 2.8250, -60.6550),
    ("Aparecida", 2.8150, -60.6800),
    ("Mecejana", 2.8050, -60.6750),
    ("31 de Março", 2.8350, -60.6650),
    ("Parque Anauá", 2.8180, -60.6680),
    ("Orla Taumanan", 2.8220, -60.6620),
    ("Praça das Águas", 2.8240, -60.6700),
])

FLORIANOPOLIS_LOCATIONS = _make_city("Hub Florianópolis", -27.5954, -48.5480, [
    ("Centro", -27.5950, -48.5500),
    ("Beira-Mar Norte", -27.5850, -48.5450),
    ("Trindade", -27.5800, -48.5200),
    ("Lagoa da Conceição", -27.6050, -48.4700),
    ("Jurerê Internacional", -27.4400, -48.4950),
    ("Campeche", -27.6700, -48.4700),
    ("Ingleses", -27.4350, -48.4000),
    ("Canasvieiras", -27.4300, -48.4600),
    ("Coqueiros", -27.5920, -48.5700),
    ("Ponte Hercílio Luz", -27.5950, -48.5530),
])

SAO_PAULO_LOCATIONS = _make_city("Hub São Paulo", -23.5505, -46.6333, [
    ("Avenida Paulista", -23.5614, -46.6558),
    ("Pinheiros", -23.5629, -46.6825),
    ("Vila Madalena", -23.5460, -46.6920),
    ("Itaim Bibi", -23.5870, -46.6750),
    ("Jardins", -23.5660, -46.6650),
    ("Moema", -23.6010, -46.6650),
    ("Liberdade", -23.5570, -46.6340),
    ("Centro Histórico", -23.5450, -46.6350),
    ("Vila Mariana", -23.5880, -46.6386),
    ("Parque Ibirapuera", -23.5870, -46.6576),
])

ARACAJU_LOCATIONS = _make_city("Hub Aracaju", -10.9091, -37.0677, [
    ("Atalaia", -10.9700, -37.0500),
    ("Jardins", -10.9300, -37.0600),
    ("13 de Julho", -10.9150, -37.0500),
    ("Garcia", -10.9100, -37.0700),
    ("Centro", -10.9100, -37.0750),
    ("Farolândia", -10.9400, -37.0650),
    ("Siqueira Campos", -10.9200, -37.0550),
    ("Orla de Atalaia", -10.9750, -37.0450),
    ("Passarela do Caranguejo", -10.9720, -37.0480),
    ("Mercado Municipal", -10.9120, -37.0730),
])

PALMAS_LOCATIONS = _make_city("Hub Palmas", -10.1689, -48.3317, [
    ("Plano Diretor Sul", -10.1900, -48.3350),
    ("Plano Diretor Norte", -10.1500, -48.3300),
    ("Graciosa", -10.1400, -48.3050),
    ("Taquaralto", -10.2100, -48.3500),
    ("Aureny III", -10.2200, -48.3400),
    ("Praça dos Girassóis", -10.1850, -48.3340),
    ("Parque Cesamar", -10.1750, -48.3250),
    ("Ilha Canela", -10.1600, -48.3100),
    ("Palácio Araguaia", -10.1870, -48.3360),
    ("Ponte da Amizade", -10.1550, -48.3200),
])

# ============================================================================
# CAPITALS HUB LIST (for inter-city routing)
# ============================================================================
BRAZIL_CAPITALS_HUBS = [
    RIO_BRANCO_LOCATIONS[0],
    MACEIO_LOCATIONS[0],
    MACAPA_LOCATIONS[0],
    MANAUS_LOCATIONS[0],
    SALVADOR_LOCATIONS[0],
    FORTALEZA_LOCATIONS[0],
    BRASILIA_LOCATIONS[0],
    VITORIA_LOCATIONS[0],
    GOIANIA_LOCATIONS[0],
    SAO_LUIS_LOCATIONS[0],
    CUIABA_LOCATIONS[0],
    CAMPO_GRANDE_LOCATIONS[0],
    BELO_HORIZONTE_LOCATIONS[0],
    BELEM_LOCATIONS[0],
    JOAO_PESSOA_LOCATIONS[0],
    CURITIBA_LOCATIONS[0],
    RECIFE_LOCATIONS[0],
    TERESINA_LOCATIONS[0],
    RIO_DE_JANEIRO_LOCATIONS[0],
    NATAL_LOCATIONS[0],
    PORTO_ALEGRE_LOCATIONS[0],
    PORTO_VELHO_LOCATIONS[0],
    BOA_VISTA_LOCATIONS[0],
    FLORIANOPOLIS_LOCATIONS[0],
    SAO_PAULO_LOCATIONS[0],
    ARACAJU_LOCATIONS[0],
    PALMAS_LOCATIONS[0],
]

# Re-index hubs for inter-city routing
for _i, _loc in enumerate(BRAZIL_CAPITALS_HUBS):
    _loc.id = _i

BRAZIL_CAPITALS_LOCATIONS = BRAZIL_CAPITALS_HUBS

# ============================================================================
# CITIES DICTIONARY
# ============================================================================
_ALL_CITIES = [
    ("rio_branco", "Rio Branco (AC)", RIO_BRANCO_LOCATIONS),
    ("maceio", "Maceió (AL)", MACEIO_LOCATIONS),
    ("macapa", "Macapá (AP)", MACAPA_LOCATIONS),
    ("manaus", "Manaus (AM)", MANAUS_LOCATIONS),
    ("salvador", "Salvador (BA)", SALVADOR_LOCATIONS),
    ("fortaleza", "Fortaleza (CE)", FORTALEZA_LOCATIONS),
    ("brasilia", "Brasília (DF)", BRASILIA_LOCATIONS),
    ("vitoria", "Vitória (ES)", VITORIA_LOCATIONS),
    ("goiania", "Goiânia (GO)", GOIANIA_LOCATIONS),
    ("sao_luis", "São Luís (MA)", SAO_LUIS_LOCATIONS),
    ("cuiaba", "Cuiabá (MT)", CUIABA_LOCATIONS),
    ("campo_grande", "Campo Grande (MS)", CAMPO_GRANDE_LOCATIONS),
    ("belo_horizonte", "Belo Horizonte (MG)", BELO_HORIZONTE_LOCATIONS),
    ("belem", "Belém (PA)", BELEM_LOCATIONS),
    ("joao_pessoa", "João Pessoa (PB)", JOAO_PESSOA_LOCATIONS),
    ("curitiba", "Curitiba (PR)", CURITIBA_LOCATIONS),
    ("recife", "Recife (PE)", RECIFE_LOCATIONS),
    ("teresina", "Teresina (PI)", TERESINA_LOCATIONS),
    ("rio_de_janeiro", "Rio de Janeiro (RJ)", RIO_DE_JANEIRO_LOCATIONS),
    ("natal", "Natal (RN)", NATAL_LOCATIONS),
    ("porto_alegre", "Porto Alegre (RS)", PORTO_ALEGRE_LOCATIONS),
    ("porto_velho", "Porto Velho (RO)", PORTO_VELHO_LOCATIONS),
    ("boa_vista", "Boa Vista (RR)", BOA_VISTA_LOCATIONS),
    ("florianopolis", "Florianópolis (SC)", FLORIANOPOLIS_LOCATIONS),
    ("sao_paulo", "São Paulo (SP)", SAO_PAULO_LOCATIONS),
    ("aracaju", "Aracaju (SE)", ARACAJU_LOCATIONS),
    ("palmas", "Palmas (TO)", PALMAS_LOCATIONS),
]

CITIES_DATA = {}
for _idx, (_key, _name, _locs) in enumerate(_ALL_CITIES):
    CITIES_DATA[_key] = {
        "id": _idx,
        "name": _name,
        "hub": _locs[0],
        "neighborhoods": _locs[1:],
        "all_locations": _locs,
    }

# ============================================================================
# FUNÇÕES DE GERAÇÃO DE ROTAS
# ============================================================================

def generate_route(city_key: str, algorithm_type: str, num_points: int, method: str = None) -> List[Location]:
    """
    Gera uma rota para cálculo de TSP com base nos parâmetros fornecidos.

    Args:
        city_key: Chave da cidade no dicionário CITIES_DATA (ex: "sao_paulo")
        algorithm_type: Tipo de algoritmo ("classical" ou "quantum")
        num_points: Número de pontos de entrega desejados (excluindo o hub)

    Returns:
        Lista de Location contendo [Hub, Ponto1, Ponto2, ..., PontoN]

    Raises:
        ValueError: Se os parâmetros forem inválidos

    Exemplo:
        >>> route = generate_route("sao_paulo", "quantum", 3)
        >>> # Retorna: [Hub SP, Pinheiros, Mooca, Tatuapé] (aleatório)
    """
    import random

    # Validação de entrada
    if city_key not in CITIES_DATA:
        raise ValueError(f"Cidade inválida: {city_key}. Cidades disponíveis: {list(CITIES_DATA.keys())}")

    if algorithm_type not in ["classical", "quantum"]:
        raise ValueError(f"Tipo de algoritmo inválido: {algorithm_type}. Use 'classical' ou 'quantum'")

    from backend.capacity import validate_capacity
    validate_capacity(algorithm_type, method, num_points + 1)

    # Obter dados da cidade
    city_data = CITIES_DATA[city_key]
    hub = city_data["hub"]
    neighborhoods = city_data["neighborhoods"]

    # Selecionar aleatoriamente N bairros
    if num_points > len(neighborhoods):
        raise ValueError("Not enough neighborhoods available")
    selected_neighborhoods = random.sample(neighborhoods, num_points)

    # Montar rota: Hub sempre primeiro + bairros selecionados
    route = [hub] + selected_neighborhoods

    # Re-indexar os IDs para serem sequenciais (0, 1, 2, ..., N)
    route_reindexed = []
    for idx, loc in enumerate(route):
        route_reindexed.append(
            Location(id=idx, name=loc.name, lat=loc.lat, lon=loc.lon)
        )

    return route_reindexed


def get_city_by_index(capital_index: int) -> str:
    """
    Converts a capital index to its city key.

    Args:
        capital_index: Index of the capital (0-26)

    Returns:
        City key string (e.g. "sao_paulo")
    """
    keys = list(CITIES_DATA.keys())
    if capital_index < 0 or capital_index >= len(keys):
        raise ValueError(f"Invalid capital index: {capital_index}. Must be between 0 and {len(keys) - 1}")
    return keys[capital_index]


def test_geo_module():
    """Testa o módulo geo.py com dados de São Paulo"""
    print("=" * 60)
    print("TESTE DO MÓDULO GEO.PY")
    print("=" * 60)

    # Teste 1: Haversine entre dois pontos conhecidos
    print("\n1. Teste Haversine: Centro <-> Pinheiros")
    dist = haversine(-23.5505, -46.6333, -23.5629, -46.6825)
    print(f"   Distância: {dist:.2f} km")

    # Teste 2: Criar objetos Location
    print("\n2. Localizações de teste (São Paulo):")
    for loc in SAO_PAULO_TEST_LOCATIONS[:3]:
        print(f"   {loc}")

    # Teste 3: Matriz de Distância
    print("\n3. Matriz de Distância (primeiros 4 pontos):")
    test_locs = SAO_PAULO_TEST_LOCATIONS[:4]
    dm = DistanceMatrix(test_locs)
    print(f"\n{dm.matrix}")
    print(f"\n   Distância Centro -> Pinheiros: {dm.get_distance(0, 1):.2f} km")
    print(f"   Distância Centro -> Vila Mariana: {dm.get_distance(0, 2):.2f} km")
    print(f"   Distância Centro -> Mooca: {dm.get_distance(0, 3):.2f} km")

    print("\n" + "=" * 60)
    print("TESTE CONCLUÍDO COM SUCESSO!")
    print("=" * 60)


if __name__ == "__main__":
    test_geo_module()
