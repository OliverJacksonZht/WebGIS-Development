# 07_attribute_query.js 代码详解

## 第一章：模块概述

### 在项目中的角色和定位
`07_attribute_query.js` 是WebGIS项目中的属性查图功能模块，与图查属性功能形成互补关系。该模块允许用户通过设置属性条件来查询和定位地图要素，实现了从属性到空间的反向查询功能。

### 主要功能和职责
1. **属性条件设置**：提供图层选择、字段选择、操作符选择和值输入的查询条件构建界面
2. **查询执行引擎**：根据用户设置的条件在指定图层中执行要素查询
3. **结果展示管理**：显示查询结果列表，提供要素高亮和定位功能
4. **功能状态管理**：与图查属性功能实现互斥，确保界面清晰
5. **用户交互处理**：处理面板开关、键盘事件等用户交互

### 与其他模块的直接依赖关系
- **依赖模块**：
  - `00_config_state.js`：使用全局状态变量和UI元素
  - `01_map_init.js`：使用地图对象进行要素定位和高亮
  - `02_wfs_layer_ui.js`：获取图层配置信息（`layerConfigs`、`vectorLayers`）
- **被依赖模块**：
  - `06_feature_query_controls.js`：功能互斥，激活时需要关闭属性查图

### 与其他模块的间接关系
- 与测量绘制模块保持功能互斥关系
- 与图层管理模块共享矢量图层数据
- 与UI状态管理模块同步操作提示和面板状态

## 第二章：代码逐行解释

### 功能开关控制

```javascript
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
```

**代码解释**：
- 第2行：为属性查图切换按钮绑定点击事件监听器
- 第3行：切换属性查图面板的显示状态（`active`类）
- 第4行：同步切换按钮的激活状态，确保按钮样式与面板状态一致
- 第6-11行：如果面板被激活，显示激活提示并关闭其他冲突功能
- 第12-14行：如果面板被关闭，显示关闭提示

### UI初始化

```javascript
// 初始化属性查图UI
initAttributeQueryUI();
```

**代码解释**：
- 第2行：调用UI初始化函数，设置查询界面的各个组件

### 事件绑定

```javascript
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
```

**代码解释**：
- 第2-4行：为执行查询按钮绑定点击事件，调用查询执行函数
- 第7-9行：为清除查询按钮绑定点击事件，调用清除函数
- 第12-16行：为查询值输入框绑定键盘事件，支持回车键快速执行查询

### 面板关闭逻辑

```javascript
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
```

**代码解释**：
- 第2-4行：为面板关闭按钮绑定点击事件，调用停用函数
- 第7-13行：为整个文档添加点击事件监听，实现点击外部区域关闭面板的功能
  - 第8行：检查点击目标是否在面板内部
  - 第9行：检查点击目标是否是切换按钮本身
  - 第10行：检查点击目标是否在切换按钮内部
  - 第11行：如果面板当前处于激活状态，则调用停用函数
- 第16-19行：定义停用函数，移除面板和按钮的激活状态

### 查询执行核心逻辑

```javascript
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
```

**代码解释**：
- 第4-7行：从UI组件获取查询条件（图层ID、字段、操作符、查询值）
- 第10-21行：输入验证，确保用户设置了完整的查询条件
- 第24-28行：获取目标图层的引用和数据源
- 第31-32行：清理之前的查询结果和高亮显示
- 第35-36行：初始化匹配要素数组
- 第38-65行：遍历图层中的所有要素进行条件匹配
  - 第40-41行：获取要素的属性对象
  - 第42行：获取目标字段的值
  - 第45-47行：跳过不包含目标字段的要素
  - 第50-51行：将字段值和查询值都转换为小写字符串进行比较
  - 第54-62行：根据操作符类型执行不同的匹配逻辑
    - `equals`：精确相等匹配
    - `contains`：包含匹配
    - `startsWith`：前缀匹配
    - `endsWith`：后缀匹配
  - 第65-66行：如果匹配成功，将要素添加到结果数组
- 第69行：更新结果显示区域的计数信息
- 第71-80行：处理无查询结果的情况
- 第83-115行：构建查询结果列表UI
  - 第87-92行：提取要素的显示属性（排除几何属性）
  - 第95-97行：创建结果项的标题和详细信息内容
  - 第101-113行：为结果项绑定点击事件，实现要素定位和高亮
- 第119-121行：高亮所有匹配的要素
- 第124-132行：计算所有匹配要素的总体范围并缩放地图视图
- 第135行：显示查询成功的操作提示

### 查询清除功能

```javascript
// ========== 清除属性查询 ==========
function clearAttributeQuery() {
    queryHighlightSource.clear();
    queryResults.innerHTML = '<div class="feature-info-empty">查询结果将显示在这里</div>';
    resultCount.textContent = '(0个)';
    queryValueInput.value = '';
    
    setOperationTip('🧹 已清除查询高亮和结果', true);
}
```

**代码解释**：
- 第2行：清除查询高亮源中的所有要素
- 第3行：重置结果显示区域的默认内容
- 第4行：重置结果计数显示
- 第5行：清空查询值输入框
- 第7行：显示清除成功的操作提示

### 系统初始化完成提示

```javascript
// ========== 初始化完成提示 ==========
setTimeout(() => {
    console.log("系统初始化完成，图查属性和属性查图功能已加载");
    setOperationTip('✅ 系统加载完成，图查属性和属性查图功能已就绪', true);
}, 1000);
```

**代码解释**：
- 第2-6行：使用延时函数确保所有模块都已加载完成
- 第3行：在控制台输出初始化完成信息
- 第4-5行：向用户显示系统就绪的操作提示

## 第三章：关键点总结

### 核心技术要点

1. **属性查询算法**：
   - 支持多种字符串匹配操作符（等于、包含、前缀、后缀）
   - 大小写不敏感的字符串比较
   - 空值和未定义字段的安全处理

2. **动态UI构建**：
   - 根据图层结构动态生成字段选择选项
   - 实时更新查询结果计数
   - 动态创建结果列表项

3. **空间定位技术**：
   - 使用`ol.extent.extend()`计算多个要素的总体范围
   - 通过`map.getView().fit()`实现智能缩放定位
   - 支持单个要素定位和批量要素定位

4. **事件处理机制**：
   - 键盘事件支持（回车键执行查询）
   - 点击外部区域关闭面板
   - 结果项点击事件实现要素定位

### 设计模式和架构特点

1. **查询构建器模式**：
   - 将查询条件分解为独立的组件（图层、字段、操作符、值）
   - 支持灵活的条件组合
   - 清晰的输入验证流程

2. **结果处理器模式**：
   - 分离查询执行和结果展示逻辑
   - 统一的结果项构建和事件绑定
   - 支持批量操作和单个操作

3. **状态管理模式**：
   - 全局状态变量控制功能激活
   - 功能互斥机制确保界面清晰
   - 实时的用户反馈和状态提示

4. **防御性编程**：
   - 完善的输入验证
   - 空值和异常情况处理
   - 安全的DOM操作

### 潜在改进建议

1. **查询功能增强**：
   - 支持数值型字段的比较操作符（大于、小于、区间）
   - 添加多条件组合查询（AND、OR逻辑）
   - 支持正则表达式匹配

2. **性能优化**：
   - 对于大型数据集，实现分页加载
   - 添加查询进度指示器
   - 使用Web Worker处理大量数据的查询

3. **用户体验提升**：
   - 添加查询历史记录功能
   - 支持查询条件保存和加载
   - 提供查询结果导出功能（CSV、Excel）

4. **代码结构优化**：
   - 将查询逻辑抽象为独立的查询引擎类
   - 使用配置对象管理查询操作符和验证规则
   - 增加单元测试覆盖

5. **界面交互改进**：
   - 添加自动补全功能帮助用户输入查询值
   - 支持拖拽排序结果项
   - 提供更丰富的结果筛选和排序选项