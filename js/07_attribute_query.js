// ========== 属性查图功能 ==========
        attributeQueryToggleBtn.addEventListener('click', function() {
            attributeQueryPanel.classList.toggle('active');
            this.classList.toggle('active', attributeQueryPanel.classList.contains('active'));
            
            if (attributeQueryPanel.classList.contains('active')) {
                setOperationTip('📊 已激活【属性查图】功能，请设置查询条件', true);
                
                // 关闭其他功能
                deactivateFeatureQuery();
                clearMeasure();
                clearDraw();
                updateMeasureButtonStates(null);
                updateDrawButtonStates(null);
            } else {
                setOperationTip('🚫 已关闭【属性查图】功能', true);
            }
        });
        
        // 初始化属性查图UI
        initAttributeQueryUI();
        
        // 执行查询按钮事件
        executeQueryBtn.addEventListener('click', function() {
            executeAttributeQuery();
        });
        
        // 清除查询按钮事件
        clearQueryBtn.addEventListener('click', function() {
            clearAttributeQuery();
        });
        
        // 回车键执行查询
        queryValueInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                executeAttributeQuery();
            }
        });
        
        // 属性查图面板关闭按钮
        attributeQueryPanel.querySelector('.close-panel').addEventListener('click', function() {
            deactivateAttributeQuery();
        });
        
        // 点击地图其他区域关闭属性查图面板
        document.addEventListener('click', function(event) {
            if (!attributeQueryPanel.contains(event.target) && 
                event.target !== attributeQueryToggleBtn && 
                !attributeQueryToggleBtn.contains(event.target) && 
                attributeQueryPanel.classList.contains('active')) {
                deactivateAttributeQuery();
            }
        });
        
        function deactivateAttributeQuery() {
            attributeQueryPanel.classList.remove('active');
            attributeQueryToggleBtn.classList.remove('active');
        }
        
        // ========== 执行属性查询 ==========
        function executeAttributeQuery() {
            // 获取查询条件
            const layerId = currentQueryLayer;
            const field = attributeFieldSelect.value;
            const operator = operatorSelect.value;
            const value = queryValueInput.value.trim();
            
            // 验证输入
            if (!layerId) {
                setOperationTip('❌ 请先选择图层', true);
                return;
            }
            
            if (!field) {
                setOperationTip('❌ 请选择属性字段', true);
                return;
            }
            
            if (!value) {
                setOperationTip('❌ 请输入查询值', true);
                return;
            }
            
            // 获取图层
            const layer = vectorLayers[layerId];
            if (!layer) {
                setOperationTip('❌ 图层不存在或未加载', true);
                return;
            }
            
            // 获取要素
            const source = layer.getSource();
            const features = source.getFeatures();
            
            // 清空之前的高亮和结果
            queryHighlightSource.clear();
            queryResults.innerHTML = '';
            
            // 执行查询
            const matchingFeatures = [];
            
            features.forEach(feature => {
                const properties = feature.getProperties();
                const fieldValue = properties[field];
                
                // 跳过不包含该字段的要素
                if (fieldValue === undefined || fieldValue === null) {
                    return;
                }
                
                let matches = false;
                const fieldStr = String(fieldValue).toLowerCase();
                const queryStr = String(value).toLowerCase();
                
                // 根据操作符判断是否匹配
                switch(operator) {
                    case 'equals':
                        matches = fieldStr === queryStr;
                        break;
                    case 'contains':
                        matches = fieldStr.includes(queryStr);
                        break;
                    case 'startsWith':
                        matches = fieldStr.startsWith(queryStr);
                        break;
                    case 'endsWith':
                        matches = fieldStr.endsWith(queryStr);
                        break;
                }
                
                if (matches) {
                    matchingFeatures.push(feature);
                }
            });
            
            // 更新结果计数
            resultCount.textContent = `(${matchingFeatures.length}个)`;
            
            if (matchingFeatures.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'feature-info-empty';
                emptyMsg.textContent = '未找到匹配的要素';
                queryResults.appendChild(emptyMsg);
                
                setOperationTip('❌ 未找到匹配的要素', true);
                return;
            }
            
            // 显示结果列表
            matchingFeatures.forEach((feature, index) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'query-result-item';
                resultItem.dataset.index = index;
                
                // 获取要素属性
                const properties = feature.getProperties();
                const displayProps = {};
                for (const key in properties) {
                    if (key !== 'geometry' && properties[key] !== null) {
                        displayProps[key] = properties[key];
                    }
                }
                
                // 创建结果项内容
                const title = properties[field] || `要素 ${index + 1}`;
                const details = Object.keys(displayProps)
                    .map(key => `${key}: ${displayProps[key]}`)
                    .join('<br>');
                
                resultItem.innerHTML = `
                    <div class="query-result-title">${title}</div>
                    <div class="query-result-details">${details}</div>
                `;
                
                // 点击结果项高亮对应要素并定位
                resultItem.addEventListener('click', function() {
                    // 高亮该要素
                    queryHighlightSource.clear();
                    const highlightFeature = feature.clone();
                    queryHighlightSource.addFeature(highlightFeature);
                    
                    // 定位到该要素
                    const extent = feature.getGeometry().getExtent();
                    map.getView().fit(extent, {
                        duration: 1000,
                        padding: [50, 50, 50, 50],
                        maxZoom: 15
                    });
                    
                    setOperationTip(`📍 已定位到第${index + 1}个匹配要素`, true);
                });
                
                queryResults.appendChild(resultItem);
            });
            
            // 高亮所有匹配的要素
            matchingFeatures.forEach(feature => {
                const highlightFeature = feature.clone();
                queryHighlightSource.addFeature(highlightFeature);
            });
            
            // 定位到所有匹配要素的范围
            if (matchingFeatures.length > 0) {
                const extents = matchingFeatures.map(f => f.getGeometry().getExtent());
                const overallExtent = extents.reduce((prev, curr) => {
                    return ol.extent.extend(prev, curr);
                }, extents[0]);
                
                map.getView().fit(overallExtent, {
                    duration: 1000,
                    padding: [100, 100, 100, 100]
                });
            }
            
            setOperationTip(`✅ 找到${matchingFeatures.length}个匹配要素`, true);
        }
        
        // ========== 清除属性查询 ==========
        function clearAttributeQuery() {
            queryHighlightSource.clear();
            queryResults.innerHTML = '<div class="feature-info-empty">查询结果将显示在这里</div>';
            resultCount.textContent = '(0个)';
            queryValueInput.value = '';
            
            setOperationTip('🧹 已清除查询高亮和结果', true);
        }

        // ========== 初始化完成提示 ==========
        setTimeout(() => {
            console.log("系统初始化完成，图查属性和属性查图功能已加载");
            setOperationTip('✅ 系统加载完成，图查属性和属性查图功能已就绪', true);
        }, 1000);
