# rasterops（WebGIS 栅格/矢量上传 + GeoServer 发布 + 栅格计算器 + 影像融合）

这是一个轻量后端服务，用于给你的 WebGIS 前端提供：

1. 上传数据：GeoTIFF（.tif/.tiff）、Shapefile（.zip）
2. 数据资产列表（带基础元信息）
3. 一键发布到 GeoServer（workspace=webgis）
4. 栅格计算器（gdal_calc）
5. 高光谱(HS) + 可见光(RGB) 传统融合（回归 + 细节注入），输出 3 波段预览 GeoTIFF

## 运行方式（Docker）

### 1）准备 GeoServer

确认 GeoServer 可访问：

- `http://10.8.49.5:8080/geoserver`

并且有 admin 账号（你可以在 docker-compose 里改）。

### 2）启动 rasterops

```bash
cd rasterops
cp docker-compose.example.yml docker-compose.yml
# 按需修改 docker-compose.yml 里的账号密码、URL、workspace

docker compose up -d --build
```

启动后：
- rasterops：`http://10.8.49.5:9001`
- OpenAPI 文档：`http://10.8.49.5:9001/docs`

## 数据目录

容器内默认：`/data`

会存：
- `/data/uploads/<asset_id>/原文件`
- `/data/derived/<job_id>/输出文件`
- `/data/rasterops.sqlite`（资产/任务元信息）

## API 概览

- `POST /api/assets/upload`（multipart）
  - field: `file`
  - 返回：asset

- `GET /api/assets`

- `POST /api/assets/{asset_id}/publish`
  - 返回：`{layer_name, workspace}`

- `POST /api/raster/calc`
  - body:
    ```json
    {
      "inputs": {"A": "asset-id", "B": "asset-id"},
      "bands": {"A": 1, "B": 1},
      "expr": "(A-B)/(A+B)",
      "out_name": "ndvi_demo",
      "out_dtype": "Float32",
      "nodata": -9999
    }
    ```
  - 返回：job

- `POST /api/raster/fuse`
  - body:
    ```json
    {
      "hs": "asset-id",
      "rgb": "asset-id",
      "alpha": 1.0,
      "lambda": 0.001,
      "max_samples": 200000,
      "out_name": "fusion_demo",
      "out_dtype": "Byte"
    }
    ```

- `GET /api/jobs/{job_id}`

## 注意事项

1. 若 HS/RGB 坐标系或分辨率不同，服务会自动 warp 对齐到 RGB 的网格。
2. 输入 uint8 / uint16 都支持：内部转 float32 做归一化，再输出到 Byte/UInt16。
3. 若影像非常大，融合会比较慢（但课程设计通常可以接受）。
