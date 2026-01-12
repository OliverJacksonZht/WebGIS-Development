# 06_feature_query_controls.js 代码详解

## 第一章：模块概述

### 在项目中的角色和定位
`06_feature_query_controls.js` 是WebGIS项目中的图查属性功能控制模块，负责管理地图要素查询的用户交互逻辑。该模块作为查询功能的核心控制器，提供了两种查询模式（单击查询和框选查询），并处理查询结果的展示和管理。

### 主要功能和职责
1. **查询模式管理**：支持单击查询和框选查询两种模式的切换
2. **交互控制**：管理地图上的鼠标交互行为和视觉反馈
3. **结果展示**：处理查询结果的UI展示，包括要素高亮和属性面板
4. **批量操作**：提供框选查询的批量要素选择和管理功能
5. **状态同步**：与其他功能模块进行状态同步，确保功能互斥性

### 与其他模块的直接依赖关系
- **依赖模块**：
  - `00_config_state.js`：获取全局状态变量（`isFeatureQueryActive`、`featureQueryMode`等）
  - `01_map_init.js`：使用地图对象（`map`）进行交互操作
  - `04_feature_query_core.js`：配合核心查询逻辑处理要素查询
- **被依赖模块**：
  - `07_attribute_query.js`：功能互斥，激活时需要关闭图查属性

### 与其他模块的间接关系
- 与测量绘制模块（`05_measure_draw.js`）保持功能互斥
- 与图层管理模块（`03_panels_basemap_delegation.js`）共享图层状态
- 与UI状态管理模块（`00_config_state.js`）同步操作提示

## 第二章：代码逐行解释

### 功能开关控制逻辑

```javascript
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
```

**代码解释**：
- 第2行：为图查属性切换按钮绑定点击事件监听器
- 第3-5行：如果功能当前处于激活状态，则调用`deactivateFeatureQuery()`关闭功能，并显示关闭提示
- 第6-10行：如果功能当前处于未激活状态，则调用`activateFeatureQuery()`激活功能，并根据当前模式显示相应的激活提示

### 功能激活与停用逻辑

```javascript
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
```

**代码解释**：
- 第2行：设置全局状态变量`isFeatureQueryActive`为true，标记功能已激活
- 第3行：为切换按钮添加'active'类，提供视觉反馈
- 第6-10行：根据当前查询模式（`featureQueryMode`）调用相应的激活函数
- 第13-17行：实现功能互斥，关闭其他可能冲突的功能（属性查图、测量、绘制等）

```javascript
function deactivateFeatureQuery() {
    isFeatureQueryActive = false;
    featureQueryToggleBtn.classList.remove('active');
    featureInfoPopup.classList.remove('active');
    batchResultsPanel.classList.remove('active');
    featureHighlightSource.clear();
    deactivateBoxSelection();
    map.getTargetElement().style.cursor = '';
}
```

**代码解释**：
- 第2行：设置全局状态变量为false，标记功能已关闭
- 第3行：移除按钮的'active'类，恢复默认样式
- 第4-5行：关闭要素信息弹窗和批量结果面板
- 第6行：清除要素高亮源中的所有要素
- 第7行：停用框选交互
- 第8行：恢复鼠标指针为默认样式

### 查询模式实现

#### 单击查询模式

```javascript
function activateSingleQueryMode() {
    map.getTargetElement().style.cursor = 'pointer';
}
```

**代码解释**：
- 第2行：将地图容器的鼠标指针设置为手型，提示用户可以点击查询要素

#### 框选查询模式

```javascript
function activateBoxSelectionMode() {
    map.getTargetElement().style.cursor = 'crosshair';
    startBoxSelection();
}
```

**代码解释**：
- 第2行：将鼠标指针设置为十字准星，提示用户可以进行框选操作
- 第3行：调用`startBoxSelection()`启动框选交互

```javascript
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
```

**代码解释**：
- 第3行：先清除可能存在的旧框选交互，避免重复绑定
- 第6-16行：创建OpenLayers的DragBox交互对象
  - 第7行：设置条件为`always`，意味着无需按住特定键，直接拖拽即可框选
  - 第8-15行：定义框选框的样式，包括虚线边框和半透明填充
- 第18行：将框选交互添加到地图上
- 第21-25行：绑定框选结束事件，获取框选范围并调用要素选择函数
- 第27行：显示操作提示，告知用户如何进行框选

### 要素选择与查询

```javascript
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
```

**代码解释**：
- 第3-4行：初始化选中的要素数组和图层结果对象
- 第7-8行：获取地图中的所有图层
- 第11-48行：遍历每个图层进行处理
  - 第12行：检查是否为矢量图层
  - 第18-24行：排除系统内部图层（绘制、测量、高亮等）
  - 第27-28行：获取图层ID和名称
  - 第33-34行：获取图层数据源和要素集合
  - 第39-46行：检查每个要素是否与框选范围相交，如果相交则添加到结果中
- 第52-53行：输出查询统计信息
- 第56行：调用结果显示函数

### 结果展示逻辑

```javascript
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
```

**代码解释**：
- 第4行：清空结果容器的内容
- 第7-10行：计算并更新统计信息（总要素数和图层数）
- 第12-22行：处理无结果的情况，显示空提示并清除高亮
- 第28-99行：按图层分组构建结果UI
  - 第35-39行：创建图层标题，显示图层名称和要素数量
  - 第42-88行：为每个要素创建显示项
    - 第47-55行：提取要素属性，排除几何属性和空值
    - 第59-76行：构建要素显示内容，最多显示前3个属性
    - 第80-83行：绑定点击事件，实现要素定位和高亮
  - 第91-93行：绑定图层标题点击事件，实现展开/折叠功能
- 第102行：高亮所有选中的要素
- 第105-106行：显示结果面板并更新操作提示

### 要素高亮与定位

```javascript
function highlightSelectedFeatures() {
    batchHighlightSource.clear();
    
    selectedFeatures.forEach(item => {
        const highlightFeature = item.feature.clone();
        batchHighlightSource.addFeature(highlightFeature);
    });
}
```

**代码解释**：
- 第2行：清除批量高亮源中的现有要素
- 第4-6行：遍历选中的要素，复制每个要素并添加到批量高亮源中

```javascript
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
```

**代码解释**：
- 第3-4行：清除所有现有的高亮要素
- 第7-8行：复制并高亮当前选中的要素
- 第11-16行：计算要素范围并设置地图视图，实现平滑缩放定位
- 第18行：显示定位成功的操作提示

### 查询模式切换

```javascript
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
```

**代码解释**：
- 第2-3行：获取模式切换按钮的DOM引用
- 第5-16行：单击查询模式切换逻辑
  - 第6行：如果已经是单击模式则直接返回
  - 第8-10行：更新模式状态和按钮样式
  - 第12-15行：如果功能当前激活，则停用框选并激活单击模式
- 第18-31行：框选查询模式切换逻辑
  - 第19行：如果已经是框选模式则直接返回
  - 第21-23行：更新模式状态和按钮样式
  - 第25-30行：如果功能当前激活，则清理界面并激活框选模式

## 第三章：关键点总结

### 核心技术要点

1. **OpenLayers交互管理**：
   - 使用`ol.interaction.DragBox`实现框选功能
   - 通过`condition: ol.events.condition.always`简化用户操作
   - 动态添加和移除地图交互，确保功能互斥

2. **空间查询算法**：
   - 使用`geometry.intersectsExtent(extent)`进行空间相交判断
   - 遍历所有矢量图层，排除系统图层
   - 支持跨图层的要素批量查询

3. **状态管理模式**：
   - 全局状态变量控制功能激活状态
   - 功能之间的互斥机制确保界面整洁
   - 实时更新用户操作提示

### 设计模式和架构特点

1. **事件驱动架构**：
   - 使用事件监听器处理用户交互
   - 通过回调函数实现异步操作的响应
   - 分离UI更新和业务逻辑

2. **模块化设计**：
   - 功能职责单一，专注于查询控制
   - 与其他模块通过全局变量和函数调用协作
   - 可独立测试和维护

3. **用户体验优化**：
   - 实时视觉反馈（鼠标指针变化、按钮状态）
   - 批量操作支持（框选多要素）
   - 智能结果展示（按图层分组、属性摘要）

### 潜在改进建议

1. **性能优化**：
   - 对于大型数据集，考虑使用空间索引加速查询
   - 实现要素懒加载，避免一次性加载过多数据
   - 添加查询结果分页功能

2. **功能扩展**：
   - 支持更多几何类型的框选（圆形、多边形）
   - 添加查询条件设置（属性过滤）
   - 实现查询结果导出功能

3. **代码优化**：
   - 将DOM操作抽象为独立的UI组件
   - 使用配置对象管理样式和设置
   - 增加错误处理和边界情况处理

4. **用户体验提升**：
   - 添加查询进度指示器
   - 支持键盘快捷键操作
   - 提供查询历史记录功能