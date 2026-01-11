/**
 * 09_raster_getfeatureinfo.js
 * 目的：为“栅格/WMS 图层”提供合理的“图查属性”——点查像元/coverage 信息（WMS GetFeatureInfo）。
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

  async function queryRasterAt(evt) {
    const map = window.map;
    if (!map) return;

    // 仅在“图查属性”开启且“单击查询”时启用
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
