from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from config import settings
from db import DB, utc_now_iso
from gdalops import fuse_hs_rgb, gdal_info, run_gdal_calc, warp_to_match
from geoserver import GeoServerClient, sanitize_name
from jobs import JobManager, JobResult


def _data_path(*parts: str) -> str:
    return os.path.join(settings.DATA_DIR, *parts)


db = DB(_data_path("rasterops.sqlite"))
job_mgr = JobManager(db=db, max_workers=2)
geoserver = GeoServerClient()

app = FastAPI(title="rasterops", version="0.1.0")

# CORS
origins = ["*"] if settings.CORS_ALLOW_ORIGINS == "*" else [o.strip() for o in settings.CORS_ALLOW_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AssetOut(BaseModel):
    id: str
    filename: str
    kind: str
    created_at: str
    meta: Dict
    geoserver_layer: Optional[str] = None
    geoserver_store: Optional[str] = None
    published_at: Optional[str] = None


class PublishOut(BaseModel):
    workspace: str
    store: str
    layer: str


class JobOut(BaseModel):
    id: str
    kind: str
    status: str
    created_at: str
    updated_at: str
    output_asset_id: Optional[str] = None
    message: Optional[str] = None


class RasterCalcIn(BaseModel):
    inputs: Dict[str, str] = Field(..., description="变量名->asset_id，如 {'A':'id1','B':'id2'}")
    bands: Dict[str, int] = Field(default_factory=dict, description="变量名->band index（1-based）")
    expr: str
    out_name: str = "calc_output"
    out_dtype: str = "Float32"  # Byte/UInt16/Float32/...
    nodata: Optional[float] = None


class RasterFuseIn(BaseModel):
    hs: str
    rgb: str
    alpha: float = 1.0
    lambda_: float = Field(0.001, alias="lambda")
    max_samples: int = 200_000
    out_name: str = "fusion_output"
    out_dtype: str = "Byte"  # Byte 或 UInt16


def _asset_to_out(asset: dict) -> AssetOut:
    return AssetOut(
        id=asset["id"],
        filename=asset["filename"],
        kind=asset["kind"],
        created_at=asset["created_at"],
        meta=asset.get("meta", {}),
        geoserver_layer=asset.get("geoserver_layer"),
        geoserver_store=asset.get("geoserver_store"),
        published_at=asset.get("published_at"),
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/assets/upload", response_model=AssetOut)
def upload_asset(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    kind = "raster" if ext in (".tif", ".tiff") else "vector" if ext in (".zip",) else "unknown"
    if kind == "unknown":
        raise HTTPException(status_code=400, detail="仅支持 .tif/.tiff 或 Shapefile .zip")

    asset_id = uuid.uuid4().hex
    dst_dir = _data_path("uploads", asset_id)
    os.makedirs(dst_dir, exist_ok=True)
    dst_path = os.path.join(dst_dir, filename)

    with open(dst_path, "wb") as f:
        f.write(file.file.read())

    meta = {}
    if kind == "raster":
        meta = gdal_info(dst_path)
    else:
        meta = {"driver": "zip", "size_bytes": os.path.getsize(dst_path)}

    asset = {
        "id": asset_id,
        "filename": filename,
        "kind": kind,
        "path": dst_path,
        "created_at": utc_now_iso(),
        "meta": meta,
        "geoserver_layer": None,
        "geoserver_store": None,
        "published_at": None,
    }
    db.insert_asset(asset)
    return _asset_to_out(asset)


@app.get("/api/assets", response_model=list[AssetOut])
def list_assets():
    return [_asset_to_out(a) for a in db.list_assets()]


@app.get("/api/assets/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: str):
    a = db.get_asset(asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="asset not found")
    return _asset_to_out(a)


@app.get("/api/assets/{asset_id}/file")
def download_asset(asset_id: str):
    a = db.get_asset(asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="asset not found")
    return FileResponse(a["path"], filename=a["filename"], media_type="application/octet-stream")


def _safe_rm_asset_files(path: str) -> None:
    """Best-effort 删除资产对应的本地文件/目录。

    - 只允许删除 DATA_DIR 之下的路径，避免误删。
    - uploads/<asset_id>/...：删除该目录
    - derived/<job_id>/...：删除该目录
    """
    try:
        data_root = os.path.abspath(settings.DATA_DIR)
        p = os.path.abspath(path)
        if not p.startswith(data_root + os.sep):
            return
        if not os.path.exists(p):
            return

        parent = os.path.dirname(p)
        # 对 uploads/derived 目录，优先删整个子目录，顺带清理对齐/中间产物
        if os.path.basename(os.path.dirname(parent)) in ("uploads", "derived"):
            shutil.rmtree(parent, ignore_errors=True)
            return

        # 否则删单文件
        if os.path.isfile(p):
            os.remove(p)
    except Exception:
        # best-effort
        return


@app.delete("/api/assets/{asset_id}")
def delete_asset(
    asset_id: str,
    unpublish: bool = Query(True, description="是否同时从 GeoServer 取消发布（删除 store/layer）"),
    purge: str = Query("all", description="仅对 raster coveragestore 生效：purge=all/none"),
    delete_files: bool = Query(True, description="是否删除 rasterops 本地文件（uploads/derived）"),
):
    """删除资产：可选取消发布 GeoServer，并删除本地文件。"""
    a = db.get_asset(asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="asset not found")

    # 1) optional: unpublish in GeoServer
    if unpublish and a.get("geoserver_store"):
        ws = settings.GEOSERVER_WORKSPACE
        store = a["geoserver_store"]
        try:
            if a["kind"] == "raster":
                geoserver.delete_coveragestore(ws, store, recurse=True, purge=purge)
            elif a["kind"] == "vector":
                geoserver.delete_datastore(ws, store, recurse=True)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"geoserver unpublish failed: {e}")

    # 2) optional: delete local files
    if delete_files:
        _safe_rm_asset_files(a["path"])

    # 3) delete DB record
    db.delete_asset(asset_id)
    return {"ok": True}


@app.post("/api/assets/{asset_id}/publish", response_model=PublishOut)
def publish_asset(asset_id: str):
    a = db.get_asset(asset_id)
    if not a:
        raise HTTPException(status_code=404, detail="asset not found")

    ws = settings.GEOSERVER_WORKSPACE
    store = sanitize_name(a["filename"]) + "_" + asset_id[:8]

    if a["kind"] == "raster":
        store, layer = geoserver.publish_geotiff(ws, store, a["path"])
    elif a["kind"] == "vector":
        store, layer = geoserver.publish_shp_zip(ws, store, a["path"])
    else:
        raise HTTPException(status_code=400, detail="unsupported asset kind")

    db.update_asset_publish(asset_id, layer=layer, store=store)
    return PublishOut(workspace=ws, store=store, layer=layer)


@app.post("/api/raster/calc", response_model=JobOut)
def raster_calc(req: RasterCalcIn):
    # 基本校验
    if not req.inputs:
        raise HTTPException(status_code=400, detail="inputs 不能为空")
    for var in req.inputs.keys():
        if len(var) != 1 or not var.isalpha() or not var.isupper():
            raise HTTPException(status_code=400, detail="变量名必须为单个大写字母，如 A/B/C")

    job_id = uuid.uuid4().hex
    job = {
        "id": job_id,
        "kind": "calc",
        "status": "queued",
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
        "params": req.model_dump(by_alias=True),
        "output_asset_id": None,
        "message": None,
    }
    db.insert_job(job)

    derived_dir = _data_path("derived", job_id)
    os.makedirs(derived_dir, exist_ok=True)

    def _run() -> JobResult:
        # 取输入文件路径
        var_paths: Dict[str, str] = {}
        for var, aid in req.inputs.items():
            a = db.get_asset(aid)
            if not a:
                raise RuntimeError(f"asset not found: {aid}")
            if a["kind"] != "raster":
                raise RuntimeError(f"asset is not raster: {aid}")
            var_paths[var] = a["path"]

        # 以字母序最小的变量作为 reference 网格
        ref_var = sorted(var_paths.keys())[0]
        ref_path = var_paths[ref_var]

        aligned: Dict[str, str] = {}
        for var, p in var_paths.items():
            if var == ref_var:
                aligned[var] = p
                continue
            out = os.path.join(derived_dir, f"aligned_{var}.tif")
            warp_to_match(p, ref_path, out, resample="bilinear")
            aligned[var] = out

        out_path = os.path.join(derived_dir, f"{req.out_name}.tif")
        run_gdal_calc(aligned, req.bands, req.expr, out_path, out_dtype=req.out_dtype, nodata=req.nodata)

        # 输出资产入库
        out_asset_id = uuid.uuid4().hex
        out_asset = {
            "id": out_asset_id,
            "filename": f"{req.out_name}.tif",
            "kind": "raster",
            "path": out_path,
            "created_at": utc_now_iso(),
            "meta": gdal_info(out_path),
            "geoserver_layer": None,
            "geoserver_store": None,
            "published_at": None,
        }
        db.insert_asset(out_asset)
        return JobResult(output_asset_id=out_asset_id, message="ok")

    job_mgr.submit(job_id, _run)
    return JobOut(**db.get_job(job_id))


@app.post("/api/raster/fuse", response_model=JobOut)
def raster_fuse(req: RasterFuseIn):
    job_id = uuid.uuid4().hex
    job = {
        "id": job_id,
        "kind": "fuse",
        "status": "queued",
        "created_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
        "params": req.model_dump(by_alias=True),
        "output_asset_id": None,
        "message": None,
    }
    db.insert_job(job)

    derived_dir = _data_path("derived", job_id)
    os.makedirs(derived_dir, exist_ok=True)

    def _run() -> JobResult:
        hs_a = db.get_asset(req.hs)
        rgb_a = db.get_asset(req.rgb)
        if not hs_a or not rgb_a:
            raise RuntimeError("hs/rgb asset not found")
        if hs_a["kind"] != "raster" or rgb_a["kind"] != "raster":
            raise RuntimeError("hs/rgb must be raster")

        out_path = os.path.join(derived_dir, f"{req.out_name}.tif")
        fuse_hs_rgb(
            hs_path=hs_a["path"],
            rgb_path=rgb_a["path"],
            out_path=out_path,
            alpha=req.alpha,
            lam=req.lambda_,
            max_samples=req.max_samples,
            out_dtype=req.out_dtype,
        )

        out_asset_id = uuid.uuid4().hex
        out_asset = {
            "id": out_asset_id,
            "filename": f"{req.out_name}.tif",
            "kind": "raster",
            "path": out_path,
            "created_at": utc_now_iso(),
            "meta": gdal_info(out_path),
            "geoserver_layer": None,
            "geoserver_store": None,
            "published_at": None,
        }
        db.insert_asset(out_asset)
        return JobResult(output_asset_id=out_asset_id, message="ok")

    job_mgr.submit(job_id, _run)
    return JobOut(**db.get_job(job_id))


@app.get("/api/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: str):
    j = db.get_job(job_id)
    if not j:
        raise HTTPException(status_code=404, detail="job not found")
    return JobOut(**j)
