console.log("系统启动...");

        // --- 配置部分 ---
        const geoserverWfsUrl = 'http://10.8.49.5:8080/geoserver/wrok1/wfs';
        const tiandituKey = '189f632fbb6e9fc887396a0cd8b57bab'; 

        const layerConfigs = [
            {
                id: 'custom_layer_1',
                name: '山东省行政区划',
                layerName: 'wrok1:面',
                visible: true,
                color: '#594A42', 
                borderColor: '#3A4759', 
                opacity: 0.9
            },
            {
                id: 'custom_layer_2',
                name: '深圳行政区划',
                layerName: 'wrok1:深圳行政区划',
                visible: true,
                color: '#3E5F64', 
                borderColor: '#ffffff',
                opacity: 0.9
            }
        ];

        const vectorLayers = {};
        let measureSource, measureLayer;
        let sketch, helpTooltipElement, helpTooltip, measureTooltipElement, measureTooltip;
        let activeMeasureTool = null;

        // ========== 绘制功能核心变量（新增提示相关变量） ==========
        let drawSource, drawLayer;    // 绘制图层和数据源
        let activeDrawTool = null;    // 当前激活的绘制工具
        let drawInteraction = null;   // 绘制交互实例
        // 绘制提示专属变量
        let drawHelpTooltipElement, drawHelpTooltip; // 鼠标跟随绘制提示
        const operationTip = document.getElementById('operation-tip'); // 全局状态提示

        // ========== 新增功能变量 ==========
        // 图查属性相关
        let featureInfoPopup = document.getElementById('feature-info-popup');
        let featureInfoContent = document.getElementById('feature-info-content');
        let featureQueryToggleBtn = document.getElementById('feature-query-toggle');
        let featureHighlightSource, featureHighlightLayer;
        let isFeatureQueryActive = false;
        let featureQueryMode = 'single'; // 'single' 或 'box'
        
        // 框选查询相关变量
        let batchResultsPanel = document.getElementById('feature-batch-results-panel');
        let batchResultsContainer = document.getElementById('batch-results-container');
        let batchTotalCount = document.getElementById('batch-total-count');
        let batchLayerCount = document.getElementById('batch-layer-count');
        let batchClearHighlightBtn = document.getElementById('batch-clear-highlight');
        let batchZoomToAllBtn = document.getElementById('batch-zoom-to-all');
        let selectionBox = null; // 框选矩形
        let dragBoxInteraction = null; // 框选交互
        let batchHighlightSource, batchHighlightLayer;
        let selectedFeatures = []; // 存储框选到的要素
        
        // 属性查图相关
        let attributeQueryPanel = document.getElementById('attribute-query-panel');
        let attributeQueryToggleBtn = document.getElementById('attribute-query-toggle');
        let layerSelector = document.getElementById('layer-selector');
        let attributeFieldSelect = document.getElementById('attribute-field');
        let operatorSelect = document.getElementById('operator');
        let queryValueInput = document.getElementById('query-value');
        let executeQueryBtn = document.getElementById('execute-query');
        let clearQueryBtn = document.getElementById('clear-query');
        let queryResults = document.getElementById('query-results');
        let resultCount = document.getElementById('result-count');
        let queryHighlightSource, queryHighlightLayer;
        let currentQueryLayer = null;
        let layerAttributes = {}; // 存储各图层的属性字段


        // 存储路径分析的状态以及起点和终点的坐标
        let isPathAnalysisActive = false;
        let pathPoints = {
            start: null,
            end: null,
            waypoints: [], // 存储途径点 [[lon, lat], ...]
            barriers: []   // 存储障碍点
        };
        let pathSource, pathLayer;
        let currentPathType = 'start'; // 当前正在点选的类型
        let pathAnalysisPanel = document.getElementById('path-analysis-panel');
