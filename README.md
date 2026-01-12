# WebGIS 二次开发项目

一个基于OpenLayers的WebGIS应用，集成了矢量数据处理、栅格分析、图层管理等功能。项目采用模块化JavaScript架构，包含完整的GIS操作功能和独立的栅格处理服务。

## 🏗️ 系统架构

### 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用层     │    │   数据服务层     │    │   处理服务层     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ OpenLayers 8.2.0 │◄──►│  GeoServer      │◄──►│  Python FastAPI │
│ 原生JavaScript   │    │  WFS/WMS服务    │    │  GDAL栅格处理   │
│ 响应式UI界面     │    │  天地图WMTS      │    │  影像融合算法   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 技术栈详情
- **前端框架**：OpenLayers 8.2.0 + 原生JavaScript (ES6+)
- **UI框架**：自定义CSS + Flexbox布局
- **底图服务**：天地图WMTS服务（矢量/影像/地形）
- **数据服务**：GeoServer 2.x WFS/WMS服务
- **栅格处理**：Python FastAPI + GDAL + NumPy
- **空间分析**：Turf.js + OSRM API
- **部署方式**：Docker容器化部署
- **开发工具**：现代浏览器开发者工具

## 📁 目录结构

```
webgis_split/
├── index.html                    # 主页面入口
├── css/
│   └── style.css                 # 样式系统（响应式设计）
├── js/                           # JavaScript核心模块
│   ├── 00_config_state.js        # 🔧 配置管理 + 全局状态
│   ├── 01_map_init.js            # 🗺️ 地图初始化 + 图层管理
│   ├── 02_wfs_layer_ui.js        # 📊 WFS图层加载 + UI控制
│   ├── 03_panels_basemap_delegation.js # 🎛️ 面板控制 + 事件委托
│   ├── 04_feature_query_core.js  # 🔍 图查属性核心逻辑
│   ├── 05_measure_draw.js        # 📐 测量绘制功能核心
│   ├── 06_feature_query_controls.js # 🎛️ 查询控制UI
│   ├── 07_attribute_query.js     # 📊 属性查图功能
│   ├── 08_overlay_layer_manager.js # 🎨 覆盖图层管理器
│   ├── 09_raster_getfeatureinfo.js # 🛰️ 栅格图层查询
│   ├── 10_buffer_analysis.js     # 🛡️ 缓冲区分析
│   ├── 11_path_analysis.js       # 🚀 最短路径分析
│   ├── 80_rasterops_config.js    # ⚙️ 栅格服务配置
│   ├── 81_rasterops_api.js       # 🌐 栅格服务API客户端
│   └── 82_rasterops_panel.js     # 📋 栅格服务UI面板
├── EXAM/                         # 📚 代码解释文档集合
└── webgis_rasterops_bundle/      # 🐳 栅格处理后端服务
    ├── frontend/                 # 前端集成文件
    │   └── docs/INTEGRATION.md   # 集成说明文档
    └── rasterops/                # Python FastAPI后端
        ├── app/                  # 应用核心代码
        │   ├── main.py           # FastAPI主应用
        │   ├── config.py         # 配置管理
        │   ├── gdalops.py        # GDAL操作核心
        │   ├── geoserver.py      # GeoServer集成
        │   ├── jobs.py           # 任务管理
        │   └── db.py             # 数据库操作
        ├── Dockerfile            # Docker构建文件
        └── requirements.txt      # Python依赖
```

## ✨ 功能特性

### 🗺️ 基础地图功能
- ✅ **多底图支持**：天地图矢量/影像/地形底图切换
- ✅ **地图导航**：缩放、平移、鹰眼视图、重置视图
- ✅ **坐标显示**：实时鼠标坐标显示（经纬度格式）
- ✅ **状态提示**：全局操作状态提示条

### 📊 数据管理功能
- ✅ **WFS矢量图层**：动态加载、样式配置、透明度控制
- ✅ **图层管理**：显示/隐藏、缩放至图层范围、属性查看
- ✅ **WMS栅格图层**：动态添加、透明度调整
- ✅ **覆盖图层**：统一管理业务栅格图层

### 🔍 查询分析功能
- ✅ **图查属性**：单击查询要素属性，支持多图层要素识别
- ✅ **框选查询**：矩形框选批量查询，结果分组展示
- ✅ **属性查图**：基于属性字段的条件查询，支持多种操作符
- ✅ **栅格查询**：WMS GetFeatureInfo获取像素值信息
- ✅ **高亮显示**：查询结果要素高亮，支持批量定位

### 📐 测量绘制功能
- ✅ **距离测量**：多点距离测量，支持公里/米单位
- ✅ **面积测量**：多边形面积测量，支持平方公里/平方米
- ✅ **几何绘制**：点、线、面、圆绘制，支持多个要素
- ✅ **图形管理**：清除绘制、ESC键取消、实时提示
- ✅ **样式控制**：统一绘制样式，视觉反馈清晰

### 🛡️ 空间分析功能（spatial analysis）
- ✅ **缓冲区分析**：基于Turf.js生成点/线/面缓冲区
- ✅ **路径分析**：集成OSRM API进行最短路径规划
- ✅ **分析可视化**：分析结果图层展示和管理
- ✅ **参数设置**：缓冲距离、路径点类型等参数配置

### 🛰️ 栅格处理功能（rasterops）
- ✅ **文件上传**：GeoTIFF/Shapefile文件上传和管理
- ✅ **自动发布**：GeoServer自动发布为WMS/WFS服务
- ✅ **栅格计算器**：支持gdal_calc语法的表达式计算
- ✅ **影像融合**：高光谱与可见光影像融合算法
- ✅ **资产管理**：文件资产的生命周期管理
- ✅ **任务队列**：异步处理大文件，支持进度跟踪

## 🚀 快速开始

### 环境要求
- **浏览器**：Chrome 80+ / Firefox 75+ / Edge 80+ / Safari 13+
- **Python**：3.8+（用于本地开发服务器）
- **Docker**：20.0+（用于栅格处理服务）
- **网络**：需要访问天地图服务和GeoServer服务

### 本地运行

1. **启动前端服务**
   ```bash
   # 克隆项目
   git clone https://github.com/OliverJacksonZht/WebGIS-Development.git
   cd webgis_split
   
   # 启动Python HTTP服务器
   python -m http.server 8000
   # 或使用Node.js
   npx serve . -p 8000
   ```

2. **访问应用**
   ```
   浏览器打开：http://localhost:8000/index.html
   ```

3. **启动栅格处理服务**（可选）
   ```bash
   # 进入栅格服务目录
   cd webgis_rasterops_bundle/rasterops
   
   # 配置环境变量（可选）
   export GEOSERVER_URL=http://your-geoserver:8080/geoserver
   export GEOSERVER_USER=admin
   export GEOSERVER_PASSWORD=geoserver
   
   # Docker方式启动
   docker-compose up -d
   
   # 或直接运行
   pip install -r requirements.txt
   python -m app.main
   ```

### Docker部署（推荐）
```bash
# 一键启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 📖 使用指南

### 🎮 基本操作
1. **底图切换**：点击左上角🌍按钮，选择矢量/影像/地形底图
2. **图层控制**：点击📂按钮打开图层面板，管理图层显示和样式
3. **坐标显示**：右下角实时显示鼠标位置的经纬度坐标
4. **地图重置**：点击🔄按钮重置地图到初始视图

### 🔍 查询功能
1. **图查属性**
   - 点击🔍按钮激活查询模式
   - 选择"单击查询"或"框选查询"模式
   - 在地图上点击或拖拽框选要素
   - 查看弹出的属性信息面板

2. **属性查图**
   - 点击📊按钮打开属性查图面板
   - 选择查询图层和属性字段
   - 设置查询条件（等于/包含/开头为/结尾为）
   - 点击"执行查询"查看结果

3. **栅格查询**
   - 确保栅格图层已加载
   - 直接点击栅格图层查看像素值信息

### 📐 测量绘制功能
1. **距离测量**
   - 点击📏按钮激活距离测量
   - 在地图上连续点击添加测量点
   - 双击完成测量，显示总距离

2. **面积测量**
   - 点击🗺️按钮激活面积测量
   - 点击绘制多边形边界
   - 双击完成测量，显示总面积

3. **几何绘制**
   - 选择绘制工具：📍点、📐线、🔶面、⭕圆
   - 在地图上绘制对应几何图形
   - 支持绘制多个要素，使用🧹清除

### 🛡️ 空间分析功能
1. **缓冲区分析**
   - 点击🛡️按钮打开缓冲区分析面板
   - 选择要分析的图层和缓冲距离（米）
   - 点击"开始分析"生成缓冲区

2. **最短路径分析**
   - 点击🚀按钮打开路径分析面板
   - 选择点选模式：起点/途径点/终点
   - 在地图上点击设置路径点
   - 点击"计算路径"获取最优路径

### 🛰️ 栅格处理功能
详细的栅格处理服务使用说明请参考：[webgis_rasterops_bundle/frontend/docs/INTEGRATION.md](webgis_rasterops_bundle/frontend/docs/INTEGRATION.md)

## ⚙️ 配置说明

### GeoServer配置
```javascript
// 00_config_state.js 中的配置
const geoserverWfsUrl = 'http://your-server:8080/geoserver/wrok1/wfs';
const layerConfigs = [
    {
        id: 'custom_layer_1',
        name: '图层显示名称',
        layerName: 'workspace:layer_name',
        visible: true,
        color: '#ff0000',
        borderColor: '#ffffff',
        opacity: 0.9
    }
];
```

### 栅格服务配置
```bash
# 环境变量配置
GEOSERVER_URL=http://localhost:8080/geoserver
GEOSERVER_USER=admin
GEOSERVER_PASSWORD=geoserver
GEOSERVER_WORKSPACE=webgis
RASTEROPS_DATA_DIR=/data
CORS_ALLOW_ORIGINS=*
```

## 🔧 开发指南

### 代码结构
项目采用模块化架构，各JavaScript文件按功能分离：
- **配置层**（00）：全局变量、配置参数、DOM引用
- **核心层**（01-11）：基础GIS功能模块
- **扩展层**（80-82）：栅格处理集成模块

### 添加新功能
1. **创建模块文件**：按功能命名（如12_new_feature.js）
2. **更新配置**：在00_config_state.js中添加相关配置
3. **添加UI**：在index.html中添加控制按钮
4. **注册事件**：在对应模块中绑定事件处理

### 调试技巧
1. **浏览器控制台**：查看日志输出和错误信息
2. **网络面板**：检查WFS/WMS请求和响应
3. **断点调试**：在关键函数设置断点
4. **状态监控**：查看window.state对象状态

## 🐛 兼容性说明

### 浏览器兼容性
- ✅ Chrome 80+：完全支持
- ✅ Firefox 75+：完全支持
- ✅ Edge 80+：完全支持
- ✅ Safari 13+：基本支持（部分ES6+特性）
- ❌ IE：不支持

### 已知问题修复
- ✅ WFS请求参数从`typename`调整为`typeName`
- ✅ 修复绘制工具重复绑定ESC监听的问题
- ✅ 优化大数据量图层的加载性能
- ✅ 改进移动端触控操作体验

### API兼容性
- OpenLayers 8.2.0+ API
- GeoServer WFS 1.1.0+ / WMS 1.3.0+
- 天地图WMTS服务协议

## 📚 文档资源

- **代码解释**：[EXAM/](EXAM/) 目录包含详细的代码逐行解释
- **栅格服务**：[webgis_rasterops_bundle/frontend/docs/INTEGRATION.md](webgis_rasterops_bundle/frontend/docs/INTEGRATION.md)
- **OpenLayers文档**：https://openlayers.org/en/latest/doc/
- **GeoServer文档**：http://docs.geoserver.org/

## 🤝 贡献指南

1. Fork 项目到你的GitHub账户
2. 创建功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE) 文件。

## 📞 联系方式

- 项目主页：https://github.com/OliverJacksonZht/WebGIS-Development
- 问题反馈：https://github.com/OliverJacksonZht/WebGIS-Development/issues
- 技术交流：欢迎提交Issue或Pull Request
