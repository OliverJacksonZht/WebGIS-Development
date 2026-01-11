from __future__ import annotations

import traceback
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Callable, Optional

from db import DB, utc_now_iso


@dataclass
class JobResult:
    output_asset_id: Optional[str] = None
    message: str = ""


class JobManager:
    """极简线程池任务管理：创建 job -> 后台执行 -> 更新 DB 状态"""

    def __init__(self, db: DB, max_workers: int = 2):
        self.db = db
        self.pool = ThreadPoolExecutor(max_workers=max_workers)

    def submit(self, job_id: str, fn: Callable[[], JobResult]) -> None:
        def _run() -> None:
            self.db.update_job(job_id, status="running", updated_at=utc_now_iso(), message=None)
            try:
                res = fn()
                self.db.update_job(
                    job_id,
                    status="done",
                    updated_at=utc_now_iso(),
                    output_asset_id=res.output_asset_id,
                    message=res.message,
                )
            except Exception as e:  # noqa
                tb = traceback.format_exc(limit=20)
                self.db.update_job(
                    job_id,
                    status="error",
                    updated_at=utc_now_iso(),
                    message=f"{e}\n{tb}",
                )

        self.pool.submit(_run)
