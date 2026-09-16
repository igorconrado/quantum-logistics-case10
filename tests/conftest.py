import pytest

from server import create_app


@pytest.fixture()
def app(monkeypatch):
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://example.test")
    return create_app(testing=True)


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def locations():
    return [
        {"id": 0, "name": "São Paulo", "lat": -23.5505, "lon": -46.6333},
        {"id": 1, "name": "Rio de Janeiro", "lat": -22.9068, "lon": -43.1729},
        {"id": 2, "name": "Belo Horizonte", "lat": -19.9167, "lon": -43.9345},
    ]
