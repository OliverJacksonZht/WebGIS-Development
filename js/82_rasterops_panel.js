(function () {
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'style') node.setAttribute('style', v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.substring(2), v);
        else node.setAttribute(k, v);
      }
    }
    if (children) {
      for (const c of children) {
        if (c === null || c === undefined) continue;
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      }
    }
    return node;
  }

  function fmtMeta(meta) {
    if (!meta) return '';
    const p = [];
    if (meta.xsize && meta.ysize) p.push(`${meta.xsize}x${meta.ysize}`);
    if (meta.bands) p.push(`${meta.bands} band`);
    if (meta.dtype) p.push(meta.dtype);
    return p.join(' / ');
  }

  function shortId(id) {
    return id ? id.slice(0, 8) : '';
  }

  function geoserverWmsUrl() {
    const base = (window.RASTEROPS_GEOSERVER_BASE || '').replace(/\/$/, '');
    const ws = window.RASTEROPS_WORKSPACE || 'webgis';
    return `${base}/${ws}/wms`;
  }
  // ===== RasterOps 图层 registry（用于“移除/删除”按钮定位已加载的图层）=====
  const __layerByAssetId = new Map();
  function setLayerByAssetId(assetId, layer) {
    if (!assetId || !layer) return;
    __layerByAssetId.set(String(assetId), layer);
  }
  function getLayerByAssetId(assetId) {
    if (!assetId) return null;
    return __layerByAssetId.get(String(assetId)) || null;
  }
  function removeLayerByAssetId(assetId) {
    if (!assetId) return;
    __layerByAssetId.delete(String(assetId));
  }
  function findLayerInOverlayGroupByAssetId(assetId) {
    const og = window.webgisOverlayGroup;
    if (!assetId || !og || !og.getLayers) return null;
    const id = String(assetId);
    const arr = og.getLayers().getArray();
    return arr.find(l => String(l.get('__assetId') || l.get('rasterops_asset_id') || '') === id) || null;
  }

  function addWmsLayerToMap({ ws, layerName, title, assetId }) {
    const map = window.map;
    if (!map) {
      alert("window.map 未找到：请在地图初始化后设置 window.map = map;");
      return null;
    }

    // 统一使用全局 WMS 端点，避免 workspace 路径导致混乱
    const wmsUrl = "http://10.8.49.5:8080/geoserver/wms";
    const qualified = `${ws}:${layerName}`;

    const layer = new ol.layer.Tile({
      title: title || qualified,
      source: new ol.source.TileWMS({
        url: wmsUrl,
        params: {
          LAYERS: qualified,
          TILED: true,
          FORMAT: "image/png",
          TRANSPARENT: true,
          VERSION: "1.1.1",
        },
        serverType: "geoserver",
      }),
    });

    layer.setZIndex(9999);

    // 写入 metadata（供图层管理面板识别 + 允许显示“删除”按钮）
    if (assetId) {
      layer.set('rasterops_asset_id', assetId); // 兼容旧字段
      layer.set('__assetId', assetId);
      setLayerByAssetId(assetId, layer);
    }
    layer.set('__qualifiedName', qualified);
    layer.set('__source', 'rasterops');

    // 优先加入 overlayGroup（保证图层管理面板必现）
    const og = window.webgisOverlayGroup;
    if (og && og.getLayers) {
      og.getLayers().push(layer);
    } else {
      // 兜底：没有 overlayGroup 时仍可显示
      map.addLayer(layer);
    }

    // 刷新图层管理面板（如果存在）
    try { if (typeof window.refreshLayerManager === 'function') window.refreshLayerManager(); } catch (e) {}

    return layer;
}

  async function pollJob(api, jobId, onUpdate, intervalMs) {
    intervalMs = intervalMs || 1000;
    for (;;) {
      const j = await api.getJob(jobId);
      if (onUpdate) onUpdate(j);
      if (j.status === 'done' || j.status === 'error') return j;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  function buildUI() {
    const api = new window.RasterOpsAPI();

    const root = el('div', {
      id: 'rasterops-root',
      style:
        'position:absolute;top:10px;right:10px;z-index:9999;font-family:Arial, Helvetica, sans-serif;'
        + 'pointer-events:auto;',
    });

    const btn = el('button', {
      style:
        'padding:6px 10px;border:1px solid #333;background:#fff;border-radius:4px;cursor:pointer;'
        + 'box-shadow:0 2px 6px rgba(0,0,0,0.15);',
      onclick: () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      },
    }, ['RasterOps']);

    const panel = el('div', {
      style:
        'margin-top:6px;width:420px;max-height:70vh;overflow:auto;display:none;'
        + 'border:1px solid #333;background:#fff;border-radius:6px;'
        + 'box-shadow:0 6px 18px rgba(0,0,0,0.2);',
    });

    const header = el('div', {
      style: 'padding:10px;border-bottom:1px solid #ddd;font-weight:bold;display:flex;justify-content:space-between;align-items:center;'
    }, [
      el('div', null, [`rasterops @ ${window.RASTEROPS_BASE_URL}`]),
      el('a', { href: geoserverWmsUrl(), target: '_blank', style: 'font-size:12px;' }, ['WMS'])
    ]);

    const tabBar = el('div', { style: 'display:flex;border-bottom:1px solid #ddd;' });
    const content = el('div', { style: 'padding:10px;' });

    const tabs = [
      { key: 'assets', title: '资产', render: renderAssets },
      { key: 'calc', title: '栅格计算器', render: renderCalc },
      { key: 'fuse', title: '影像融合', render: renderFuse },
    ];

    let active = 'assets';

    function setTab(key) {
      active = key;
      [...tabBar.children].forEach((c) => c.setAttribute('data-active', '0'));
      const t = tabBar.querySelector(`[data-key="${key}"]`);
      if (t) t.setAttribute('data-active', '1');
      content.innerHTML = '';
      const tab = tabs.find((x) => x.key === key);
      tab.render(content);
    }

    tabs.forEach((t) => {
      const b = el('div', {
        'data-key': t.key,
        style:
          'flex:1;padding:8px 10px;cursor:pointer;text-align:center;font-size:13px;'
          + 'user-select:none;',
        onclick: () => setTab(t.key),
      }, [t.title]);
      b.addEventListener('mouseenter', () => { b.style.background = '#f5f5f5'; });
      b.addEventListener('mouseleave', () => { b.style.background = (b.getAttribute('data-active') === '1' ? '#eee' : '#fff'); });
      tabBar.appendChild(b);
    });

    function setActiveStyle() {
      [...tabBar.children].forEach((c) => {
        c.style.background = c.getAttribute('data-active') === '1' ? '#eee' : '#fff';
        c.style.fontWeight = c.getAttribute('data-active') === '1' ? 'bold' : 'normal';
      });
    }

    function renderAssets(container) {
      const uploadRow = el('div', { style: 'display:flex;gap:6px;align-items:center;margin-bottom:8px;' });
      const fileInput = el('input', { type: 'file', style: 'flex:1;' });
      const uploadBtn = el('button', { style: 'padding:6px 10px;cursor:pointer;' }, ['上传']);
      const refreshBtn = el('button', { style: 'padding:6px 10px;cursor:pointer;' }, ['刷新']);
      uploadRow.appendChild(fileInput);
      uploadRow.appendChild(uploadBtn);
      uploadRow.appendChild(refreshBtn);
      container.appendChild(uploadRow);

      const status = el('div', { style: 'font-size:12px;color:#333;margin:6px 0;' });
      container.appendChild(status);

      const list = el('div', null, []);
      container.appendChild(list);

      async function load() {
        list.innerHTML = '';
        status.textContent = '加载中...';
        try {
          const assets = await api.listAssets();
          status.textContent = `共 ${assets.length} 个资产（仅 GeoTIFF / Shapefile(zip)）`;
          assets.forEach((a) => {
            const row = el('div', {
              style:
                'border:1px solid #eee;border-radius:6px;padding:8px;margin-bottom:8px;'
                + 'display:flex;flex-direction:column;gap:6px;',
            });
            const line1 = el('div', { style: 'display:flex;justify-content:space-between;gap:10px;' }, [
              el('div', null, [
                el('div', { style: 'font-weight:bold;' }, [`${a.filename}`]),
                el('div', { style: 'font-size:12px;color:#555;' }, [`${a.kind} / ${fmtMeta(a.meta)} / id=${shortId(a.id)}`])
              ]),
              el('div', { style: 'display:flex;gap:6px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end;' }, [
                el('button', { style: 'padding:4px 8px;cursor:pointer;', onclick: async () => {
                  try {
                    status.textContent = `发布中: ${a.filename} ...`;
                    const pub = await api.publish(a.id);
                    status.textContent = `已发布：${pub.workspace}:${pub.layer}`;
                    await load();
                  } catch (e) {
                    status.textContent = `发布失败：${e.message || e}`;
                  }
                } }, ['发布']),
                el('button', { style: 'padding:4px 8px;cursor:pointer;', onclick: () => {
                  window.open(`${window.RASTEROPS_BASE_URL}/api/assets/${a.id}/file`, '_blank');
                } }, ['下载']),
                el('button', { style: 'padding:4px 8px;cursor:pointer;', onclick: () => {
                  if (!a.geoserver_layer) {
                    status.textContent = '请先发布到 GeoServer，再添加 WMS 图层。';
                    return;
                  }
                  try {
                    addWmsLayerToMap({ ws: window.RASTEROPS_WORKSPACE, layerName: a.geoserver_layer, title: a.filename, assetId: a.id });
                    status.textContent = `已添加 WMS：${window.RASTEROPS_WORKSPACE}:${a.geoserver_layer}`;
                  } catch (e) {
                    status.textContent = `添加 WMS 失败：${e.message || e}`;
                  }
                } }, ['加到地图']),
                el('button', { style: 'padding:4px 8px;cursor:pointer;', onclick: () => {
                  try {
                    const og = window.webgisOverlayGroup;
                    const map = window.map;
                    const lyr = getLayerByAssetId(a.id) || findLayerInOverlayGroupByAssetId(a.id);
                    if (!lyr) {
                      status.textContent = '该资产对应的图层尚未添加到地图（无需移除）。';
                      return;
                    }
                    if (og && og.getLayers && og.getLayers().getArray().includes(lyr)) {
                      og.getLayers().remove(lyr);
                    } else if (map && map.removeLayer) {
                      map.removeLayer(lyr);
                    }
                    removeLayerByAssetId(a.id);
                    status.textContent = `已从地图移除：${a.filename}`;
                    try { if (typeof window.refreshLayerManager === 'function') window.refreshLayerManager(); } catch (e) {}
                  } catch (e) {
                    status.textContent = `移除失败：${e.message || e}`;
                  }
                } }, ['移除']),
                el('button', { style: 'padding:4px 8px;cursor:pointer;background:#e53e3e;color:#fff;border:0;border-radius:3px;', onclick: async () => {
                  const ok = window.confirm(`确认删除该资产？\n\n${a.filename}\nID=${a.id}\n\n将尝试：取消发布 GeoServer + 删除后端文件。`);
                  if (!ok) return;
                  try {
                    status.textContent = `删除中：${a.filename} ...`;

                    // 先从地图移除
                    const og = window.webgisOverlayGroup;
                    const map = window.map;
                    const lyr = getLayerByAssetId(a.id) || findLayerInOverlayGroupByAssetId(a.id);
                    if (lyr) {
                      if (og && og.getLayers && og.getLayers().getArray().includes(lyr)) {
                        og.getLayers().remove(lyr);
                      } else if (map && map.removeLayer) {
                        map.removeLayer(lyr);
                      }
                      removeLayerByAssetId(a.id);
                    }
                    try { if (typeof window.refreshLayerManager === 'function') window.refreshLayerManager(); } catch (e) {}

                    // 后端删除（需要 81_rasterops_api.js 支持 deleteAsset）
                    if (!api.deleteAsset) {
                      throw new Error('前端 API 未实现 deleteAsset（请确认已加载 81_rasterops_api.js 的最新版）');
                    }
                    await api.deleteAsset(a.id, { unpublish: true, delete_files: true, purge: 'all' });

                    status.textContent = `已删除：${a.filename}`;
                    await load();
                  } catch (e) {
                    status.textContent = `删除失败：${e.message || e}`;
                  }
                } }, ['删除']),

              ]),
            ]);

            const pubInfo = a.geoserver_layer
              ? `Published: ${window.RASTEROPS_WORKSPACE}:${a.geoserver_layer} (store=${a.geoserver_store})`
              : 'Not published';
            row.appendChild(line1);
            row.appendChild(el('div', { style: 'font-size:12px;color:#666;' }, [pubInfo]));
            list.appendChild(row);
          });
        } catch (e) {
          status.textContent = `加载失败：${e.message || e}`;
        }
      }

      uploadBtn.onclick = async () => {
        if (!fileInput.files || fileInput.files.length === 0) {
          status.textContent = '请选择文件（.tif/.tiff 或 .zip）';
          return;
        }
        const f = fileInput.files[0];
        status.textContent = `上传中：${f.name} ...`;
        try {
          await api.upload(f);
          status.textContent = `上传完成：${f.name}`;
          fileInput.value = '';
          await load();
        } catch (e) {
          status.textContent = `上传失败：${e.message || e}`;
        }
      };

      refreshBtn.onclick = load;
      load();
    }

    function buildAssetSelect(assets, filterKind) {
      const sel = el('select', { style: 'width:100%;padding:6px;' });
      const opts = assets
        .filter((a) => !filterKind || a.kind === filterKind)
        .map((a) => ({ value: a.id, label: `${a.filename} (${shortId(a.id)})` }));
      sel.appendChild(el('option', { value: '' }, ['-- 请选择 --']));
      opts.forEach((o) => sel.appendChild(el('option', { value: o.value }, [o.label])));
      return sel;
    }

    function renderCalc(container) {
      const status = el('div', { style: 'font-size:12px;color:#333;margin-bottom:6px;' });
      container.appendChild(status);

      const form = el('div', { style: 'display:flex;flex-direction:column;gap:8px;' });
      container.appendChild(form);

      const expr = el('textarea', { style: 'width:100%;height:60px;padding:6px;', placeholder: '(A-B)/(A+B)' }, ['(A-B)/(A+B)']);
      const outName = el('input', { style: 'width:100%;padding:6px;', value: 'calc_output' });
      const outDtype = el('select', { style: 'width:100%;padding:6px;' }, [
        el('option', { value: 'Float32' }, ['Float32（推荐）']),
        el('option', { value: 'Byte' }, ['Byte']),
        el('option', { value: 'UInt16' }, ['UInt16']),
      ]);

      const aSelWrap = el('div');
      const bSelWrap = el('div');
      const aBand = el('input', { type: 'number', min: 1, value: 1, style: 'width:80px;padding:4px;' });
      const bBand = el('input', { type: 'number', min: 1, value: 1, style: 'width:80px;padding:4px;' });

      const runBtn = el('button', { style: 'padding:8px 12px;cursor:pointer;' }, ['运行']);

      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输入 A（raster）']), aSelWrap]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输入 B（raster）']), bSelWrap]));
      form.appendChild(el('div', { style: 'display:flex;gap:10px;align-items:center;' }, [
        el('div', null, ['A band: ']), aBand,
        el('div', null, ['B band: ']), bBand,
      ]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['表达式（numpy 风格，变量用 A/B/C...）']), expr]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输出名称（不含扩展名）']), outName]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输出类型']), outDtype]));
      form.appendChild(runBtn);

      async function init() {
        status.textContent = '加载资产列表...';
        try {
          const assets = await api.listAssets();
          const aSel = buildAssetSelect(assets, 'raster');
          const bSel = buildAssetSelect(assets, 'raster');
          aSelWrap.innerHTML = '';
          bSelWrap.innerHTML = '';
          aSelWrap.appendChild(aSel);
          bSelWrap.appendChild(bSel);

          runBtn.onclick = async () => {
            if (!aSel.value || !bSel.value) {
              status.textContent = '请先选择 A/B 两个栅格资产。';
              return;
            }
            const payload = {
              inputs: { A: aSel.value, B: bSel.value },
              bands: { A: parseInt(aBand.value || '1', 10), B: parseInt(bBand.value || '1', 10) },
              expr: expr.value,
              out_name: outName.value || 'calc_output',
              out_dtype: outDtype.value,
            };
            status.textContent = '任务创建中...';
            try {
              const job = await api.createCalcJob(payload);
              status.textContent = `已创建任务 ${shortId(job.id)}，正在运行...`;
              const final = await pollJob(api, job.id, (j) => {
                status.textContent = `任务 ${shortId(j.id)} 状态：${j.status}`;
              }, 1200);
              if (final.status === 'done') {
                status.textContent = `完成。输出 asset=${shortId(final.output_asset_id)}。建议去“资产”页发布并加到地图。`;
              } else {
                status.textContent = `失败：${final.message}`;
              }
            } catch (e) {
              status.textContent = `创建/运行失败：${e.message || e}`;
            }
          };

          status.textContent = '就绪。';
        } catch (e) {
          status.textContent = `加载失败：${e.message || e}`;
        }
      }

      init();
    }

    function renderFuse(container) {
      const status = el('div', { style: 'font-size:12px;color:#333;margin-bottom:6px;' });
      container.appendChild(status);

      const form = el('div', { style: 'display:flex;flex-direction:column;gap:8px;' });
      container.appendChild(form);

      const hsWrap = el('div');
      const rgbWrap = el('div');

      const alpha = el('input', { type: 'number', step: '0.1', value: 1.0, style: 'width:120px;padding:4px;' });
      const lambda_ = el('input', { type: 'number', step: '0.0001', value: 0.001, style: 'width:120px;padding:4px;' });
      const maxSamples = el('input', { type: 'number', value: 200000, style: 'width:160px;padding:4px;' });
      const outName = el('input', { style: 'width:100%;padding:6px;', value: 'fusion_output' });
      const outDtype = el('select', { style: 'width:100%;padding:6px;' }, [
        el('option', { value: 'Byte' }, ['Byte（预览推荐）']),
        el('option', { value: 'UInt16' }, ['UInt16']),
      ]);

      const runBtn = el('button', { style: 'padding:8px 12px;cursor:pointer;' }, ['运行融合']);

      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['高光谱 HS（tif）']), hsWrap]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['可见光 RGB（tif，至少 3 波段）']), rgbWrap]));
      form.appendChild(el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center;' }, [
        el('div', null, ['alpha(细节注入): ']), alpha,
        el('div', null, ['lambda(岭回归): ']), lambda_,
        el('div', null, ['max_samples: ']), maxSamples,
      ]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输出名称（不含扩展名）']), outName]));
      form.appendChild(el('div', null, [el('div', { style: 'font-weight:bold;' }, ['输出类型']), outDtype]));
      form.appendChild(runBtn);

      const hint = el('div', { style: 'font-size:12px;color:#666;line-height:1.4;' }, [
        '融合方法：把 RGB 下采样到 HS 网格做回归（HS→RGB），再把 HS 上采样到 RGB 网格并注入 RGB 细节（RGB - 低通 RGB）。',
        el('br'),
        '如果融合偏锐/偏噪：把 alpha 降到 0.6~0.9；如果色彩偏差大：把 lambda 略增（例如 0.005）。'
      ]);
      form.appendChild(hint);

      async function init() {
        status.textContent = '加载资产列表...';
        try {
          const assets = await api.listAssets();
          const hsSel = buildAssetSelect(assets, 'raster');
          const rgbSel = buildAssetSelect(assets, 'raster');
          hsWrap.innerHTML = '';
          rgbWrap.innerHTML = '';
          hsWrap.appendChild(hsSel);
          rgbWrap.appendChild(rgbSel);

          runBtn.onclick = async () => {
            if (!hsSel.value || !rgbSel.value) {
              status.textContent = '请先选择 HS/RGB 两个栅格资产。';
              return;
            }
            const payload = {
              hs: hsSel.value,
              rgb: rgbSel.value,
              alpha: parseFloat(alpha.value || '1.0'),
              lambda: parseFloat(lambda_.value || '0.001'),
              max_samples: parseInt(maxSamples.value || '200000', 10),
              out_name: outName.value || 'fusion_output',
              out_dtype: outDtype.value,
            };
            status.textContent = '任务创建中...';
            try {
              const job = await api.createFuseJob(payload);
              status.textContent = `已创建任务 ${shortId(job.id)}，正在运行...`;
              const final = await pollJob(api, job.id, (j) => {
                status.textContent = `任务 ${shortId(j.id)} 状态：${j.status}`;
              }, 1500);
              if (final.status === 'done') {
                status.textContent = `完成。输出 asset=${shortId(final.output_asset_id)}。建议去“资产”页发布并加到地图。`;
              } else {
                status.textContent = `失败：${final.message}`;
              }
            } catch (e) {
              status.textContent = `创建/运行失败：${e.message || e}`;
            }
          };

          status.textContent = '就绪。';
        } catch (e) {
          status.textContent = `加载失败：${e.message || e}`;
        }
      }

      init();
    }

    panel.appendChild(header);
    panel.appendChild(tabBar);
    panel.appendChild(content);
    root.appendChild(btn);
    root.appendChild(panel);

    document.body.appendChild(root);

    setTab(active);
    setActiveStyle();

    const observer = new MutationObserver(setActiveStyle);
    observer.observe(tabBar, { attributes: true, subtree: true, attributeFilter: ['data-active'] });
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
})();
