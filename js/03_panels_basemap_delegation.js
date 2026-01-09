// --- 图层面板控制功能 ---
        const layerPanel = document.getElementById('layer-panel');
        const toggleLayerPanelBtn = document.getElementById('toggle-layer-panel');
        const closePanelBtn = document.querySelector('#layer-panel .close-panel');

        toggleLayerPanelBtn.addEventListener('click', function() {
            layerPanel.classList.toggle('active');
            this.classList.toggle('active', layerPanel.classList.contains('active'));
        });

        closePanelBtn.addEventListener('click', function() {
            layerPanel.classList.remove('active');
            toggleLayerPanelBtn.classList.remove('active');
        });

        document.addEventListener('click', function(event) {
            if (!layerPanel.contains(event.target) && 
                event.target !== toggleLayerPanelBtn && 
                !toggleLayerPanelBtn.contains(event.target) && 
                layerPanel.classList.contains('active')) {
                layerPanel.classList.remove('active');
                toggleLayerPanelBtn.classList.remove('active');
            }
        });

        // --- 底图切换控制功能 ---
        const basemapSelector = document.getElementById('basemap-selector');
        const toggleBasemapBtn = document.getElementById('toggle-basemap');
        const basemapOptions = document.querySelectorAll('.basemap-option');

        toggleBasemapBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            basemapSelector.classList.toggle('active');
            this.classList.toggle('active', basemapSelector.classList.contains('active'));
        });

        document.addEventListener('click', function(event) {
            if (!basemapSelector.contains(event.target) && 
                event.target !== toggleBasemapBtn && 
                !toggleBasemapBtn.contains(event.target) && 
                basemapSelector.classList.contains('active')) {
                basemapSelector.classList.remove('active');
                toggleBasemapBtn.classList.remove('active');
            }
        });

        basemapOptions.forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                basemapOptions.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                toggleBasemapBtn.classList.add('active');
                const layers = map.getLayers().getArray();
                const otherLayers = layers.filter(layer => !layer.get('isBaseLayerGroup'));
                const newBaseLayer = createBaseLayer(type);
                newBaseLayer.set('isBaseLayerGroup', true);
                map.setLayers([newBaseLayer, ...otherLayers]);
                basemapSelector.classList.remove('active');
            });
        });
        baseLayerGroup.set('isBaseLayerGroup', true);

        // --- 事件委托管理 ---
        document.getElementById('layer-list-container').addEventListener('click', (e) => {
            const target = e.target;
            if (target.classList.contains('layer-name')) {
                const layerId = target.getAttribute('data-zoom-id');
                const layer = vectorLayers[layerId];
                if(layer) {
                    const source = layer.getSource();
                    const extent = source.getExtent();
                    if (!ol.extent.isEmpty(extent) && Number.isFinite(extent[0])) {
                        console.log(`[缩放] 缩放至图层: ${layerId}, 范围: ${extent}`);
                        map.getView().fit(extent, {
                            duration: 1000, 
                            padding: [50, 50, 300, 350] 
                        });
                    } else {
                        alert("无法缩放：当前视野范围内未加载该图层数据。");
                    }
                }
            }
        });

        document.getElementById('layer-list-container').addEventListener('change', (e) => {
            const target = e.target;
            const layerId = target.getAttribute('data-id');
            if (!layerId) return;

            const config = layerConfigs.find(c => c.id === layerId);
            const layer = vectorLayers[layerId];

            if (target.classList.contains('visible-toggle')) {
                layer.setVisible(target.checked);
            } else if (target.classList.contains('color-picker')) {
                config.color = target.value;
                layer.changed();
            } else if (target.classList.contains('opacity-slider')) {
                config.opacity = parseFloat(target.value);
                target.nextElementSibling.textContent = Math.round(config.opacity*100) + '%';
                layer.changed();
            }
        });
