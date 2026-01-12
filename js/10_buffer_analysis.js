// js/10_buffer_analysis.js
// 缓冲区分析模块 - (已移除互斥逻辑，点击时不关闭其他面板)

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
        console.warn("未找到缓冲区分析面板元素");
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
    // 3. UI 交互逻辑 (已修改：允许面板共存)
    // ==========================================

    // --- 点击【缓冲区按钮】逻辑 ---
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止冒泡

        // [修改点]：这里删除了“强制关闭其他面板”的逻辑
        // 现在点击缓冲区按钮，其他已打开的面板（如图层管理）将保持打开状态

        // 仅关闭底图选择器（可选，防止菜单遮挡，如果不需要也可以注释掉）
        const basemapSelector = document.getElementById('basemap-selector');
        if (basemapSelector) basemapSelector.classList.remove('active');

        // 切换缓冲区面板自身的显示/隐藏
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            updateStatus(`准备就绪`);
        }
    });

    // --- 点击【其他工具按钮】逻辑 ---
    // [保留逻辑]：为了避免屏幕太乱，点击其他工具按钮时，仍然建议关闭当前缓冲区面板
    // 如果你也希望点击其他按钮时不关闭缓冲区面板，可以将下面这段 addEventListener 代码整体注释掉
    document.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.tool-btn');
        // 如果点击了任意工具按钮，且不是缓冲区按钮
        if (targetBtn && targetBtn.id !== 'buffer-analysis-toggle') {
            panel.style.display = 'none';
        }
    });

    // 防止面板内部点击冒泡导致面板关闭
    panel.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // ==========================================

    // 4. 面板内部功能绑定
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
            // 安全清除
            if (window.state && window.state.bufferSource) {
                window.state.bufferSource.clear();
                updateStatus("结果已清除");
            }
        });
    }
}

// 核心分析函数 (Turf.js 计算) - 保持不变
function executeBuffer(layerId, distanceMeters) {
    updateStatus("正在计算...", "blue");

    // 1. 检查数据源图层
    if (typeof vectorLayers === 'undefined' || !vectorLayers[layerId]) {
        alert("未找到该图层数据，请确保图层配置正确。");
        return;
    }
    const targetLayer = vectorLayers[layerId];
    const source = targetLayer.getSource();
    const features = source.getFeatures();

    if (features.length === 0) {
        alert("该图层当前没有要素（可能是数据正在加载中或为空），请稍后再试。");
        updateStatus("图层无数据", "red");
        return;
    }

    // 2. 检查 Turf 库
    if (typeof turf === 'undefined') {
        alert("系统缺少 Turf.js 库，无法进行计算。");
        return;
    }

    // 3. 检查结果图层是否存在 (防御性编程)
    if (!window.state || !window.state.bufferSource) {
        console.warn("缓冲区图层未初始化，正在尝试重建...");
        window.state = window.state || {};
        window.state.bufferSource = new ol.source.Vector();
        window.state.bufferLayer = new ol.layer.Vector({
            source: window.state.bufferSource,
            style: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(0, 153, 255, 0.5)' }),
                stroke: new ol.style.Stroke({ color: 'rgba(0, 102, 204, 0.8)', width: 2 })
            }),
            zIndex: 9999
        });
        window.map.addLayer(window.state.bufferLayer);
    }

    // 清空旧结果
    window.state.bufferSource.clear();

    const format = new ol.format.GeoJSON();
    let successCount = 0;

    try {
        features.forEach(feature => {
            // 4. 坐标转换与计算
            const geoJson = format.writeFeatureObject(feature, {
                featureProjection: window.map.getView().getProjection(),
                dataProjection: 'EPSG:4326' 
            });

            const bufferedGeoJson = turf.buffer(geoJson, distanceMeters, {
                units: 'meters'
            });

            if (bufferedGeoJson) {
                const bufferedFeature = format.readFeature(bufferedGeoJson, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: window.map.getView().getProjection()
                });
                
                window.state.bufferSource.addFeature(bufferedFeature);
                successCount++;
            }
        });

        // 5. 缩放到结果范围
        if (successCount > 0) {
            const extent = window.state.bufferSource.getExtent();
            if (!ol.extent.isEmpty(extent)) {
                window.map.getView().fit(extent, { 
                    padding: [100, 100, 100, 100], 
                    duration: 1000 
                });
            }
            updateStatus(`分析成功，生成 ${successCount} 个缓冲区`, "green");
        } else {
            updateStatus("分析完成，但未生成有效图形", "orange");
        }

    } catch (e) {
        console.error("缓冲区分析错误:", e);
        updateStatus("分析发生错误，请查看控制台", "red");
    }
}

function updateStatus(text, color = "black") {
    const el = document.getElementById('buffer-status-text');
    if (el) {
        el.innerText = text;
        el.style.color = color;
    }
}