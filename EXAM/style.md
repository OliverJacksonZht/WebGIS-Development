# style.css 代码逐行解释

## 第一章：模块概述

### 在项目中的角色和定位
`style.css`是整个WebGIS项目的核心样式文件，负责定义所有UI组件的视觉表现和交互效果。它建立了统一的设计语言和视觉规范，确保应用界面的一致性和专业性。

### 主要功能和职责
1. **全局布局系统**：定义页面整体布局结构，包括头部、地图容器和浮动元素
2. **设计系统规范**：建立统一的配色方案、字体、间距和圆角等设计标准
3. **组件样式库**：为所有UI组件提供完整的样式定义，包括面板、按钮、表单等
4. **交互效果实现**：定义悬停、激活、过渡等交互状态的视觉反馈
5. **响应式适配**：提供移动端和小屏幕设备的样式适配

### 与其他模块的直接依赖关系
- **HTML结构**：直接依赖index.html中定义的DOM结构和class名称
- **JavaScript交互**：与所有JavaScript模块协同工作，提供样式切换和状态管理
- **OpenLayers样式**：补充和覆盖OpenLayers默认样式，确保视觉一致性

### 与其他模块的间接关系
- **地图功能**：通过样式支持地图控件的定位和显示
- **查询功能**：为查询结果面板提供样式支持
- **绘制功能**：为绘制工具提供视觉反馈样式

## 第二章：代码逐行解释

### 全局布局样式 (1-14行)
```css
/* --- 1. 全局布局 --- */
        body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            font-family: 'Segoe UI', 'Helavetica Neue', Arial, sans-serif; 
            overflow: hidden; 
            background-color: #f5f5f7; 
        }
```

- **第1行**：注释标识全局布局样式开始
- **第2-13行**：body和html元素的基础样式设置
  - `margin: 0; padding: 0;`：清除默认边距，确保全屏布局
  - `width: 100%; height: 100%;`：设置全屏宽高
  - `font-family`：定义字体栈，优先使用Segoe UI，回退到系统默认字体
  - `overflow: hidden;`：隐藏滚动条，防止页面滚动影响地图交互
  - `background-color: #f5f5f7;`：设置浅灰色背景色

### 顶部标题栏样式 (15-42行)
```css
        /* --- 2. 顶部标题栏 (深灰蓝主色) --- */
        .page-header {
            width: 100%;
            height: 10vh; 
            background: #3A4759; /* [配色] 深灰蓝 */
            box-shadow: 0 4px 12px rgba(58, 71, 89, 0.3);
            z-index: 10;
            display: flex;
            align-items: center;
            padding: 0 30px;
            box-sizing: border-box;
            position: absolute;
            top: 0;
            left: 0;
        }
        
        .page-header h1 {
            margin: 0;
            font-size: 24px;
            color: #ffffff; 
            font-weight: 500;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
        }

        .header-icon {
            width: 28px;
            height: 28px;
            background-color: #5D5A4F; /* [配色] 暖调灰黄 */
            border-radius: 4px;
            margin-right: 15px;
            display: inline-block;
            box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
        }
```

- **第15行**：注释标识顶部标题栏样式
- **第16-30行**：页面头部容器样式
  - `height: 10vh;`：使用视口高度单位，占屏幕高度的10%
  - `background: #3A4759;`：深灰蓝色主色调
  - `box-shadow`：添加投影效果，增强层次感
  - `z-index: 10;`：设置堆叠顺序，确保在其他元素之上
  - `display: flex; align-items: center;`：使用flex布局垂直居中
  - `position: absolute;`：绝对定位，固定在页面顶部
- **第31-39行**：标题文字样式
  - `color: #ffffff;`：白色文字
  - `letter-spacing: 1px;`：增加字间距，提升可读性
- **第40-42行**：标题图标样式
  - `background-color: #5D5A4F;`：暖调灰黄色
  - `box-shadow: 0 0 0 2px rgba(255,255,255,0.2);`：白色边框效果

### 地图容器样式 (43-49行)
```css
        /* --- 3. 地图容器 --- */
        #map { 
            width: 100%; 
            position: absolute;
            top: 10vh; 
            height: 90vh; 
            left: 0;
        }
```

- **第43行**：注释标识地图容器样式
- **第44-49行**：地图容器样式设置
  - `top: 10vh; height: 90vh;`：从顶部10vh开始，占剩余90%高度
  - `position: absolute;`：绝对定位，确保填满剩余空间

### 控制面板样式 (50-89行)
```css
        /* --- 4. 悬浮控制面板 --- */
        .control-panel {
            position: absolute; 
            top: 12vh;
            right: 70px; /* 向右调整，避免被按钮遮挡 */
            width: 320px;
            background: rgba(255, 255, 255, 0.98); 
            padding: 24px;
            border-radius: 12px; 
            box-shadow: 0 8px 24px rgba(58, 71, 89, 0.2); 
            z-index: 11;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(58, 71, 89, 0.1);
            max-height: 60vh; 
            overflow-y: auto;
            display: none; /* 默认隐藏 */
            transition: all 0.3s ease;
        }

        .control-panel.active {
            display: block; /* 显示时使用block */
        }

        .panel-header { 
            font-size: 16px; 
            font-weight: 700; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #3D5A5F; /* [配色] 莫兰迪墨绿 */
            padding-bottom: 12px; 
            color: #3A4759; /* [配色] 深灰蓝 */
            letter-spacing: 0.5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
```

- **第50行**：注释标识悬浮控制面板样式
- **第51-68行**：控制面板容器样式
  - `right: 70px;`：右侧定位，避免遮挡工具按钮
  - `background: rgba(255, 255, 255, 0.98);`：半透明白色背景
  - `backdrop-filter: blur(10px);`：背景模糊效果，增强层次感
  - `max-height: 60vh; overflow-y: auto;`：限制最大高度并支持滚动
  - `display: none;`：默认隐藏状态
- **第69-71行**：激活状态样式
- **第72-89行**：面板头部样式
  - `border-bottom: 2px solid #3D5A5F;`：莫兰迪墨绿底边
  - `display: flex; justify-content: space-between;`：flex布局，标题和关闭按钮分离

### 图层项样式 (90-115行)
```css
        .layer-item { 
            background: #f9f9fa; 
            border: 1px solid #e0e0e0; 
            padding: 14px; 
            margin-bottom: 12px; 
            border-radius: 8px; 
            transition: all 0.3s ease;
        }
        
        .layer-item:hover { 
            border-color: #3D5A5F; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.05); 
        }

        .layer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }

        .layer-name { 
            font-weight: 600; 
            font-size: 14px; 
            color: #3A4759; 
            cursor: pointer; 
            display: flex; 
            align-items: center; 
            transition: color 0.2s; 
        }
        .layer-name:hover { 
            color: #5C4B51; /* [配色] 低饱和暗红 */
            text-decoration: underline; 
        }
        .layer-name::before { content: "🔍"; font-size: 12px; margin-right: 8px; opacity: 0.5; filter: grayscale(100%); }
```

- **第90-95行**：图层项容器样式
  - `background: #f9f9fa;`：浅灰色背景
  - `transition: all 0.3s ease;`：平滑过渡效果
- **第96-100行**：悬停状态样式
  - `border-color: #3D5A5F;`：悬停时边框变色
  - `box-shadow`：悬停时添加阴影效果
- **第101行**：图层头部布局
- **第102-115行**：图层名称样式
  - `cursor: pointer;`：鼠标指针样式
  - `::before`：伪元素添加搜索图标
  - `filter: grayscale(100%);`：图标灰度效果

### 样式控制组件 (116-124行)
```css
        .style-control { display: flex; align-items: center; font-size: 12px; color: #5D5A4F; margin-top: 8px; }
        
        input[type="color"] { border: none; width: 24px; height: 24px; cursor: pointer; margin-left: auto; background: none; border-radius: 50%; overflow: hidden; }
        input[type="range"] { margin-left: 10px; flex: 1; cursor: pointer; accent-color: #3D5A5F; }
        .opacity-value { width: 35px; text-align: right; color: #3A4759; font-weight: bold;}
```

- **第116行**：样式控制容器布局
- **第117行**：颜色选择器样式
  - `border-radius: 50%;`：圆形外观
- **第118行**：范围滑块样式
  - `accent-color: #3D5A5F;`：自定义滑块颜色
- **第119行**：透明度数值显示样式

### 状态提示组件 (125-145行)
```css
        /* --- 5. 其他组件 --- */
        #mouse-position {
            position: absolute; 
            bottom: 10px; 
            right: 10px; 
            background: rgba(58, 71, 89, 0.85); 
            color: #fff; 
            padding: 6px 16px;
            border-radius: 4px; 
            font-size: 12px; 
            z-index: 10; 
            pointer-events: none;
            font-family: 'Consolas', monospace;
            backdrop-filter: blur(2px);
        }
        
        #loading-indicator {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(58, 71, 89, 0.9); 
            color: white; padding: 15px 30px; border-radius: 30px;
            display: none; z-index: 1000; font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        
        .visible-toggle {
            accent-color: #3D5A5F; 
            transform: scale(1.1);
        }
```

- **第125行**：注释标识其他组件样式
- **第126-138行**：鼠标位置显示样式
  - `font-family: 'Consolas', monospace;`：等宽字体，适合坐标显示
  - `pointer-events: none;`：不响应鼠标事件
- **第139-145行**：加载指示器样式
  - `transform: translate(-50%, -50%);`：居中定位
  - `border-radius: 30px;`：圆角胶囊形状
- **第146-148行**：可见性切换开关样式

### 工具按钮样式 (149-185行)
```css
        /* --- 工具按钮 --- */
        .tool-buttons {
            position: absolute;
            top: 12vh;
            right: 20px;
            z-index: 12;
            display: flex;
            flex-direction: column;
            gap: 8px; /* 缩小间距避免溢出 */
            max-height: 85vh; /* 限制高度 */
            overflow-y: auto; /* 按钮过多时可滚动 */
            padding-bottom: 10px;
        }

        .tool-btn {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: none;
            background-color: white;
            box-shadow: 0 2px 8px rgba(58, 71, 89, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }

        .tool-btn:hover {
            background-color: #f0f0f5;
            transform: translateY(-2px);
        }

        .tool-btn.active {
            background-color: #3D5A5F;
            color: white;
        }
```

- **第149行**：注释标识工具按钮样式
- **第150-161行**：工具按钮容器样式
  - `flex-direction: column;`：垂直排列
  - `gap: 8px;`：按钮间距
  - `overflow-y: auto;`：支持滚动
- **第162-172行**：单个工具按钮样式
  - `border-radius: 8px;`：圆角设计
  - `display: flex; align-items: center; justify-content: center;`：居中对齐
- **第173-176行**：悬停状态样式
  - `transform: translateY(-2px);`：向上移动效果
- **第177-180行**：激活状态样式
  - `background-color: #3D5A5F;`：激活时背景色变化

### 测量工具提示样式 (181-200行)
```css
        .measure-tooltip {
            position: absolute;
            background-color: white;
            padding: 4px 8px;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            font-size: 12px;
            pointer-events: none;
            white-space: nowrap;
        }

        .measure-tooltip-static {
            background-color: #3A4759;
            color: white;
            padding: 5px 10px;
        }

        /* 针对移动端或小屏幕进一步缩放按钮 */
        @media (max-height: 800px) {
            .tool-btn {
                width: 36px;
                height: 36px;
                font-size: 14px;
            }
        }
```

- **第181-190行**：测量工具提示样式
  - `pointer-events: none;`：不响应鼠标事件
  - `white-space: nowrap;`：不换行显示
- **第191-195行**：静态提示样式
  - `background-color: #3A4759;`：深色背景
- **第196-200行**：响应式媒体查询
  - `@media (max-height: 800px)`：小屏幕适配
  - 调整按钮尺寸以适应小屏幕

### 路径分析面板样式 (201-214行)
```css
        /* 路径分析面板特定样式 */
        #path-analysis-panel {
            display: none; /* 初始隐藏 */
            width: 340px;
            left: 20px; /* 改为左侧弹出，避免遮挡右侧按钮 */
        }
        #path-analysis-panel.active {
            display: block;
        }
```

- **第201行**：注释标识路径分析面板样式
- **第202-206行**：路径分析面板基础样式
  - `left: 20px;`：左侧定位
  - `display: none;`：默认隐藏
- **第207-214行**：激活状态样式

### 绘制工具提示样式 (215-232行)
```css
        /* ========== 绘制提示专属样式（与测量统一视觉） ========== */
        .draw-tooltip {
            background-color: rgba(80, 130, 200, 0.95);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.5);
            position: absolute;
            padding: 4px 8px;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.2);
            font-size: 12px;
            pointer-events: none;
            white-space: nowrap;
        }
        .draw-tip-static {
            background-color: #3A4759;
            color: #fff;
            padding: 6px 12px;
        }
```

- **第215行**：注释标识绘制工具提示样式
- **第216-227行**：绘制工具提示样式
  - `background-color: rgba(80, 130, 200, 0.95);`：蓝色半透明背景
  - `border: 1px solid rgba(255,255,255,0.5);`：半透明白色边框
- **第228-232行**：静态提示样式

### 全局操作提示样式 (233-247行)
```css
        /* ========== 全局操作状态提示条 ========== */
        #operation-tip {
            position: absolute;
            top: 12vh;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(58, 71, 89, 0.9);
            color: #fff;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 13px;
            z-index: 15;
            pointer-events: none;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
```

- **第233行**：注释标识全局操作提示样式
- **第234-247行**：操作提示条样式
  - `left: 50%; transform: translateX(-50%);`：水平居中
  - `border-radius: 20px;`：圆角胶囊形状
  - `z-index: 15;`：高优先级显示

### 底图切换组件样式 (248-300行)
```css
        /* --- 左上角底图切换按钮和选择器 --- */
        .basemap-container {
            position: absolute;
            top: 12vh;
            left: 80px; /* 向右移动，给地图缩放控件留出空间 */
            z-index: 11;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .basemap-btn-main {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            border: none;
            background-color: white;
            box-shadow: 0 2px 8px rgba(58, 71, 89, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }

        .basemap-btn-main:hover {
            background-color: #f0f0f5;
            transform: translateY(-2px);
        }

        .basemap-btn-main.active {
            background-color: #3D5A5F;
            color: white;
        }

        .basemap-selector {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(58, 71, 89, 0.2);
            overflow: hidden;
            display: none; /* 默认隐藏 */
            min-width: 120px;
        }

        .basemap-selector.active {
            display: block; /* 显示时使用block */
        }

        .basemap-option {
            border: none;
            background: none;
            padding: 10px 16px;
            width: 100%;
            text-align: left;
            cursor: pointer;
            transition: background-color 0.2s;
            font-size: 14px;
        }

        .basemap-option:hover, .basemap-option.active {
            background-color: #f0f0f5;
            font-weight: 500;
        }
```

- **第248行**：注释标识底图切换组件样式
- **第249-257行**：底图切换容器样式
  - `left: 80px;`：左侧定位，为地图控件留空间
  - `flex-direction: column;`：垂直排列
- **第258-272行**：主按钮样式
  - 与工具按钮保持一致的视觉风格
- **第273-284行**：底图选择器样式
  - `display: none;`：默认隐藏
  - `min-width: 120px;`：最小宽度
- **第285-300行**：底图选项样式
  - `width: 100%; text-align: left;`：全宽左对齐
  - 悬停和激活状态样式

### 关闭按钮样式 (301-315行)
```css
        /* 关闭按钮样式 */
        .close-panel {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 20px;
            color: #3A4759;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }

        .close-panel:hover {
            background-color: rgba(58, 71, 89, 0.1);
        }
```

- **第301行**：注释标识关闭按钮样式
- **第302-314行**：关闭按钮基础样式
  - `border-radius: 50%;`：圆形按钮
  - `display: flex; align-items: center; justify-content: center;`：居中对齐
- **第315行**：悬停状态样式

### 图查属性弹窗样式 (316-385行)
```css
        /* ========== 新增：图查属性功能样式 ========== */
        .feature-info-popup {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.98);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(58, 71, 89, 0.2);
            padding: 0;
            width: 350px;
            max-height: 70vh;
            overflow-y: auto;
            display: none;
            z-index: 20;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(58, 71, 89, 0.1);
        }
        
        .feature-info-popup.active {
            display: block;
        }
        
        .feature-info-header {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 15px;
            color: #3A4759;
            border-bottom: 2px solid #3D5A5F;
            padding: 16px 16px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f9f9fa;
            border-radius: 12px 12px 0 0;
        }
        
        .feature-info-content {
            padding: 16px;
        }
        
        .feature-info-item {
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .feature-info-label {
            font-weight: 600;
            color: #3A4759;
            font-size: 13px;
            margin-bottom: 4px;
        }
        
        .feature-info-value {
            color: #5D5A4F;
            font-size: 14px;
            word-break: break-word;
        }
        
        .feature-info-empty {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 20px 0;
        }
```

- **第316行**：注释标识图查属性功能样式
- **第317-335行**：信息弹窗容器样式
  - `transform: translate(-50%, -50%);`：居中定位
  - `width: 350px; max-height: 70vh;`：固定宽度，最大高度限制
- **第336-347行**：弹窗头部样式
  - `background-color: #f9f9fa;`：浅灰色背景
  - `border-radius: 12px 12px 0 0;`：顶部圆角
- **第348-350行**：内容区域样式
- **第351-354行**：信息项样式
- **第355-358行**：标签样式
- **第359-362行**：值样式
- **第363-367行**：空状态样式

### 框选查询结果面板样式 (368-485行)
```css
        /* ========== 新增：框选查询结果面板样式 ========== */
        .feature-batch-results-panel {
            position: absolute;
            top: 12vh;
            left: 160px;
            z-index: 12;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(58, 71, 89, 0.2);
            padding: 0;
            width: 500px;
            max-height: 70vh;
            overflow: hidden;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(58, 71, 89, 0.1);
        }
        
        .feature-batch-results-panel.active {
            display: flex;
            flex-direction: column;
        }
        
        .batch-results-header {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 0;
            color: #3A4759;
            border-bottom: 2px solid #3D5A5F;
            padding: 16px 16px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #f9f9fa;
            border-radius: 12px 12px 0 0;
            flex-shrink: 0;
        }
        
        .batch-results-content {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }
        
        .batch-results-stats {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .batch-results-count {
            font-size: 14px;
            font-weight: 600;
            color: #3D5A5F;
        }
        
        .batch-results-layers {
            font-size: 12px;
            color: #5D5A4F;
        }
        
        .layer-results-group {
            margin-bottom: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .layer-results-header {
            background-color: #f5f7fa;
            padding: 10px 16px;
            font-weight: 600;
            color: #3A4759;
            font-size: 14px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .layer-results-header:hover {
            background-color: #e8ebf0;
        }
        
        .layer-results-count {
            background-color: #3D5A5F;
            color: white;
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 10px;
            margin-left: 10px;
        }
        
        .layer-results-content {
            max-height: 300px;
            overflow-y: auto;
            display: block;
        }
        
        .layer-results-content.collapsed {
            display: none;
        }
        
        .batch-feature-item {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .batch-feature-item:hover {
            background-color: #f9f9fa;
        }
        
        .batch-feature-item:last-child {
            border-bottom: none;
        }
        
        .batch-feature-props {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }
        
        .batch-prop-item {
            display: flex;
            flex-direction: column;
        }
        
        .batch-prop-label {
            font-size: 11px;
            color: #888;
            margin-bottom: 2px;
        }
        
        .batch-prop-value {
            font-size: 13px;
            color: #3A4759;
            word-break: break-word;
        }
        
        .batch-results-actions {
            display: flex;
            gap: 10px;
            padding: 16px;
            border-top: 1px solid #e0e0e0;
            flex-shrink: 0;
        }
        
        .batch-action-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .batch-action-btn.primary {
            background-color: #3D5A5F;
            color: white;
        }
        
        .batch-action-btn.primary:hover {
            background-color: #2a3f44;
        }
        
        .batch-action-btn.secondary {
            background-color: #f0f0f5;
            color: #3A4759;
        }
        
        .batch-action-btn.secondary:hover {
            background-color: #e0e0ea;
        }
```

- **第368行**：注释标识框选查询结果面板样式
- **第369-385行**：结果面板容器样式
  - `width: 500px;`：固定宽度
  - `display: flex; flex-direction: column;`：垂直flex布局
- **第386-398行**：面板头部样式
  - `flex-shrink: 0;`：不收缩
- **第399-402行**：内容区域样式
  - `flex: 1;`：占用剩余空间
- **第403-412行**：统计信息样式
- **第413-485行**：图层结果组和操作按钮样式

### 属性查图面板样式 (486-650行)
```css
        /* ========== 新增：属性查图功能样式 ========== */
        .attribute-query-panel {
            position: absolute;
            top: 12vh;
            left: 160px;
            z-index: 12;
            background: rgba(255, 255, 255, 0.98);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(58, 71, 89, 0.2);
            padding: 16px;
            width: 320px;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(58, 71, 89, 0.1);
        }
        
        .attribute-query-panel.active {
            display: block;
        }
        
        .query-section {
            margin-bottom: 20px;
        }
        
        .query-section-title {
            font-size: 14px;
            font-weight: 700;
            color: #3A4759;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .layer-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .layer-selector-btn {
            padding: 6px 12px;
            background-color: #f0f0f5;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .layer-selector-btn:hover {
            background-color: #e0e0ea;
        }
        
        .layer-selector-btn.active {
            background-color: #3D5A5F;
            color: white;
            border-color: #3D5A5F;
        }
        
        .query-control {
            margin-bottom: 12px;
        }
        
        .query-control label {
            display: block;
            font-size: 13px;
            color: #5D5A4F;
            margin-bottom: 4px;
            font-weight: 500;
        }
        
        .query-control select,
        .query-control input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }
        
        .query-control select:focus,
        .query-control input:focus {
            outline: none;
            border-color: #3D5A5F;
        }
        
        .query-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .query-button {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .query-button.primary {
            background-color: #3D5A5F;
            color: white;
        }
        
        .query-button.primary:hover {
            background-color: #2a3f44;
        }
        
        .query-button.secondary {
            background-color: #f0f0f5;
            color: #3A4759;
        }
        
        .query-button.secondary:hover {
            background-color: #e0e0ea;
        }
        
        .query-results {
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 10px;
        }
        
        .query-result-item {
            padding: 10px;
            border-bottom: 1px solid #f0f0f0;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .query-result-item:hover {
            background-color: #f9f9fa;
        }
        
        .query-result-item:last-child {
            border-bottom: none;
        }
        
        .query-result-title {
            font-weight: 600;
            color: #3A4759;
            font-size: 13px;
            margin-bottom: 4px;
        }
        
        .query-result-details {
            font-size: 12px;
            color: #5D5A4F;
        }
```

- **第486行**：注释标识属性查图功能样式
- **第487-496行**：属性查图面板容器样式
- **第497-502行**：查询区域样式
- **第503-525行**：图层选择器样式
  - `flex-wrap: wrap;`：支持换行
  - `gap: 8px;`：按钮间距
- **第526-545行**：查询控件样式
  - `transition: border-color 0.3s;`：边框颜色过渡
- **第546-580行**：查询按钮样式
- **第581-650行**：查询结果样式

### 高亮和选择样式 (651-700行)
```css
        /* 高亮样式 */
        .highlight-layer {
            z-index: 9;
        }
        
        .highlight-style {
            stroke: #FF5722;
            stroke-width: 3;
            fill: rgba(255, 87, 34, 0.1);
        }
        
        /* 框选样式 */
        .selection-box {
            border: 2px dashed #2196F3;
            background-color: rgba(33, 150, 243, 0.1);
            position: absolute;
            z-index: 100;
            pointer-events: none;
        }
        
        /* 图查属性模式切换按钮 */
        .feature-query-mode {
            display: flex;
            margin-top: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .feature-query-mode-btn {
            flex: 1;
            padding: 8px;
            border: none;
            background-color: #f0f0f5;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        
        .feature-query-mode-btn.active {
            background-color: #3D5A5F;
            color: white;
        }
        
        .feature-query-mode-btn:hover:not(.active) {
            background-color: #e0e0ea;
        }
```

- **第651行**：注释标识高亮样式
- **第652-657行**：高亮图层样式
  - `z-index: 9;`：高亮层级
  - `stroke: #FF5722;`：橙色边框
- **第658-666行**：框选样式
  - `border: 2px dashed #2196F3;`：蓝色虚线边框
  - `pointer-events: none;`：不响应鼠标事件
- **第667-700行**：模式切换按钮样式
  - `overflow: hidden;`：隐藏溢出
  - `:not(.active)`：非激活状态悬停效果

## 第三章：关键点总结

### 核心技术要点
1. **CSS变量系统**：使用统一的配色方案，便于主题管理
2. **Flexbox布局**：大量使用flex布局实现复杂的UI结构
3. **响应式设计**：通过媒体查询实现不同屏幕尺寸的适配
4. **动画效果**：使用transition和transform实现平滑的交互体验
5. **层级管理**：通过z-index合理管理元素的堆叠顺序

### 设计模式和架构特点
1. **模块化样式组织**：按功能模块组织CSS代码，便于维护
2. **BEM命名规范**：使用block-element-modifier命名约定
3. **状态驱动样式**：通过class切换实现不同状态的样式变化
4. **渐进增强**：基础样式优先，增强样式逐步添加
5. **一致性设计**：统一的间距、颜色、圆角等设计规范

### 配色方案分析
1. **主色调**：#3A4759（深灰蓝）- 用于主要UI元素
2. **辅助色**：#3D5A5F（莫兰迪墨绿）- 用于强调和激活状态
3. **背景色**：#f5f5f7（浅灰）- 用于页面背景
4. **文字色**：#5D5A4F（暖调灰黄）- 用于次要文字
5. **强调色**：#FF5722（橙色）- 用于高亮和警告

### 潜在改进建议
1. **CSS预处理器**：可以考虑使用Sass/Less提升CSS的可维护性
2. **CSS变量**：引入CSS自定义属性实现动态主题切换
3. **组件化样式**：可以考虑使用CSS-in-JS或CSS模块化方案
4. **性能优化**：关键CSS内联，非关键CSS异步加载
5. **无障碍优化**：增强对比度和键盘导航样式支持