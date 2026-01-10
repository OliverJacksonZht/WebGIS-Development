/**
 * 08_overlay_layer_manager.js
 * 目的：让通过 RasterOps / WMS 动态添加的栅格图层，100% 出现在“图层管理”里，并提供显隐、移除、删除(服务器)。
 *
 * 依赖：
 *  - window.map 已存在（01_map_init.js 里已做 window.map = map）
 *  - OpenLayers 全局对象 ol 已引入
 *  - （可选）window.RasterOpsAPI 或 window.rasteropsApi 中提供 deleteAsset(assetId, opts)
 *
 * 推荐用法：
 *  1) 在 index.html 里引入本文件（放在 01_map_init.js 之后、82_rasterops_panel.js 之前/之后均可，但要确保 window.map 已就绪）
 *  2) 在图层管理面板中准备一个容器：
 *      <div id="overlayLayersContainer"></div>
 *      <div id="emptyLayerTip" style="display:none;">暂无业务栅格图层</div>
 *     （如果你不想改 HTML，本脚本会退化使用 #layerList 作为容器）
 *  3) RasterOps 加图层时给 layer 写 metadata（82 面板补丁已做）：
 *      layer.set('__assetId', assetId)
 *      layer.set('__qualifiedName', 'wrok1:xxx')
 *      layer.set('__source', 'rasterops')
 */

(function () {
  // ---------- 工具函数 ----------
  function $(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------- OverlayGroup 初始化 ----------
  function ensureOverlayGroup() {
    if (!window.map || !window.ol) return null;

    if (!window.webgisOverlayGroup) {
      window.webgisOverlayGroup = new ol.layer.Group({
        title: '业务图层(Overlays)',
        layers: []
      });
      // 让 overlays 总在底图之上
      window.webgisOverlayGroup.setZIndex?.(1000);
      window.map.addLayer(window.webgisOverlayGroup);
    }
    return window.webgisOverlayGroup;
  }

  // ---------- 核心：渲染列表 ----------
  window.refreshLayerManager = function refreshLayerManager() {
    const overlayGroup = ensureOverlayGroup();
    if (!overlayGroup) {
      console.warn('[LayerManager] window.map 或 ol 未就绪，无法刷新。');
      return;
    }

    // 容器优先使用 overlayLayersContainer；否则退化到 layerList
    const container = $('overlayLayersContainer') || $('layerList');
    const emptyTip = $('emptyLayerTip');

    if (!container) {
      console.warn('[LayerManager] 未找到 overlayLayersContainer / layerList 容器。');
      return;
    }

    // 清空旧内容
    container.innerHTML = '';

    const layers = overlayGroup.getLayers().getArray();

    if (emptyTip) emptyTip.style.display = layers.length ? 'none' : 'block';
    if (!layers.length) return;

    layers.forEach((layer, idx) => {
      const title = layer.get('title') || layer.get('name') || `栅格图层_${idx + 1}`;
      const visible = layer.getVisible?.() ?? true;

      const assetId = layer.get('__assetId');            // RasterOps 资产ID（若存在）
      const qualified = layer.get('__qualifiedName');    // workspace:layerName（若存在）
      const sourceTag = layer.get('__source');           // 'rasterops'（若存在）

      const row = document.createElement('div');
      row.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:8px',
        'padding:6px 8px',
        'border:1px solid #e9ecef',
        'border-radius:4px',
        'background:#f8f9fa',
        'font-size:12px'
      ].join(';');

      // checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!visible;
      cb.title = '显示/隐藏';
      cb.addEventListener('change', () => {
        layer.setVisible?.(cb.checked);
        window.map?.render?.();
      });

      // title
      const titleSpan = document.createElement('div');
      titleSpan.style.cssText = 'flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      titleSpan.innerHTML = `<span title="${escapeHtml(qualified || title)}">${escapeHtml(title)}</span>`;

      // 移除(仅地图)
      const btnRemove = document.createElement('button');
      btnRemove.textContent = '移除';
      btnRemove.title = '仅从地图移除（不删除服务器与文件）';
      btnRemove.style.cssText = 'padding:2px 6px;border:0;border-radius:3px;background:#6c757d;color:#fff;cursor:pointer;font-size:11px;';
      btnRemove.addEventListener('click', () => {
        overlayGroup.getLayers().remove(layer);
        window.refreshLayerManager();
      });

      // 删除(服务器) - 只有 rasterops 图层才显示更合理
      const btnDelete = document.createElement('button');
      btnDelete.textContent = '删除';
      btnDelete.title = '从服务器删除（取消发布 + 删除上传文件）';
      btnDelete.style.cssText = 'padding:2px 6px;border:0;border-radius:3px;background:#e53e3e;color:#fff;cursor:pointer;font-size:11px;';

      const showDelete = !!assetId; // 有 assetId 才能安全做“真正删除”
      btnDelete.style.display = showDelete ? 'inline-block' : 'none';

      btnDelete.addEventListener('click', async () => {
        if (!assetId) return;

        const ok = window.confirm(`确认删除该资产？\n\n标题: ${title}\nID: ${assetId}\n\n这会尝试：取消发布 GeoServer + 删除后端文件。`);
        if (!ok) return;

        try {
          // 兼容：RasterOpsAPI / rasteropsApi / fetch
          const api = window.RasterOpsAPI || window.rasteropsApi;
          if (api?.deleteAsset) {
            await api.deleteAsset(assetId, { unpublish: true, delete_files: true, purge: 'all' });
          } else {
            const base = (window.RASTEROPS_BASE_URL || 'http://10.8.49.5:9001').replace(/\/$/,'');
            const url = `${base}/api/assets/${encodeURIComponent(assetId)}?unpublish=true&delete_files=true&purge=all`;
            const resp = await fetch(url, { method: 'DELETE' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          }

          // 成功：移除图层
          overlayGroup.getLayers().remove(layer);
          window.refreshLayerManager();
        } catch (e) {
          console.error('[LayerManager] 删除失败', e);
          alert(`删除失败：${e?.message || e}`);
        }
      });

      // 右侧标签（可选）
      const tag = document.createElement('span');
      tag.style.cssText = 'padding:1px 4px;border-radius:2px;font-size:10px;color:#fff;background:#38b2ac;';
      tag.textContent = qualified ? 'WMS' : (sourceTag || 'Overlay');

      row.appendChild(cb);
      row.appendChild(tag);
      row.appendChild(titleSpan);
      row.appendChild(btnRemove);
      row.appendChild(btnDelete);

      container.appendChild(row);
    });
  };

  // ---------- 自动刷新：监听 overlays collection add/remove ----------
  function bindAutoRefresh() {
    const overlayGroup = ensureOverlayGroup();
    if (!overlayGroup) return;

    const col = overlayGroup.getLayers();
    if (col.__layerManagerBound) return; // 防重复
    col.__layerManagerBound = true;

    col.on('add', () => window.refreshLayerManager());
    col.on('remove', () => window.refreshLayerManager());
  }

  // ---------- 初始化时机 ----------
  function boot() {
    // map/ol 还没就绪就延迟
    if (!window.map || !window.ol) {
      setTimeout(boot, 200);
      return;
    }
    ensureOverlayGroup();
    bindAutoRefresh();
    window.refreshLayerManager();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
