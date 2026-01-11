from __future__ import annotations

import os


def _env(key: str, default: str | None = None) -> str | None:
    v = os.getenv(key)
    if v is None or v == "":
        return default
    return v


class Settings:
    # GeoServer
    GEOSERVER_URL: str = _env("GEOSERVER_URL", "http://10.8.49.5:8080/geoserver")
    GEOSERVER_USER: str = _env("GEOSERVER_USER", "admin")
    GEOSERVER_PASSWORD: str = _env("GEOSERVER_PASSWORD", "geoserver")
    GEOSERVER_WORKSPACE: str = _env("GEOSERVER_WORKSPACE", "webgis")

    # Service
    DATA_DIR: str = _env("RASTEROPS_DATA_DIR", "/data")
    PUBLIC_BASE_URL: str = _env("RASTEROPS_PUBLIC_BASE_URL", "http://10.8.49.5:9001")

    # CORS
    CORS_ALLOW_ORIGINS: str = _env("CORS_ALLOW_ORIGINS", "*")


settings = Settings()
