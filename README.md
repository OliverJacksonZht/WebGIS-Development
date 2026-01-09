# WebGIS 二次开发作业（拆分版）

## 目录结构
- index.html
- css/style.css
- js/
  - 00_config_state.js         配置 + 全局变量/DOM引用
  - 01_map_init.js             地图初始化 + 工具图层/提示初始化 + 全局提示函数
  - 02_wfs_layer_ui.js         WFS 图层加载 + 图层控制UI + 属性查图UI初始化函数
  - 03_panels_basemap_delegation.js 图层面板/底图切换/事件委托
  - 04_feature_query_core.js   图查属性：地图点击查询 + 弹窗展示
  - 05_measure_draw.js         鼠标坐标/绘制提示 + 测量/绘制核心 + 按钮绑定（含 ESC 取消绘制修复）
  - 06_feature_query_controls.js 图查属性：开关/模式切换/框选查询
  - 07_attribute_query.js      属性查图：开关 + 执行/清除查询 + 初始化完成提示

## 本地运行建议
为避免浏览器对 file:// 的跨域限制，建议用本地静态服务器启动：
- Python: `python -m http.server 8000`
然后访问：
- http://localhost:8000/webgis_split/index.html

## 兼容性说明
- 已将 WFS 请求参数 `typename` 调整为 `typeName`（更符合 GeoServer/WFS 1.1.0 常见写法）。
- 修复：绘制工具每次激活都会重复绑定 ESC 监听的问题（避免后续累积触发）。
