// js/10_buffer_analysis.js
// 缓冲区分析模块 - 最终修复版 (解决UI互斥Bug)

document.addEventListener('DOMContentLoaded', () => {
    initBufferAnalysis();
});

function initBufferAnalysis() {
    console.log("初始化缓冲区分析模块...");

    // 1. 获取核心DOM元素
    const toggleBtn = document.getElementById('buffer-analysis-toggle');
    const panel = document.getElementById('buffer-analysis-panel');
    const closeBtn = document.getElementById('close-buffer-panel');
    const executeBtn = document.getElementById('execute-buffer-analysis');
    const clearBtn = document.getElementById('clear-buffer-analysis');
    const layerSelect = document.getElementById('buffer-layer-select');

    if (!toggleBtn || !panel) {
        console.warn("未找到缓冲区分析面板元素，请确保HTML已更新");
        return;
    }

    // 2. 动态填充图层下拉框
    if (typeof layerConfigs !== 'undefined' && layerSelect) {
        layerSelect.innerHTML = '<option value="">-- 请选择图层 --</option>';
        layerConfigs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.id;
            option.textContent = config.name;
            layerSelect.appendChild(option);
        });
    }

    // ==========================================
    // 3. 核心修复：UI互斥逻辑 (使用事件委托)
    // ==========================================
    
    // 系统中所有其他面板的ID列表 (点击缓冲区按钮时，需要强制关闭这些)
    const otherPanelIds = [
        'layer-panel',                  // 图层管理
        'attribute-query-panel',        // 属性查图
        'feature-info-popup',           // 图查属性 (弹窗)
        'feature-batch-results-panel',  // 框选结果
        'path-analysis-panel'           // 路径分析
    ];

    // --- 逻辑 A: 点击【缓冲区按钮】---
    // 1. 关闭所有其他面板
    // 2. 切换缓冲区面板的显示状态
    toggleBtn.addEventListener('click', (e) => {
        // 阻止事件冒泡，防止触发下面的全局关闭逻辑
        e.stopPropagation();

        // 强制关闭其他所有已知面板
        // otherPanelIds.forEach(id => {
        //     const el = document.getElementById(id);
        //     if (el) el.style.display = 'none';
        // });
        
        // 关闭底图选择器（特例）
        const basemapSelector = document.getElementById('basemap-selector');
        if (basemapSelector) basemapSelector.classList.remove('active');

        // 切换自己
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) { // 如果是刚刚打开
            updateStatus(`准备就绪`);
        }
    });

    // --- 逻辑 B: 点击【其他工具按钮】 (事件委托) ---
    // 监听整个文档的点击。如果点的是工具栏按钮，且不是缓冲区按钮，则关闭缓冲区面板。
    // 这种方式不会干扰其他按钮原本的 onclick/addEventListener 逻辑。
    document.addEventListener('click', (e) => {
        // 查找被点击元素是否是 .tool-btn 或其子元素
        const targetBtn = e.target.closest('.tool-btn');

        // 如果点击的是工具按钮，且 ID 不是 buffer-analysis-toggle
        if (targetBtn && targetBtn.id !== 'buffer-analysis-toggle') {
            // 安全关闭缓冲区面板
            panel.style.display = 'none';
        }
    });

    // 阻止面板内部点击触发关闭 (防止在面板上操作时误关)
    panel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // ==========================================

    // 4. 面板内部功能按钮事件
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            panel.style.display = 'none';
        });
    }

    if (executeBtn) {
        executeBtn.addEventListener('click', () => {
            const layerId = layerSelect.value;
            const distance = parseFloat(document.getElementById('buffer-distance').value);

            if (!layerId) {
                alert("请先选择一个图层！");
                return;
            }
            if (!distance || distance <= 0) {
                alert("请输入有效的缓冲距离！");
                return;
            }
            executeBuffer(layerId, distance);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (window.state && window.state.bufferSource) {
                window.state.bufferSource.clear();
                updateStatus("结果已清除");
            }
        });
    }
}

// 核心分析函数 (Turf.js 计算)
function executeBuffer(layerId, distanceMeters) {
    updateStatus("正在计算...", "blue");

    const targetLayer = vectorLayers[layerId];
    if (!targetLayer) {
        alert("未找到该图层数据，请确保图层已加载。");
        return;
    }

    const source = targetLayer.getSource();
    const features = source.getFeatures();

    if (features.length === 0) {
        alert("该图层当前没有要素（可能正在加载中），请稍后再试。");
        updateStatus("图层无数据");
        return;
    }

    if (typeof turf === 'undefined') {
        alert("系统缺少 Turf.js 库，无法进行计算。");
        return;
    }

    const format = new ol.format.GeoJSON();
    
    // 清除旧结果
    if (window.state.bufferSource) {
        window.state.bufferSource.clear();
    }

    let successCount = 0;

    try {
        features.forEach(feature => {
            // 坐标系转换：EPSG:3857 (OpenLayers) -> EPSG:4326 (Turf)
            const geoJson = format.writeFeatureObject(feature, {
                featureProjection: 'map' in window ? map.getView().getProjection() : 'EPSG:3857',
                dataProjection: 'EPSG:4326' 
            });

            // 执行缓冲区计算
            const bufferedGeoJson = turf.buffer(geoJson, distanceMeters, {
                units: 'meters'
            });

            if (bufferedGeoJson) {
                // 坐标系转换回：EPSG:4326 -> EPSG:3857
                const bufferedFeature = format.readFeature(bufferedGeoJson, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'map' in window ? map.getView().getProjection() : 'EPSG:3857'
                });
                
                // 继承原要素的属性
                bufferedFeature.setProperties(feature.getProperties());
                
                window.state.bufferSource.addFeature(bufferedFeature);
                successCount++;
            }
        });

        // 自动缩放到结果范围
        if (successCount > 0 && window.state.bufferSource.getFeatures().length > 0) {
            const extent = window.state.bufferSource.getExtent();
            if (!ol.extent.isEmpty(extent)) {
                map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
            }
        }
        
        updateStatus(`成功生成 ${successCount} 个缓冲区`, "green");

    } catch (e) {
        console.error("缓冲区分析错误:", e);
        updateStatus("分析发生错误", "red");
    }
}

function updateStatus(text, color = "black") {
    const el = document.getElementById('buffer-status-text');
    if (el) {
        el.innerText = text;
        el.style.color = color;
    }
}