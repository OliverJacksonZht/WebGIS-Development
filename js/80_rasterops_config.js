// RasterOps 配置（可按需改）
// 约定：把这几个变量挂到 window，方便其它脚本调用。

(function () {
  // rasterops 后端（FastAPI）
  window.RASTEROPS_BASE_URL = window.RASTEROPS_BASE_URL || "http://10.8.49.5:9001";

  // GeoServer 基址与 workspace
  window.RASTEROPS_GEOSERVER_BASE = window.RASTEROPS_GEOSERVER_BASE || "http://10.8.49.5:8080/geoserver";
  window.RASTEROPS_WORKSPACE = window.RASTEROPS_WORKSPACE || "webgis";

  // 你的 OpenLayers map 对象引用：若不是 window.map，你可以在现有初始化代码里加一句：
  // window.map = map;
})();
