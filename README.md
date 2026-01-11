# WebGIS 二次开发项目

一个基于OpenLayers的WebGIS应用，集成了矢量数据处理、栅格分析、图层管理等功能。项目采用模块化JavaScript架构，包含完整的GIS操作功能和独立的栅格处理服务。

## 技术架构

- **前端框架**：OpenLayers 8.2.0 + 原生JavaScript
- **底图服务**：天地图WMTS服务（矢量/影像/地形）
- **数据服务**：GeoServer WFS/WMS
- **栅格处理**：独立Python FastAPI服务（rasterops）
- **部署方式**：Docker容器化部署

## 目录结构

```
webgis_split/
├── index.html                    # 主页面
├── css/
│   └── style.css                 # 样式文件
├── js/                           # JavaScript核心模块
│   ├── 00_config_state.js        # 配置 + 全局变量/DOM引用
│   ├── 01_map_init.js            # 地图初始化 + 工具图层/提示初始化
│   ├── 02_wfs_layer_ui.js        # WFS 图层加载 + 图层控制UI
│   ├── 03_panels_basemap_delegation.js # 图层面板/底图切换/事件委托
│   ├── 04_feature_query_core.js  # 图查属性：地图点击查询 + 弹窗展示
│   ├── 05_measure_draw.js        # 鼠标坐标/绘制提示 + 测量/绘制核心
│   ├── 06_feature_query_controls.js # 图查属性：开关/模式切换/框选查询
│   ├── 07_attribute_query.js     # 属性查图：开关 + 执行/清除查询
│   ├── 08_overlay_layer_manager.js # 覆盖图层管理（WMS/栅格图层）
│   ├── 09_raster_getfeatureinfo.js # 栅格图层点查（WMS GetFeatureInfo）
│   ├── 80_rasterops_config.js    # 栅格服务配置
│   ├── 81_rasterops_api.js       # 栅格服务API封装
│   └── 82_rasterops_panel.js     # 栅格服务UI面板
└── webgis_rasterops_bundle/      # 栅格处理后端服务
    ├── frontend/                 # 前端集成文件
    │   ├── docs/INTEGRATION.md   # 集成说明文档
    │   └── js/                   # 栅格处理前端文件
    └── rasterops/                # Python FastAPI后端
        ├── app/                  # 应用核心代码
        ├── Dockerfile            # Docker构建文件
        └── requirements.txt      # Python依赖
```

## 功能特性

### 基础地图功能
- ✅ 天地图底图切换（矢量/影像/地形）
- ✅ 地图缩放、平移、鹰眼视图
- ✅ 鼠标坐标实时显示

### 数据管理功能
- ✅ WFS矢量图层加载和管理
- ✅ 图层显示控制和属性查看
- ✅ 动态WMS栅格图层管理
- ✅ 覆盖图层透明度控制

### 查询分析功能
- ✅ 图查属性（单击/框选查询）
- ✅ 属性查图（条件查询）
- ✅ 栅格图层点查（WMS GetFeatureInfo）
- ✅ 查询结果弹窗展示

### 测量绘制功能
- ✅ 距离和面积测量
- ✅ 点、线、面、圆绘制
- ✅ 绘制图形管理
- ✅ ESC键取消绘制

### 栅格处理功能（rasterops）
- ✅ GeoTIFF/Shapefile文件上传
- ✅ GeoServer自动发布
- ✅ 栅格计算器（gdal_calc语法）
- ✅ 高光谱与可见光影像融合
- ✅ 文件资产管理和删除

## 快速开始

### 环境要求
- 现代浏览器（Chrome/Firefox/Edge）
- Python 3.8+（用于本地服务器）
- Docker（用于栅格处理服务）

### 本地运行

1. **启动前端服务**
   ```bash
   # 进入项目目录
   cd webgis_split
   
   # 启动Python HTTP服务器
   python -m http.server 8000
   ```

2. **访问应用**
   ```
   http://localhost:8000/index.html
   ```

3. **启动栅格处理服务**（可选）
   ```bash
   # 进入栅格服务目录
   cd webgis_rasterops_bundle/rasterops
   
   # Docker方式启动
   docker-compose up -d
   ```

## 使用指南

### 基本操作
1. **底图切换**：使用右上角底图切换按钮
2. **图层控制**：使用左侧图层面板管理图层显示
3. **测量工具**：选择测量工具后在地图上绘制
4. **绘制工具**：选择绘制工具后在地图上绘制图形

### 查询功能
1. **图查属性**：激活查询模式，点击或框选地图要素
2. **属性查图**：在属性面板输入查询条件执行查询
3. **栅格查询**：点击栅格图层查看像素值信息

### 栅格处理
详细的栅格处理服务使用说明请参考：[webgis_rasterops_bundle/frontend/docs/INTEGRATION.md](webgis_rasterops_bundle/frontend/docs/INTEGRATION.md)

## 兼容性说明

- 已将 WFS 请求参数 `typename` 调整为 `typeName`（更符合 GeoServer/WFS 1.1.0 常见写法）
- 修复：绘制工具每次激活都会重复绑定 ESC 监听的问题（避免后续累积触发）
- 支持现代浏览器的ES6+语法

## 开发说明

项目采用模块化架构，各JavaScript文件按功能分离：
- 配置文件（00）：全局变量和配置
- 核心模块（01-09）：基础GIS功能
- 扩展模块（80-82）：栅格处理功能

修改功能时请参考对应模块的注释和代码结构。

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。
