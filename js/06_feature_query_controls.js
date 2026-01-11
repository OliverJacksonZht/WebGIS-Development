// ========== 图查属性功能控制 ==========
        featureQueryToggleBtn.addEventListener('click', function() {
            if (isFeatureQueryActive) {
                deactivateFeatureQuery();
                setOperationTip('🚫 已关闭【图查属性】功能', true);
            } else {
                activateFeatureQuery();
                const modeText = featureQueryMode === 'single' ? '单击查询' : '框选查询';
                setOperationTip(`🔍 已激活【图查属性-${modeText}】功能`, true);
            }
        });
        
        function activateFeatureQuery() {
            isFeatureQueryActive = true;
            featureQueryToggleBtn.classList.add('active');
            
            // 根据当前模式激活相应功能
            if (featureQueryMode === 'single') {
                activateSingleQueryMode();
            } else if (featureQueryMode === 'box') {
                activateBoxSelectionMode();
            }
            
            // 关闭其他功能
            deactivateAttributeQuery();
            clearMeasure();
            clearDraw();
            updateMeasureButtonStates(null);
            updateDrawButtonStates(null);
        }
        
        function deactivateFeatureQuery() {
            isFeatureQueryActive = false;
            featureQueryToggleBtn.classList.remove('active');
            featureInfoPopup.classList.remove('active');
            batchResultsPanel.classList.remove('active');
            featureHighlightSource.clear();
            deactivateBoxSelection();
            map.getTargetElement().style.cursor = '';
        }
        
        // 单机查询模式
        function activateSingleQueryMode() {
            map.getTargetElement().style.cursor = 'pointer';
        }
        
        // 框选查询模式 - 修正：简化框选交互
        function activateBoxSelectionMode() {
            map.getTargetElement().style.cursor = 'crosshair';
            startBoxSelection();
        }
        
        // 启动框选交互 - 简化版：直接拖拽框选，不需要按住任何键
        function startBoxSelection() {
            // 清除之前的框选交互
            deactivateBoxSelection();
            
            // 创建框选交互 - 使用always条件（直接拖拽即可框选）
            dragBoxInteraction = new ol.interaction.DragBox({
                condition: ol.events.condition.always, // 直接拖拽即可框选
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#2196F3',
                        width: 2,
                        lineDash: [5, 5]
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(33, 150, 243, 0.1)'
                    })
                })
            });
            
            map.addInteraction(dragBoxInteraction);
            
            // 框选结束事件
            dragBoxInteraction.on('boxend', function() {
                const extent = dragBoxInteraction.getGeometry().getExtent();
                console.log('框选范围:', extent);
                selectFeaturesInExtent(extent);
            });
            
            setOperationTip('📦 框选模式已激活，直接拖拽鼠标框选要素', true);
        }
        
        // 停用框选交互
        function deactivateBoxSelection() {
            if (dragBoxInteraction) {
                map.removeInteraction(dragBoxInteraction);
                dragBoxInteraction = null;
            }
        }
        
        // 在指定范围内选择要素 - 修正：确保能正确获取所有图层的要素
        function selectFeaturesInExtent(extent) {
            console.log('开始查询范围内的要素，范围:', extent);
            
            selectedFeatures = [];
            const layerResults = {};
            
            // 遍历所有矢量图层（排除绘制、测量和高亮图层）
            const layers = map.getLayers().getArray();
            console.log('总图层数:', layers.length);
            
            layers.forEach(function(layer, index) {
                // 检查是否是矢量图层
                if (layer instanceof ol.layer.Vector) {
                    const layerProps = layer.getProperties();
                    console.log(`图层${index}:`, layerProps);
                    
                    // 排除特殊图层
                    if (layer === drawLayer || 
                        layer === measureLayer || 
                        layer === featureHighlightLayer || 
                        layer === batchHighlightLayer || 
                        layer === queryHighlightLayer) {
                        return; // 跳过
                    }
                    
                    // 获取图层信息
                    const layerId = layerProps.id || (layerProps.config && layerProps.config.id);
                    const layerName = layerProps.config ? layerProps.config.name : `图层${index}`;
                    
                    console.log(`处理图层: ${layerName} (ID: ${layerId})`);
                    
                    // 获取源和要素
                    const source = layer.getSource();
                    if (!source) return;
                    
                    const features = source.getFeatures();
                    console.log(`图层 ${layerName} 有 ${features.length} 个要素`);
                    
                    // 查找在范围内的要素
                    const layerFeatures = [];
                    features.forEach(function(feature) {
                        const geometry = feature.getGeometry();
                        if (geometry && geometry.intersectsExtent(extent)) {
                            layerFeatures.push({
                                feature: feature,
                                layerId: layerId,
                                layerName: layerName
                            });
                        }
                    });
                    
                    if (layerFeatures.length > 0) {
                        console.log(`图层 ${layerName} 找到 ${layerFeatures.length} 个要素在范围内`);
                        layerResults[layerId || index] = {
                            layerName: layerName,
                            features: layerFeatures
                        };
                        selectedFeatures = selectedFeatures.concat(layerFeatures);
                    }
                }
            });
            
            console.log('总共找到要素数:', selectedFeatures.length);
            console.log('涉及图层数:', Object.keys(layerResults).length);
            
            // 显示结果
            displayBatchResults(layerResults);
        }
        
        // 显示框选结果
        function displayBatchResults(layerResults) {
            console.log('显示框选结果');
            
            // 清空结果容器
            batchResultsContainer.innerHTML = '';
            
            // 更新统计信息
            const totalCount = selectedFeatures.length;
            const layerCount = Object.keys(layerResults).length;
            
            batchTotalCount.textContent = totalCount;
            batchLayerCount.textContent = layerCount;
            
            if (totalCount === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'feature-info-empty';
                emptyMsg.textContent = '框选区域内未找到要素';
                batchResultsContainer.appendChild(emptyMsg);
                
                // 清除高亮
                batchHighlightSource.clear();
                
                setOperationTip('❌ 框选区域内未找到要素', true);
                return;
            }
            
            console.log('创建结果面板内容');
            
            // 按图层分组显示结果
            for (const layerId in layerResults) {
                const layerData = layerResults[layerId];
                const layerGroup = document.createElement('div');
                layerGroup.className = 'layer-results-group';
                
                // 图层标题
                const layerHeader = document.createElement('div');
                layerHeader.className = 'layer-results-header';
                layerHeader.innerHTML = `
                    ${layerData.layerName}
                    <span class="layer-results-count">${layerData.features.length}</span>
                `;
                
                // 图层内容容器
                const layerContent = document.createElement('div');
                layerContent.className = 'layer-results-content';
                
                // 添加要素列表
                layerData.features.forEach((item, index) => {
                    const featureItem = document.createElement('div');
                    featureItem.className = 'batch-feature-item';
                    featureItem.dataset.layerId = layerId;
                    featureItem.dataset.index = index;
                    
                    // 获取要素属性
                    const properties = item.feature.getProperties();
                    const propEntries = [];
                    
                    for (const key in properties) {
                        if (key !== 'geometry' && properties[key] !== null) {
                            let value = properties[key];
                            if (typeof value === 'object') {
                                value = JSON.stringify(value);
                            }
                            propEntries.push({key: key, value: String(value)});
                        }
                    }
                    
                    // 创建要素显示内容
                    let featureContent = '';
                    if (propEntries.length > 0) {
                        // 显示前3个属性
                        const displayProps = propEntries.slice(0, 3);
                        featureContent = displayProps.map(prop => `
                            <div class="batch-prop-item">
                                <div class="batch-prop-label">${prop.key}</div>
                                <div class="batch-prop-value">${prop.value}</div>
                            </div>
                        `).join('');
                        
                        // 如果有更多属性，显示提示
                        if (propEntries.length > 3) {
                            featureContent += `<div style="font-size: 11px; color: #888; margin-top: 4px;">... 还有 ${propEntries.length - 3} 个属性</div>`;
                        }
                    } else {
                        featureContent = '<div style="font-size: 12px; color: #888;">无属性信息</div>';
                    }
                    
                    featureItem.innerHTML = `
                        <div style="font-weight: 600; color: #3A4759; margin-bottom: 8px;">
                            要素 ${index + 1}
                        </div>
                        <div class="batch-feature-props">
                            ${featureContent}
                        </div>
                    `;
                    
                    // 点击要素事件
                    featureItem.addEventListener('click', function() {
                        highlightAndZoomToFeature(item.feature, layerId, index);
                    });
                    
                    layerContent.appendChild(featureItem);
                });
                
                // 图层标题点击事件（展开/折叠）
                layerHeader.addEventListener('click', function() {
                    layerContent.classList.toggle('collapsed');
                });
                
                layerGroup.appendChild(layerHeader);
                layerGroup.appendChild(layerContent);
                batchResultsContainer.appendChild(layerGroup);
            }
            
            // 高亮所有选中的要素
            highlightSelectedFeatures();
            
            // 显示结果面板
            batchResultsPanel.classList.add('active');
            
            setOperationTip(`✅ 框选到 ${totalCount} 个要素，涉及 ${layerCount} 个图层`, true);
        }
        
        // 高亮选中的要素
        function highlightSelectedFeatures() {
            batchHighlightSource.clear();
            
            selectedFeatures.forEach(item => {
                const highlightFeature = item.feature.clone();
                batchHighlightSource.addFeature(highlightFeature);
            });
        }
        
        // 高亮并定位到特定要素
        function highlightAndZoomToFeature(feature, layerId, index) {
            // 清除其他高亮
            featureHighlightSource.clear();
            batchHighlightSource.clear();
            
            // 高亮当前要素
            const highlightFeature = feature.clone();
            featureHighlightSource.addFeature(highlightFeature);
            
            // 定位到要素
            const extent = feature.getGeometry().getExtent();
            map.getView().fit(extent, {
                duration: 1000,
                padding: [50, 50, 50, 50],
                maxZoom: 15
            });
            
            setOperationTip(`📍 已定位到第 ${index + 1} 个要素`, true);
        }
        
        // 图查属性弹窗关闭按钮
        featureInfoPopup.querySelector('.close-panel').addEventListener('click', function() {
            featureInfoPopup.classList.remove('active');
            featureHighlightSource.clear();
        });
        
        // 框选结果面板关闭按钮
        batchResultsPanel.querySelector('.close-panel').addEventListener('click', function() {
            batchResultsPanel.classList.remove('active');
            batchHighlightSource.clear();
        });
        
        // 框选结果面板动作按钮
        batchClearHighlightBtn.addEventListener('click', function() {
            batchHighlightSource.clear();
            featureHighlightSource.clear();
            setOperationTip('🧹 已清除所有高亮要素', true);
        });
        
        batchZoomToAllBtn.addEventListener('click', function() {
            if (selectedFeatures.length === 0) return;
            
            // 计算所有选中要素的范围
            let overallExtent = null;
            selectedFeatures.forEach(item => {
                const extent = item.feature.getGeometry().getExtent();
                if (overallExtent === null) {
                    overallExtent = extent;
                } else {
                    overallExtent = ol.extent.extend(overallExtent, extent);
                }
            });
            
            if (overallExtent) {
                map.getView().fit(overallExtent, {
                    duration: 1000,
                    padding: [100, 100, 100, 100]
                });
                setOperationTip('📍 已定位到所有选中要素', true);
            }
        });

        // ========== 图查属性模式切换 ==========
        const singleQueryModeBtn = document.getElementById('single-query-mode');
        const boxQueryModeBtn = document.getElementById('box-query-mode');
        
        singleQueryModeBtn.addEventListener('click', function() {
            if (featureQueryMode === 'single') return;
            
            featureQueryMode = 'single';
            singleQueryModeBtn.classList.add('active');
            boxQueryModeBtn.classList.remove('active');
            
            if (isFeatureQueryActive) {
                deactivateBoxSelection();
                activateSingleQueryMode();
                setOperationTip('🔍 已切换到【单击查询】模式，点击地图要素查看属性', true);
            }
        });
        
        boxQueryModeBtn.addEventListener('click', function() {
            if (featureQueryMode === 'box') return;
            
            featureQueryMode = 'box';
            boxQueryModeBtn.classList.add('active');
            singleQueryModeBtn.classList.remove('active');
            
            if (isFeatureQueryActive) {
                featureInfoPopup.classList.remove('active');
                featureHighlightSource.clear();
                activateBoxSelectionMode();
                setOperationTip('📦 已切换到【框选查询】模式，直接拖拽鼠标框选要素', true);
            }
        });
