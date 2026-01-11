// --- WFS 图层加载 ---
        layerConfigs.forEach(config => {
            const vectorSource = new ol.source.Vector({
                format: new ol.format.GeoJSON(),
                url: function(extent) {
                    return geoserverWfsUrl + 
                        '?service=WFS&version=1.1.0&request=GetFeature' +
                        '&typeName=' + config.layerName + 
                        '&outputFormat=application/json' + 
                        '&srsname=EPSG:3857' + 
                        '&bbox=' + extent.join(',') + ',EPSG:3857';
                },
                strategy: ol.loadingstrategy.bbox
            });

            vectorSource.on('featuresloaderror', (err) => console.error("加载失败", err));
            vectorSource.on('featuresloadstart', () => document.getElementById('loading-indicator').style.display = 'block');
            vectorSource.on('featuresloadend', () => document.getElementById('loading-indicator').style.display = 'none');

            // 监听要素加载完成事件，提取属性字段
            vectorSource.on('addfeature', function(event) {
                const feature = event.feature;
                const layerId = config.id;
                
                if (!layerAttributes[layerId]) {
                    layerAttributes[layerId] = new Set();
                }
                
                // 提取要素的所有属性字段（排除geometry）
                const properties = feature.getProperties();
                for (const key in properties) {
                    if (key !== 'geometry' && properties[key] !== null) {
                        layerAttributes[layerId].add(key);
                    }
                }
            });

            const styleFunction = function(feature) {
                // 获取要素的几何类型
                const type = feature.getGeometry().getType();
                
                // 基础样式配置
                const fillColor = hexToRgba(config.color, config.opacity);
                const borderColor = config.borderColor;
                
                // 1. 处理点 (Point / MultiPoint)
                // 点需要 image 属性来定义形状（如圆形）
                if (type === 'Point' || type === 'MultiPoint') {
                    return new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: 6, // 点的大小
                            fill: new ol.style.Fill({ color: config.color }), // 使用主色填充点
                            stroke: new ol.style.Stroke({ color: '#fff', width: 2 }) // 点的外圈
                        })
                    });
                }
                
                // 2. 处理线 (LineString / MultiLineString)
                // 线主要看 stroke，且通常需要比边界更粗一点，使用主色而不是边界色
                else if (type === 'LineString' || type === 'MultiLineString') {
                    return new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: config.color, // 线图层应该使用主色(color)而不是边界色(borderColor)
                            width: 3 // 线宽设为3，更容易看清
                        })
                    });
                }
                
                // 3. 处理面 (Polygon / MultiPolygon)
                // 面使用原有的逻辑
                else {
                    return new ol.style.Style({
                        stroke: new ol.style.Stroke({ color: borderColor, width: 1 }),
                        fill: new ol.style.Fill({ color: fillColor })
                    });
                }
            };

            const vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                style: styleFunction,
                visible: config.visible,
                properties: { id: config.id, name: config.name, config: config }
            });

            map.addLayer(vectorLayer);
            vectorLayers[config.id] = vectorLayer;
            createLayerControlUI(config);
        });

        function hexToRgba(hex, alpha) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        // --- 动态 UI 生成 ---
        function createLayerControlUI(config) {
            const container = document.getElementById('layer-list-container');
            const itemDiv = document.createElement('div');
            itemDiv.className = 'layer-item';
            
            itemDiv.innerHTML = `
                <div class="layer-header">
                    <span class="layer-name" data-zoom-id="${config.id}" title="点击缩放至此图层">${config.name}</span>
                    <input type="checkbox" ${config.visible ? 'checked' : ''} data-id="${config.id}" class="visible-toggle">
                </div>
                <div class="style-control">
                    <span>填充色:</span>
                    <input type="color" value="${config.color}" data-id="${config.id}" class="color-picker">
                </div>
                <div class="style-control">
                    <span>透明度:</span>
                    <input type="range" min="0" max="1" step="0.01" value="${config.opacity}" data-id="${config.id}" class="opacity-slider">
                    <span class="opacity-value">${Math.round(config.opacity*100)}%</span>
                </div>
            `;
            container.appendChild(itemDiv);
        }

        // ========== 初始化属性查图界面 ==========
        function initAttributeQueryUI() {
            // 清空图层选择器
            layerSelector.innerHTML = '';
            
            // 为每个图层创建选择按钮
            layerConfigs.forEach(config => {
                const layerBtn = document.createElement('button');
                layerBtn.className = 'layer-selector-btn';
                layerBtn.textContent = config.name;
                layerBtn.dataset.layerId = config.id;
                
                layerBtn.addEventListener('click', function() {
                    // 移除其他按钮的active状态
                    document.querySelectorAll('.layer-selector-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    
                    // 设置当前按钮为active
                    this.classList.add('active');
                    
                    // 更新当前查询图层
                    currentQueryLayer = config.id;
                    
                    // 更新属性字段下拉框
                    updateAttributeFields(config.id);
                });
                
                layerSelector.appendChild(layerBtn);
            });
            
            // 默认选择第一个图层
            if (layerConfigs.length > 0) {
                const firstLayerBtn = layerSelector.querySelector('.layer-selector-btn');
                if (firstLayerBtn) {
                    firstLayerBtn.click();
                }
            }
        }
        
        // ========== 更新属性字段下拉框 ==========
        function updateAttributeFields(layerId) {
            // 清空下拉框
            attributeFieldSelect.innerHTML = '<option value="">选择属性字段</option>';
            
            // 获取该图层的属性字段
            const attributes = layerAttributes[layerId];
            if (attributes && attributes.size > 0) {
                attributes.forEach(attr => {
                    const option = document.createElement('option');
                    option.value = attr;
                    option.textContent = attr;
                    attributeFieldSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "正在加载属性字段...";
                attributeFieldSelect.appendChild(option);
                
                // 尝试从图层要素中提取属性字段
                const layer = vectorLayers[layerId];
                if (layer) {
                    const source = layer.getSource();
                    const features = source.getFeatures();
                    
                    if (features.length > 0) {
                        const firstFeature = features[0];
                        const properties = firstFeature.getProperties();
                        
                        for (const key in properties) {
                            if (key !== 'geometry' && properties[key] !== null) {
                                const option = document.createElement('option');
                                option.value = key;
                                option.textContent = key;
                                attributeFieldSelect.appendChild(option);
                                
                                // 存储到属性集合中
                                if (!layerAttributes[layerId]) {
                                    layerAttributes[layerId] = new Set();
                                }
                                layerAttributes[layerId].add(key);
                            }
                        }
                        
                        // 移除加载提示
                        if (attributeFieldSelect.options.length > 1) {
                            attributeFieldSelect.remove(0);
                        }
                    }
                }
            }
        }
