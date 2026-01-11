from __future__ import annotations

import math
import os
import shutil
import subprocess
import tempfile
from typing import Dict, Tuple

import numpy as np
from osgeo import gdal


gdal.UseExceptions()


def _dtype_name_from_gdal(gdal_dtype: int) -> str:
    return gdal.GetDataTypeName(gdal_dtype)


def gdal_info(path: str) -> Dict:
    ds = gdal.Open(path, gdal.GA_ReadOnly)
    if ds is None:
        raise RuntimeError(f"Cannot open raster: {path}")

    gt = ds.GetGeoTransform(can_return_null=True)
    proj = ds.GetProjectionRef()
    xsize = ds.RasterXSize
    ysize = ds.RasterYSize
    bands = ds.RasterCount

    # bbox（忽略旋转项）
    bbox = None
    if gt is not None:
        origin_x, px_w, rot1, origin_y, rot2, px_h = gt
        if abs(rot1) < 1e-12 and abs(rot2) < 1e-12:
            minx = origin_x
            maxy = origin_y
            maxx = origin_x + px_w * xsize
            miny = origin_y + px_h * ysize
            bbox = {
                "minx": min(minx, maxx),
                "miny": min(miny, maxy),
                "maxx": max(minx, maxx),
                "maxy": max(miny, maxy),
            }

    band1 = ds.GetRasterBand(1)
    dtype = _dtype_name_from_gdal(band1.DataType)
    nodata = band1.GetNoDataValue()

    return {
        "driver": ds.GetDriver().ShortName if ds.GetDriver() else None,
        "xsize": xsize,
        "ysize": ysize,
        "bands": bands,
        "dtype": dtype,
        "nodata": nodata,
        "geotransform": list(gt) if gt is not None else None,
        "projection": proj,
        "bbox": bbox,
    }


def warp_to_match(src_path: str, ref_path: str, out_path: str, resample: str = "bilinear") -> str:
    """把 src warp 到与 ref 完全一致的网格（CRS/extent/resolution/size）。"""
    ref = gdal.Open(ref_path, gdal.GA_ReadOnly)
    if ref is None:
        raise RuntimeError(f"Cannot open ref raster: {ref_path}")

    gt = ref.GetGeoTransform()
    proj = ref.GetProjection()
    xsize, ysize = ref.RasterXSize, ref.RasterYSize

    # output bounds
    origin_x, px_w, _, origin_y, _, px_h = gt
    minx = origin_x
    maxy = origin_y
    maxx = origin_x + px_w * xsize
    miny = origin_y + px_h * ysize

    resample_alg = {
        "nearest": gdal.GRA_NearestNeighbour,
        "bilinear": gdal.GRA_Bilinear,
        "cubic": gdal.GRA_Cubic,
        "average": gdal.GRA_Average,
        "lanczos": gdal.GRA_Lanczos,
    }.get(resample.lower(), gdal.GRA_Bilinear)

    opts = gdal.WarpOptions(
        format="GTiff",
        outputBounds=(min(minx, maxx), min(miny, maxy), max(minx, maxx), max(miny, maxy)),
        width=xsize,
        height=ysize,
        dstSRS=proj,
        resampleAlg=resample_alg,
        multithread=True,
        warpMemoryLimit=512,
    )

    gdal.Warp(out_path, src_path, options=opts)
    return out_path


def _find_gdal_calc() -> list[str]:
    """返回可执行命令列表前缀（用于 subprocess）。"""
    for candidate in ["gdal_calc.py", "/usr/bin/gdal_calc.py", "/usr/local/bin/gdal_calc.py"]:
        if shutil.which(candidate) or os.path.exists(candidate):
            return [candidate]
    # 在某些镜像里 gdal_calc 可能作为 python 模块
    return ["python3", "-m", "osgeo_utils.gdal_calc"]


def run_gdal_calc(
    inputs: Dict[str, str],
    bands: Dict[str, int],
    expr: str,
    out_path: str,
    out_dtype: str = "Float32",
    nodata: float | int | None = None,
) -> str:
    """栅格计算器：多输入、多 band、表达式。"""

    cmd = _find_gdal_calc()
    for var, path in inputs.items():
        cmd += [f"-{var}", path]
        if var in bands:
            cmd += [f"--{var}_band", str(int(bands[var]))]

    cmd += [
        "--calc",
        expr,
        "--outfile",
        out_path,
        "--type",
        out_dtype,
        "--overwrite",
    ]
    if nodata is not None:
        cmd += ["--NoDataValue", str(nodata)]

    # quiet，避免刷屏
    cmd += ["--quiet"]

    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"gdal_calc failed: {p.stderr.strip()}")

    return out_path


def _norm_to_unit(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float32)
    if np.issubdtype(arr.dtype, np.integer):
        # 这里基本不会触发，因为已转 float32；但保留逻辑
        info = np.iinfo(arr.dtype)
        if info.min >= 0:
            return np.clip(arr / float(info.max), 0.0, 1.0)
        return np.clip((arr - info.min) / float(info.max - info.min), 0.0, 1.0)
    # float：用鲁棒分位数
    finite = np.isfinite(arr)
    if not np.any(finite):
        return np.zeros_like(arr, dtype=np.float32)
    lo, hi = np.percentile(arr[finite], [2, 98])
    if abs(hi - lo) < 1e-12:
        return np.zeros_like(arr, dtype=np.float32)
    return np.clip((arr - lo) / (hi - lo), 0.0, 1.0)


def _scale_rgb_to_unit(rgb: np.ndarray, gdal_dtype_name: str) -> np.ndarray:
    rgb = rgb.astype(np.float32)
    if gdal_dtype_name in ("Byte", "UInt8"):
        return np.clip(rgb / 255.0, 0.0, 1.0)
    if gdal_dtype_name in ("UInt16",):
        return np.clip(rgb / 65535.0, 0.0, 1.0)
    if gdal_dtype_name in ("Int16",):
        # 假设数据主要非负；否则退化到 min/max 归一
        return _norm_to_unit(rgb)
    return _norm_to_unit(rgb)


def _cast_from_unit(rgb_unit: np.ndarray, out_dtype: str) -> np.ndarray:
    rgb_unit = np.clip(rgb_unit, 0.0, 1.0)
    if out_dtype in ("Byte", "UInt8"):
        return np.round(rgb_unit * 255.0).astype(np.uint8)
    if out_dtype == "UInt16":
        return np.round(rgb_unit * 65535.0).astype(np.uint16)
    # 浮点输出（少用；调试可用）
    return rgb_unit.astype(np.float32)


def fuse_hs_rgb(
    hs_path: str,
    rgb_path: str,
    out_path: str,
    alpha: float = 1.0,
    lam: float = 1e-3,
    max_samples: int = 200_000,
    out_dtype: str = "Byte",
) -> str:
    """传统 HS+RGB 融合：

    1) RGB -> HS 低分辨率（average）
    2) 回归：HS_lr -> RGB_lr（岭回归）
    3) HS -> RGB 高分辨率（bilinear）
    4) 细节注入：out = pred(HS_hr) + alpha*(RGB - LP(RGB))

    输出：3-band GeoTIFF（RGB 网格）
    """

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    hs_ds = gdal.Open(hs_path, gdal.GA_ReadOnly)
    rgb_ds = gdal.Open(rgb_path, gdal.GA_ReadOnly)
    if hs_ds is None:
        raise RuntimeError(f"Cannot open HS: {hs_path}")
    if rgb_ds is None:
        raise RuntimeError(f"Cannot open RGB: {rgb_path}")

    if rgb_ds.RasterCount < 3:
        raise RuntimeError("RGB input must have at least 3 bands")
    if hs_ds.RasterCount < 3:
        raise RuntimeError("HS input must have at least 3 bands")

    rgb_dtype = gdal.GetDataTypeName(rgb_ds.GetRasterBand(1).DataType)

    with tempfile.TemporaryDirectory(prefix="rasterops_fuse_") as td:
        # 1) RGB -> HS grid（低分辨率）
        rgb_lr = os.path.join(td, "rgb_lr.tif")
        warp_to_match(rgb_path, hs_path, rgb_lr, resample="average")

        # 2) 低通：RGB_lr -> RGB grid（再上采样）
        rgb_lp = os.path.join(td, "rgb_lp.tif")
        warp_to_match(rgb_lr, rgb_path, rgb_lp, resample="bilinear")

        # 3) HS -> RGB grid（高分辨率）
        hs_hr = os.path.join(td, "hs_hr.tif")
        warp_to_match(hs_path, rgb_path, hs_hr, resample="bilinear")

        # 4) 读低分辨率用于拟合
        hs_lr_ds = gdal.Open(hs_path, gdal.GA_ReadOnly)
        rgb_lr_ds = gdal.Open(rgb_lr, gdal.GA_ReadOnly)
        if hs_lr_ds is None or rgb_lr_ds is None:
            raise RuntimeError("Internal warp failed")

        B = hs_lr_ds.RasterCount
        # HS_lr 读全图（通常比 RGB 小很多）；若仍然很大，可后续再优化为分块采样
        hs_lr_arr = hs_lr_ds.ReadAsArray().astype(np.float32)  # (B, H, W)
        rgb_lr_arr = rgb_lr_ds.ReadAsArray().astype(np.float32)  # (>=3, H, W)

        if rgb_lr_arr.ndim == 2:
            raise RuntimeError("RGB_lr unexpected dimensions")

        rgb_lr_arr = rgb_lr_arr[:3, :, :]
        rgb_lr_unit = _scale_rgb_to_unit(rgb_lr_arr, rgb_dtype)

        # 展平采样
        H, W = hs_lr_arr.shape[1], hs_lr_arr.shape[2]
        N = H * W
        n_samp = min(max_samples, N)
        rng = np.random.default_rng(20260110)
        idx = rng.choice(N, size=n_samp, replace=False)
        ys = idx // W
        xs = idx % W

        # X: (n, B)
        X = hs_lr_arr[:, ys, xs].T  # (n, B)
        Y = rgb_lr_unit[:, ys, xs].T  # (n, 3)

        # 标准化 X（每 band）
        mu = X.mean(axis=0, dtype=np.float64)
        sigma = X.std(axis=0, dtype=np.float64)
        sigma = np.where(sigma < 1e-8, 1.0, sigma)
        Xn = (X - mu) / sigma

        # 岭回归：W = (X^T X + lam I)^{-1} X^T Y
        XtX = Xn.T @ Xn
        XtY = Xn.T @ Y
        Wmat = np.linalg.solve(XtX + lam * np.eye(B), XtY)  # (B, 3)

        # 5) 分块生成输出
        hs_hr_ds = gdal.Open(hs_hr, gdal.GA_ReadOnly)
        rgb_lp_ds = gdal.Open(rgb_lp, gdal.GA_ReadOnly)
        if hs_hr_ds is None or rgb_lp_ds is None:
            raise RuntimeError("Internal warp failed")

        out_x, out_y = rgb_ds.RasterXSize, rgb_ds.RasterYSize
        gt = rgb_ds.GetGeoTransform()
        proj = rgb_ds.GetProjection()

        drv = gdal.GetDriverByName("GTiff")
        # 压缩与 block size：实用向
        creation = ["TILED=YES", "COMPRESS=DEFLATE", "PREDICTOR=2", "BIGTIFF=IF_SAFER"]
        out_ds = drv.Create(out_path, out_x, out_y, 3, gdal.GDT_Byte if out_dtype in ("Byte", "UInt8") else gdal.GDT_UInt16 if out_dtype == "UInt16" else gdal.GDT_Float32, options=creation)
        if out_ds is None:
            raise RuntimeError("Cannot create output")
        out_ds.SetGeoTransform(gt)
        out_ds.SetProjection(proj)

        # 用 RGB 的 block size（若无则 256）
        b0 = rgb_ds.GetRasterBand(1)
        bx, by = b0.GetBlockSize()
        if bx <= 0 or by <= 0:
            bx, by = 256, 256

        for y0 in range(0, out_y, by):
            ysize = min(by, out_y - y0)
            for x0 in range(0, out_x, bx):
                xsize = min(bx, out_x - x0)

                # HS_hr block: (B, y, x)
                hs_block = np.zeros((B, ysize, xsize), dtype=np.float32)
                for bi in range(B):
                    hs_block[bi] = hs_hr_ds.GetRasterBand(bi + 1).ReadAsArray(x0, y0, xsize, ysize).astype(np.float32)

                # 标准化并回归
                Xb = hs_block.reshape(B, -1).T  # (n, B)
                Xb = (Xb - mu) / sigma
                pred = (Xb @ Wmat).T.reshape(3, ysize, xsize)  # (3, y, x)

                # 细节注入：RGB - LP(RGB)
                rgb_block = np.zeros((3, ysize, xsize), dtype=np.float32)
                for c in range(3):
                    rgb_block[c] = rgb_ds.GetRasterBand(c + 1).ReadAsArray(x0, y0, xsize, ysize).astype(np.float32)

                lp_block = np.zeros((3, ysize, xsize), dtype=np.float32)
                for c in range(3):
                    lp_block[c] = rgb_lp_ds.GetRasterBand(c + 1).ReadAsArray(x0, y0, xsize, ysize).astype(np.float32)

                rgb_u = _scale_rgb_to_unit(rgb_block, rgb_dtype)
                lp_u = _scale_rgb_to_unit(lp_block, rgb_dtype)

                out_u = pred + float(alpha) * (rgb_u - lp_u)
                out_u = np.clip(out_u, 0.0, 1.0)
                out_cast = _cast_from_unit(out_u, out_dtype)

                # 写入
                for c in range(3):
                    out_ds.GetRasterBand(c + 1).WriteArray(out_cast[c], xoff=x0, yoff=y0)

        out_ds.FlushCache()
        out_ds = None

    return out_path
