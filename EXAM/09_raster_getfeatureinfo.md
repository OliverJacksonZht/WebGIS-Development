# 09_raster_getfeatureinfo.js 代码详解

## 第一章：模块概述

### 在项目中的角色和定位
`09_raster_getfeatureinfo.js` 是WebGIS项目中的栅格图层属性查询模块，专门为WMS栅格图层提供点查询功能。该模块作为图查属性功能的补充，在用户点击查询时，如果当前位置没有矢量要素，则自动对栅格图层发起GetFeatureInfo请求。

### 主要功能和职责
1. **智能查询触发**：仅在特定条件下触发栅格查询，避免与矢量查询冲突
2. **WMS GetFeatureInfo集成**：构建符合WMS标准的GetFeatureInfo请求
3. **图层优先级处理**：智能选择最上层的可见WMS图层进行查询
4. **结果格式化显示**：将查询结果格式化并显示在现有的弹窗中
5. **坐标系统转换**：支持不同坐标系统之间的转换和显示

### 与其他模块的直接依赖关系
- **依赖模块**：
  - `00_config_state.js`：使用全局状态变量（`isFeatureQueryActive`、`featureQueryMode`、`featureInfoContent`）
  - `01_map_init.js`：使用地图对象（`window.map`）进行交互和坐标转换
  - `08_overlay_layer_manager.js`：使用`window.webgisOverlayGroup`获取WMS图层
- **被依赖模块**：
  - 与图查属性核心模块（`04_feature_query_core.js`、`06_feature_query_controls.js`）形成互补关系

### 与其他模块的间接关系
- 与栅格操作模块（`80-82_rasterops_*.js`）共享WMS图层资源
- 与UI状态管理模块共享弹窗组件
- 与地图初始化模块共享投影配置

## 第二章：代码逐行解释

### 模块包装和工具函数

```javascript
/**
 * 09_raster_getfeatureinfo.js
 * 目的：为"栅格/WMS 图层"提供合理的"图查属性"——点查像元/coverage 信息（WMS GetFeatureInfo）。
 *
 * 设计原则：
 *  - 不破坏你现有的矢量（WFS）图查属性逻辑
 *  - 仅在【图查属性已开启】且【单击查询模式】且【当前像素下没有矢量要素】时，才对栅格发起 GetFeatureInfo
 *
 * 依赖：
 *  - window.map 已存在
 *  - 全局变量 isFeatureQueryActive / featureQueryMode / featureInfoContent（来自 00_config_state.js）
 *  - 栅格图层通过 window.webgisOverlayGroup 管理（TileWMS/ImageWMS 均可）
 */

(function () {
  function htmlEscape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
```

**代码解释**：
- 第1-14行：详细的模块注释，说明模块目的、设计原则和依赖关系
- 第16行：使用IIFE包装模块，避免全局命名空间污染
- 第17-18行：定义HTML转义函数，防止XSS攻击，确保显示内容安全

### WMS图层获取函数

```javascript
  function getOverlayWmsLayers() {
    const og = window.webgisOverlayGroup;
    if (!og || !og.getLayers) return [];
    const arr = og.getLayers().getArray();
    return arr.filter(l => {
      if (!l || !l.getVisible || !l.getVisible()) return false;
      const src = l.getSource && l.getSource();
      // TileWMS / ImageWMS 都支持 getFeatureInfoUrl（ImageWMS 在 source 上也有）
      return src && typeof src.getFeatureInfoUrl === 'function';
    });
  }
```

**代码解释**：
- 第2行：获取叠加图层组的引用
- 第3-4行：检查叠加图层组是否存在且有效，不存在则返回空数组
- 第5行：获取图层组中的所有图层
- 第6-11行：过滤出符合条件的WMS图层
  - 第7-8行：检查图层是否存在且可见
  - 第9行：获取图层的数据源
  - 第11行：检查数据源是否支持GetFeatureInfo功能（TileWMS和ImageWMS都支持）

### 图层优先级选择函数

```javascript
  function pickTopLayer(layers) {
    if (!layers.length) return null;
    // 规则：优先 zIndex 大的；若无 zIndex，就取数组最后一个（通常是最上层）
    let best = layers[layers.length - 1];
    let bestZ = typeof best.getZIndex === 'function' ? (best.getZIndex() ?? -1) : -1;
    for (const l of layers) {
      const z = typeof l.getZIndex === 'function' ? (l.getZIndex() ?? -1) : -1;
      if (z >= bestZ) {
        bestZ = z;
        best = l;
      }
    }
    return best;
  }
```

**代码解释**：
- 第2行：如果没有图层，直接返回null
- 第3行：注释说明选择规则：优先选择zIndex大的图层，如果没有zIndex则选择数组最后一个
- 第4-5行：初始化最佳图层为最后一个图层，并获取其zIndex值
- 第6-11行：遍历所有图层，找到zIndex最大的图层
  - 第7行：获取当前图层的zIndex值，如果没有则默认为-1
  - 第8-10行：如果当前图层的zIndex大于等于最佳图层，则更新最佳图层
- 第13行：返回选择的顶层图层

### 核心查询函数

```javascript
  async function queryRasterAt(evt) {
    const map = window.map;
    if (!map) return;

    // 仅在"图查属性"开启且"单击查询"时启用
    try {
      if (!isFeatureQueryActive) return;
      if (featureQueryMode !== 'single') return;
    } catch (e) {
      // 如果全局变量不可见，就不做任何事
      return;
    }

    // 若该像素下存在矢量要素（WFS feature），让现有逻辑处理，避免双弹窗/覆盖
    try {
      if (map.hasFeatureAtPixel && map.hasFeatureAtPixel(evt.pixel)) return;
    } catch (e) {}

    const candidates = getOverlayWmsLayers();
    const layer = pickTopLayer(candidates);
    if (!layer) return;

    const src = layer.getSource();
    const view = map.getView();
    const resolution = view.getResolution();
    const projection = view.getProjection();

    const params = (typeof src.getParams === 'function') ? src.getParams() : {};
    const layersParam = params.LAYERS || params.layers || layer.get('__qualifiedName');

    const url = src.getFeatureInfoUrl(
      evt.coordinate,
      resolution,
      projection,
      {
        'INFO_FORMAT': 'text/plain',
        'FEATURE_COUNT': 5,
        'QUERY_LAYERS': layersParam,
        'LAYERS': layersParam
      }
    );

    if (!url) return;

    let text = '';
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      text = await resp.text();
      text = (text || '').trim();
    } catch (e) {
      text = `GetFeatureInfo 请求失败：${e.message || e}`;
    }

    // 输出到你现有的弹窗容器
    try {
      const title = layer.get('title') || layersParam || 'Raster/WMS';
      const lonlat = ol.proj.toLonLat(evt.coordinate);
      const header = `
        <div style="font-weight:600;margin-bottom:6px;">栅格点查（WMS GetFeatureInfo）</div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
          图层：${htmlEscape(title)}<br/>
          坐标(EPSG:3857)：${evt.coordinate.map(v => v.toFixed(2)).join(', ')}<br/>
          坐标(经纬度)：${lonlat.map(v => v.toFixed(6)).join(', ')}
        </div>
      `;

      const body = text
        ? `<pre style="white-space:pre-wrap;word-break:break-word;margin:0;">${htmlEscape(text)}</pre>`
        : `<div style="color:#999;">无返回内容（可能该位置无数据或该图层未开启查询）。</div>`;

      featureInfoContent.innerHTML = header + body;
    } catch (e) {
      // 忽略
    }
  }
```

**代码解释**：
- 第2行：获取地图对象引用
- 第5-12行：检查查询条件是否满足
  - 第7行：检查图查属性功能是否激活
  - 第8行：检查是否为单击查询模式
  - 第10-12行：异常处理，如果全局变量不可访问则直接返回
- 第15-18行：避免与矢量查询冲突
  - 第17行：检查点击位置是否有矢量要素，如果有则让现有逻辑处理
- 第20-22行：获取WMS图层并选择顶层图层
- 第24-27行：获取地图视图信息（分辨率、投影等）
- 第29-30行：获取WMS图层的参数配置
- 第31行：提取图层名称参数，支持多种参数格式
- 第33-40行：构建GetFeatureInfo请求URL
  - 第34行：调用数据源的getFeatureInfoUrl方法
  - 第35-40行：设置请求参数
    - `INFO_FORMAT`：设置返回格式为纯文本
    - `FEATURE_COUNT`：限制返回要素数量
    - `QUERY_LAYERS`和`LAYERS`：指定查询的图层
- 第42行：检查URL是否构建成功
- 第44-53行：执行GetFeatureInfo请求
  - 第46行：发起HTTP请求
  - 第47行：检查响应状态
  - 第48行：获取响应文本内容
  - 第49行：去除首尾空白字符
  - 第50-52行：异常处理，构建错误信息
- 第56-77行：格式化并显示查询结果
  - 第58行：获取图层标题用于显示
  - 第59行：将点击坐标转换为经纬度
  - 第61-67行：构建结果头部信息
    - 显示查询类型标识
    - 显示图层名称
    - 显示EPSG:3857坐标
    - 显示经纬度坐标
  - 第69-73行：构建结果主体内容
    - 第70行：如果有返回内容，则使用pre标签格式化显示
    - 第72行：如果没有内容，显示提示信息
  - 第75行：将格式化后的HTML内容插入到弹窗容器中
  - 第76-78行：异常处理，忽略显示错误

### 初始化和事件绑定

```javascript
  function boot() {
    const map = window.map;
    if (!map || !window.ol) {
      setTimeout(boot, 200);
      return;
    }
    // 避免重复绑定
    if (map.__rasterGfiBound) return;
    map.__rasterGfiBound = true;

    map.on('singleclick', (evt) => {
      queryRasterAt(evt);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
```

**代码解释**：
- 第2行：定义启动函数
- 第3-7行：检查依赖是否就绪
  - 第4-6行：如果地图或OpenLayers库未加载，延迟200ms后重试
  - 第8行：检查是否已经绑定过事件，避免重复绑定
  - 第9行：标记已绑定状态
- 第11-13行：为地图的singleclick事件绑定查询函数
- 第17-21行：根据文档加载状态选择合适的初始化时机
  - 第18行：如果文档还在加载中，等待DOMContentLoaded事件
  - 第20行：如果文档已加载完成，立即执行启动函数
- 第22行：结束IIFE包装

## 第三章：关键点总结

### 核心技术要点

1. **WMS GetFeatureInfo标准**：
   - 严格遵循WMS 1.1.1/1.3.0标准
   - 支持多种INFO_FORMAT格式
   - 正确处理QUERY_LAYERS参数

2. **智能查询策略**：
   - 条件触发机制，避免与矢量查询冲突
   - 图层优先级选择算法
   - 像素级别的要素检测

3. **坐标系统处理**：
   - 支持多种投影坐标系
   - 自动坐标转换（EPSG:3857到WGS84）
   - 精确的坐标格式化显示

4. **异步请求处理**：
   - 使用async/await处理异步请求
   - 完善的错误处理机制
   - 用户友好的错误信息显示

### 设计模式和架构特点

1. **非侵入式设计**：
   - 不修改现有的矢量查询逻辑
   - 作为补充功能存在
   - 通过条件判断避免冲突

2. **防御性编程**：
   - 多层次的依赖检查
   - 异常情况的优雅处理
   - 安全的DOM操作

3. **模块化架构**：
   - 功能职责单一明确
   - 清晰的模块边界
   - 可独立测试和维护

4. **用户体验优化**：
   - 无缝集成现有UI
   - 智能的功能切换
   - 丰富的信息展示

### 潜在改进建议

1. **功能扩展**：
   - 支持多种INFO_FORMAT（HTML、JSON、GML）
   - 添加查询结果缓存机制
   - 支持多图层同时查询

2. **性能优化**：
   - 实现请求去重，避免重复查询
   - 添加请求超时控制
   - 优化大文本内容的显示性能

3. **用户体验提升**：
   - 添加查询进度指示器
   - 支持查询结果的复制和导出
   - 提供查询历史记录功能

4. **代码结构优化**：
   - 将查询逻辑抽象为独立的类
   - 使用配置对象管理查询参数
   - 增加单元测试覆盖

5. **兼容性增强**：
   - 支持更多WMS服务版本
   - 处理不同服务器返回格式的差异
   - 添加对特殊字符和编码的处理