# WebGIS 前端接入 rasterops（教程）

> 目标：你打开 `index.html` 后，右上角出现一个 **RasterOps** 按钮，能完成：上传 tif/zip → 列表 → 发布到 GeoServer → 加载 WMS；以及栅格计算器与影像融合。

## 1. 后端部署（rasterops）

1) 把本目录里的 `rasterops/` 拷贝到服务器（Ubuntu 22.04 的 docker 环境）。

2) 在 `rasterops/` 下：

```bash
cp docker-compose.example.yml docker-compose.yml
# 修改 GeoServer 账号密码（若不是 admin/geoserver）

docker compose up -d --build
```

3) 验证后端可用：

- 打开 `http://10.8.49.5:9001/docs`（OpenAPI）
- 打开 `http://10.8.49.5:9001/health` 返回 `{"ok": true}`

## 2. 前端接入（只需加 3 个 JS）

把 `frontend/js/` 下的三个文件复制到你的项目 `js/` 目录：

- `80_rasterops_config.js`
- `81_rasterops_api.js`
- `82_rasterops_panel.js`

然后在 `index.html` 里（通常在其它 js 引入之后）加上：

```html
<script src="js/80_rasterops_config.js"></script>
<script src="js/81_rasterops_api.js"></script>
<script src="js/82_rasterops_panel.js"></script>
```

### 关键点：确保能拿到 map

`82_rasterops_panel.js` 默认通过 `window.map` 访问 OpenLayers map。

如果你项目里 map 是局部变量（例如 `const map = new ol.Map(...)`），请在地图初始化完成后加一句：

```js
window.map = map;
```

（你加在你自己的 `01_map_init.js` 或类似文件的末尾就行。）

## 3. 使用流程

### 3.1 上传 & 发布 & 加载

1) 打开网页 → 右上角点 **RasterOps** → 进入 **资产** Tab。
2) 选择 `tif/tiff` 或 shapefile `zip` → 点击 Upload。
3) 上传成功后会出现在列表中。
4) 点击 **Publish**：后端会通过 GeoServer REST API 自动建 store 并发布 layer。
5) 发布完成后，点击 **Add WMS**，即可把该 layer 加载到地图（WMS）。

### 3.2 栅格计算器（Raster Calculator）

在 **栅格计算器** Tab：

- 选择 A/B（都是你上传的 raster）
- 填表达式（gdal_calc 语法，类似 numpy）
- 点击 Run

常用示例：

- 归一化差值：`(A-B)/(A+B)`
- 裁剪到 0~1：`clip(A,0,1)`
- 条件：`where(A>0.2, A, 0)`

运行后会生成新的 tif（作为一个新 asset），你可以再 Publish → Add WMS。

### 3.3 影像融合（HS + RGB）

在 **影像融合** Tab：

- HS：选择高光谱 tif（多波段）
- RGB：选择可见光 tif（至少 3 波段）
- alpha：细节注入强度（1.0 常用；0.5 更平滑）
- lambda：岭回归正则（默认 0.001）
- 点击 Run

输出为 3 波段 GeoTIFF（RGB 网格），作为新资产出现。然后同样 Publish → Add WMS。

## 4. 常见问题

### Q1：点 Add WMS 提示找不到 window.map
A：你还没把 map 暴露到全局。按第 2 节加 `window.map = map;`。

### Q2：HS/RGB 分辨率或坐标系不同怎么办
A：后端会自动 warp 对齐到 RGB 网格，保证输出能直接 WMS 显示。

### Q3：uint8 / uint16 都能用吗
A：能。后端内部会把 RGB 归一化到 0~1，再输出 Byte 或 UInt16。

