console.log("系统启动...");

// 确保全局状态对象存在
window.state = window.state || {};

// 初始化缓冲区分析相关状态
// 【修复】必须显式使用 window.state，否则在某些浏览器环境中会报错
window.state.bufferSource = null;
window.state.bufferLayer = null;

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
        color: '#e34d7f', 
        borderColor: '#ffffff',
        opacity: 0.9
    },
    {
        id: 'custom_layer_3',
        name: '深州市肯德基',
        layerName: 'wrok1:深州市肯德基',
        visible: true,
        color: '#fc0000', 
        borderColor: '#ffffff',
        opacity: 0.9
    },
    {
        id: 'custom_layer_4',
        name: '深州市金拱门',
        layerName: 'wrok1:深州市金拱门',
        visible: true,
        color: '#f4f74a', 
        borderColor: '#ffffff',
        opacity: 0.9
    },
    {
        id: 'custom_layer_5',
        name: '江津县道',
        layerName: 'wrok1:江津县道',
        visible: true,
        color: '#42f745', 
        borderColor: '#ffffff',
        opacity: 0.9
    },
    {
        id: 'custom_layer_6',
        name: '江津湖泊',
        layerName: 'wrok1:江津湖泊',
        visible: true,
        color: '#6de3f5', 
        borderColor: '#ffffff',
        opacity: 0.9
    }
];

// 全局变量定义
const vectorLayers = {};
let measureSource, measureLayer;
let sketch, helpTooltipElement, helpTooltip, measureTooltipElement, measureTooltip;
let activeMeasureTool = null;

// 绘制相关
let drawSource, drawLayer;
let activeDrawTool = null;
let drawInteraction = null;
let drawHelpTooltipElement, drawHelpTooltip;

// DOM 元素引用
const operationTip = document.getElementById('operation-tip');

// 图查属性相关
let featureInfoPopup = document.getElementById('feature-info-popup');
let featureInfoContent = document.getElementById('feature-info-content');
let featureQueryToggleBtn = document.getElementById('feature-query-toggle');
let featureHighlightSource, featureHighlightLayer;
let isFeatureQueryActive = false;
let featureQueryMode = 'single';

// 框选查询相关
let batchResultsPanel = document.getElementById('feature-batch-results-panel');
let batchResultsContainer = document.getElementById('batch-results-container');
let batchTotalCount = document.getElementById('batch-total-count');
let batchLayerCount = document.getElementById('batch-layer-count');
let batchClearHighlightBtn = document.getElementById('batch-clear-highlight');
let batchZoomToAllBtn = document.getElementById('batch-zoom-to-all');
let selectionBox = null;
let dragBoxInteraction = null;
let batchHighlightSource, batchHighlightLayer;
let selectedFeatures = [];

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
let layerAttributes = {};

// 路径分析相关
let isPathAnalysisActive = false;
let pathPoints = {
    start: null,
    end: null,
    waypoints: [],
    barriers: []
};
let pathSource, pathLayer;
let currentPathType = 'start';
let pathAnalysisPanel = document.getElementById('path-analysis-panel');

// 缓冲区分析相关
let bufferAnalysisPanel = document.getElementById('buffer-analysis-panel');
let bufferDistanceInput = document.getElementById('buffer-distance');
let executeBufferBtn = document.getElementById('execute-buffer-analysis');
let clearBufferBtn = document.getElementById('clear-buffer-analysis');
let bufferAnalysisToggleBtn = document.getElementById('buffer-analysis-toggle');