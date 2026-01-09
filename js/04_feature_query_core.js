// ========== 图查属性功能：地图点击事件 ==========
        map.on('click', function(event) {
            if (!isFeatureQueryActive || featureQueryMode !== 'single') {
                return;
            }
            
            // 清除之前的高亮
            featureHighlightSource.clear();
            
            // 查找点击的要素
            const pixel = event.pixel;
            const features = [];
            
            map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                // 排除绘制图层和测量图层
                if (layer !== drawLayer && layer !== measureLayer && 
                    layer !== featureHighlightLayer && layer !== queryHighlightLayer &&
                    layer !== batchHighlightLayer) {
                    features.push({feature: feature, layer: layer});
                }
                return false; // 只获取第一个要素
            });
            
            if (features.length > 0) {
                const clicked = features[0];
                const feature = clicked.feature;
                const layer = clicked.layer;
                
                // 高亮显示点击的要素
                const highlightFeature = feature.clone();
                featureHighlightSource.clear();
                featureHighlightSource.addFeature(highlightFeature);
                
                // 显示要素属性信息
                displayFeatureInfo(feature, layer);
                
                // 显示操作提示
                setOperationTip('✅ 已显示要素属性信息', true);
            } else {
                // 隐藏属性弹窗
                featureInfoPopup.classList.remove('active');
                featureHighlightSource.clear();
            }
        });

        // ========== 显示要素属性信息 ==========
        function displayFeatureInfo(feature, layer) {
            // 清空内容
            featureInfoContent.innerHTML = '';
            
            // 获取图层信息
            const layerProps = layer.getProperties();
            const layerName = layerProps.config ? layerProps.config.name : '未知图层';
            
            // 创建标题
            const header = document.createElement('div');
            header.className = 'feature-info-item';
            header.innerHTML = `
                <div class="feature-info-label">图层</div>
                <div class="feature-info-value">${layerName}</div>
            `;
            featureInfoContent.appendChild(header);
            
            // 获取要素属性
            const properties = feature.getProperties();
            let hasProperties = false;
            
            for (const key in properties) {
                // 跳过geometry字段
                if (key === 'geometry') continue;
                
                hasProperties = true;
                const value = properties[key];
                
                const item = document.createElement('div');
                item.className = 'feature-info-item';
                
                // 格式化值
                let displayValue = value;
                if (value === null || value === undefined) {
                    displayValue = '空值';
                } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                }
                
                item.innerHTML = `
                    <div class="feature-info-label">${key}</div>
                    <div class="feature-info-value">${displayValue}</div>
                `;
                featureInfoContent.appendChild(item);
            }
            
            // 如果没有属性
            if (!hasProperties) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'feature-info-empty';
                emptyMsg.textContent = '该要素没有属性信息';
                featureInfoContent.appendChild(emptyMsg);
            }
            
            // 显示弹窗
            featureInfoPopup.classList.add('active');
        }
