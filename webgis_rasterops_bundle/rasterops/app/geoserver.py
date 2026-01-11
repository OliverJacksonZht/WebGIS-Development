from __future__ import annotations

import os
import re
from typing import Tuple

import requests

from config import settings


def sanitize_name(name: str) -> str:
    """GeoServer store/layer 名称：尽量避免中文、空格、特殊字符。"""
    base = os.path.splitext(os.path.basename(name))[0]
    base = re.sub(r"[^A-Za-z0-9_\-]+", "_", base)
    base = base.strip("_")
    return base or "layer"


class GeoServerClient:
    def __init__(self):
        self.base = settings.GEOSERVER_URL.rstrip("/")
        self.auth = (settings.GEOSERVER_USER, settings.GEOSERVER_PASSWORD)

    def _url(self, path: str) -> str:
        return f"{self.base}/rest{path}"

    def ensure_workspace(self, ws: str) -> None:
        ws = ws.strip()
        r = requests.get(self._url(f"/workspaces/{ws}.json"), auth=self.auth)
        if r.status_code == 200:
            return
        if r.status_code != 404:
            raise RuntimeError(f"GeoServer workspace check failed: {r.status_code} {r.text}")

        payload = {"workspace": {"name": ws}}
        r2 = requests.post(
            self._url("/workspaces"),
            auth=self.auth,
            headers={"Content-Type": "application/json"},
            json=payload,
        )
        if r2.status_code not in (201, 200):
            raise RuntimeError(f"GeoServer workspace create failed: {r2.status_code} {r2.text}")

    def publish_geotiff(self, ws: str, store: str, geotiff_path: str) -> Tuple[str, str]:
        """上传 GeoTIFF 并自动配置 coverage + layer。

        返回 (store, layer_name)
        """
        self.ensure_workspace(ws)
        url = self._url(f"/workspaces/{ws}/coveragestores/{store}/file.geotiff")
        # configure=all 参考 GeoServer REST 文档
        params = {"configure": "all"}
        with open(geotiff_path, "rb") as f:
            r = requests.put(
                url,
                params=params,
                auth=self.auth,
                headers={"Content-Type": "image/tiff"},
                data=f,
            )
        if r.status_code not in (201, 200):
            raise RuntimeError(f"GeoServer publish GeoTIFF failed: {r.status_code} {r.text}")
        # 对单一 GeoTIFF，layer 通常与 store 同名
        return store, store

    def publish_shp_zip(self, ws: str, store: str, zip_path: str) -> Tuple[str, str]:
        self.ensure_workspace(ws)
        url = self._url(f"/workspaces/{ws}/datastores/{store}/file.shp")
        params = {"configure": "all"}
        with open(zip_path, "rb") as f:
            r = requests.put(
                url,
                params=params,
                auth=self.auth,
                headers={"Content-Type": "application/zip"},
                data=f,
            )
        if r.status_code not in (201, 200):
            raise RuntimeError(f"GeoServer publish Shapefile zip failed: {r.status_code} {r.text}")
        return store, store

    # -------- Delete / Unpublish --------
    def delete_coveragestore(self, ws: str, store: str, recurse: bool = True, purge: str = "all") -> None:
        """删除 coverage store，并可递归删除其 layer/resource。

        GeoServer REST 对 coverage store 的 DELETE 支持 recurse 参数；purge 控制是否清理磁盘文件（通常 all/none）。
        """
        params = {
            "recurse": "true" if recurse else "false",
            "purge": purge,
        }
        r = requests.delete(self._url(f"/workspaces/{ws}/coveragestores/{store}"), params=params, auth=self.auth)
        if r.status_code in (200, 202, 204, 404):
            return
        raise RuntimeError(f"GeoServer delete coveragestore failed: {r.status_code} {r.text}")

    def delete_datastore(self, ws: str, store: str, recurse: bool = True) -> None:
        """删除 datastore，并可递归删除其 layer/resource。"""
        params = {"recurse": "true" if recurse else "false"}
        r = requests.delete(self._url(f"/workspaces/{ws}/datastores/{store}"), params=params, auth=self.auth)
        if r.status_code in (200, 202, 204, 404):
            return
        raise RuntimeError(f"GeoServer delete datastore failed: {r.status_code} {r.text}")
