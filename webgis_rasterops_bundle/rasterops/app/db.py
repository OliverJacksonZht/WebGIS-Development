from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DB:
    def __init__(self, db_path: str):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS assets (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    path TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    meta_json TEXT NOT NULL,
                    geoserver_layer TEXT,
                    geoserver_store TEXT,
                    published_at TEXT
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    kind TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    params_json TEXT NOT NULL,
                    output_asset_id TEXT,
                    message TEXT
                );
                """
            )

    # ---------- Assets ----------
    def insert_asset(self, asset: Dict[str, Any]) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO assets(id, filename, kind, path, created_at, meta_json, geoserver_layer, geoserver_store, published_at)
                VALUES(?,?,?,?,?,?,?,?,?)
                """,
                (
                    asset["id"],
                    asset["filename"],
                    asset["kind"],
                    asset["path"],
                    asset["created_at"],
                    json.dumps(asset.get("meta", {}), ensure_ascii=False),
                    asset.get("geoserver_layer"),
                    asset.get("geoserver_store"),
                    asset.get("published_at"),
                ),
            )

    def list_assets(self) -> list[Dict[str, Any]]:
        with self._lock, self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM assets ORDER BY created_at DESC"
            ).fetchall()
        return [self._row_to_asset(r) for r in rows]

    def get_asset(self, asset_id: str) -> Optional[Dict[str, Any]]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM assets WHERE id=?", (asset_id,)).fetchone()
        return self._row_to_asset(row) if row else None

    def update_asset_publish(self, asset_id: str, layer: str, store: str) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                UPDATE assets
                SET geoserver_layer=?, geoserver_store=?, published_at=?
                WHERE id=?
                """,
                (layer, store, utc_now_iso(), asset_id),
            )

    def delete_asset(self, asset_id: str) -> None:
        """Hard delete an asset row."""
        with self._lock, self._connect() as conn:
            conn.execute("DELETE FROM assets WHERE id=?", (asset_id,))

    def _row_to_asset(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "filename": row["filename"],
            "kind": row["kind"],
            "path": row["path"],
            "created_at": row["created_at"],
            "meta": json.loads(row["meta_json"] or "{}"),
            "geoserver_layer": row["geoserver_layer"],
            "geoserver_store": row["geoserver_store"],
            "published_at": row["published_at"],
        }

    # ---------- Jobs ----------
    def insert_job(self, job: Dict[str, Any]) -> None:
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT INTO jobs(id, kind, status, created_at, updated_at, params_json, output_asset_id, message)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                (
                    job["id"],
                    job["kind"],
                    job["status"],
                    job["created_at"],
                    job["updated_at"],
                    json.dumps(job.get("params", {}), ensure_ascii=False),
                    job.get("output_asset_id"),
                    job.get("message"),
                ),
            )

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock, self._connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id=?", (job_id,)).fetchone()
        return self._row_to_job(row) if row else None

    def update_job(self, job_id: str, **fields: Any) -> None:
        allowed = {"status", "updated_at", "output_asset_id", "message"}
        sets = []
        params = []
        for k, v in fields.items():
            if k not in allowed:
                continue
            sets.append(f"{k}=?")
            params.append(v)
        if not sets:
            return
        params.append(job_id)
        with self._lock, self._connect() as conn:
            conn.execute(f"UPDATE jobs SET {', '.join(sets)} WHERE id=?", tuple(params))

    def _row_to_job(self, row: sqlite3.Row) -> Dict[str, Any]:
        return {
            "id": row["id"],
            "kind": row["kind"],
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "params": json.loads(row["params_json"] or "{}"),
            "output_asset_id": row["output_asset_id"],
            "message": row["message"],
        }
