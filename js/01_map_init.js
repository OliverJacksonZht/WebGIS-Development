// --- 地图初始化 (天地图) ---
        function createBaseLayer(type) {
            let baseUrl, labelUrl, layerName, labelName;
            
            switch(type) {
                case 'vec': // 矢量底图
                    baseUrl = `https://t{0-7}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    labelUrl = `https://t{0-7}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    layerName = 'Tianditu Vector Base';
                    labelName = 'Tianditu Vector Label';
                    break;
                case 'img': // 影像底图
                    baseUrl = `https://t{0-7}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    labelUrl = `https://t{0-7}.tianditu.gov.cn/cia_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cia&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    layerName = 'Tianditu Image Base';
                    labelName = 'Tianditu Image Label';
                    break;
                case 'ter': // 地形底图
                    baseUrl = `https://t{0-7}.tianditu.gov.cn/ter_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ter&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    labelUrl = `https://t{0-7}.tianditu.gov.cn/cta_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cta&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`;
                    layerName = 'Tianditu Terrain Base';
                    labelName = 'Tianditu Terrain Label';
                    break;
            }
            
            return new ol.layer.Group({
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({ url: baseUrl }),
                        properties: { name: layerName }
                    }),
                    new ol.layer.Tile({
                        source: new ol.source.XYZ({ url: labelUrl }),
                        properties: { name: labelName }
                    })
                ]
            });
        }

        // 初始底图
        const baseLayerGroup = createBaseLayer('vec');

        // 创建地图实例
        const map = new ol.Map({
            target: 'map',
            layers: [baseLayerGroup], // 使用天地图组合层
            view: new ol.View({
                center: ol.proj.fromLonLat([116.4, 39.9]),
                zoom: 4
            })
        });
        window.map = map;
                // === 业务栅格图层组（Overlays）===
        // 确保全局唯一，避免重复 addLayer
        if (!window.webgisOverlayGroup) {
        window.webgisOverlayGroup = new ol.layer.Group({
            title: '业务图层(Overlays)',
            layers: []
        });
        window.webgisOverlayGroup.setZIndex?.(1000);
        map.addLayer(window.webgisOverlayGroup);
        }

        // 手动添加鹰眼图控件
        const overviewMapControl = new ol.control.OverviewMap({
            className: 'ol-overviewmap',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: `https://t{0-7}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituKey}`
                    })
                })
            ],
            collapsed: false, // 默认展开
            collapsible: true
        });
        map.addControl(overviewMapControl);

        // 初始化测量图层
        function initMeasureLayers() {
            measureSource = new ol.source.Vector();
            measureLayer = new ol.layer.Vector({
                source: measureSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#ffcc33',
                        width: 2
                    }),
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: new ol.style.Fill({
                            color: '#ffcc33'
                        })
                    })
                })
            });
            map.addLayer(measureLayer);
        }

        // ========== 初始化绘制图层 ==========
        function initDrawLayers() {
            drawSource = new ol.source.Vector();
            drawLayer = new ol.layer.Vector({
                source: drawSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({ color: 'rgba(80, 130, 200, 0.2)' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(80, 130, 200, 1)', width: 2 }),
                    image: new ol.style.Circle({
                        radius: 6,
                        fill: new ol.style.Fill({ color: 'rgba(80, 130, 200, 1)' }),
                        stroke: new ol.style.Stroke({ color: 'white', width: 1 })
                    })
                })
            });
            map.addLayer(drawLayer);
        }

        // ========== 初始化图查属性高亮图层 ==========
        function initFeatureHighlightLayer() {
            featureHighlightSource = new ol.source.Vector();
            featureHighlightLayer = new ol.layer.Vector({
                source: featureHighlightSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(33, 150, 243, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#2196F3',
                        width: 3
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: '#2196F3'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 2
                        })
                    })
                }),
                properties: { name: 'FeatureHighlightLayer' },
                className: 'highlight-layer'
            });
            map.addLayer(featureHighlightLayer);
        }

        // ========== 初始化框选查询高亮图层 ==========
        function initBatchHighlightLayer() {
            batchHighlightSource = new ol.source.Vector();
            batchHighlightLayer = new ol.layer.Vector({
                source: batchHighlightSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 193, 7, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#FFC107',
                        width: 3
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: '#FFC107'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 2
                        })
                    })
                }),
                properties: { name: 'BatchHighlightLayer' },
                className: 'highlight-layer'
            });
            map.addLayer(batchHighlightLayer);
        }

        // ========== 初始化属性查图高亮图层 ==========
        function initQueryHighlightLayer() {
            queryHighlightSource = new ol.source.Vector();
            queryHighlightLayer = new ol.layer.Vector({
                source: queryHighlightSource,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 87, 34, 0.2)'
                    }),
                    stroke: new ol.style.Stroke({
                        color: '#FF5722',
                        width: 3
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({
                            color: '#FF5722'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'white',
                            width: 2
                        })
                    })
                }),
                properties: { name: 'QueryHighlightLayer' },
                className: 'highlight-layer'
            });
            map.addLayer(queryHighlightLayer);
        }

        // 地图初始化时创建一个专门用于显示路线的矢量图层
        function initPathLayer() {
            pathSource = new ol.source.Vector();
            pathLayer = new ol.layer.Vector({
                source: pathSource,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#3388ff', // 路径颜色
                        width: 6
                    }),
                    image: new ol.style.Circle({
                        radius: 7,
                        fill: new ol.style.Fill({ color: '#ff5500' }),
                        stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
                    })
                }),
                zIndex: 2000 // 确保在最上层
            });
            map.addLayer(pathLayer);
        }
        initPathLayer(); // 立即执行初始化

        // 初始化测量工具提示
        function initMeasureTooltips() {
            // 帮助提示
            helpTooltipElement = document.createElement('div');
            helpTooltipElement.className = 'measure-tooltip';
            helpTooltip = new ol.Overlay({
                element: helpTooltipElement,
                offset: [15, 0],
                positioning: 'center-left'
            });
            map.addOverlay(helpTooltip);

            // 测量结果提示
            measureTooltipElement = document.createElement('div');
            measureTooltipElement.className = 'measure-tooltip measure-tooltip-static';
            measureTooltip = new ol.Overlay({
                element: measureTooltipElement,
                offset: [0, -15],
                positioning: 'bottom-center'
            });
            map.addOverlay(measureTooltip);
        }

        // ========== 初始化绘制提示工具 ==========
        function initDrawTooltips() {
            // 绘制鼠标跟随提示容器
            drawHelpTooltipElement = document.createElement('div');
            drawHelpTooltipElement.className = 'draw-tooltip';
            drawHelpTooltip = new ol.Overlay({
                element: drawHelpTooltipElement,
                offset: [15, 0],
                positioning: 'center-left'
            });
            map.addOverlay(drawHelpTooltip);
        }

        // ========== 全局提示控制函数 ==========
        /**
         * 设置全局操作提示
         * @param {string} text 提示文本
         * @param {boolean} show 是否显示
         */
        function setOperationTip(text, show = true) {
            operationTip.innerHTML = text;
            operationTip.style.display = show ? 'block' : 'none';
            // 3秒后自动隐藏（静态提示）
            if(show) {
                setTimeout(() => {
                    if(operationTip.innerHTML === text) operationTip.style.display = 'none';
                }, 3000);
            }
        }

        // 初始化测量、绘制、提示功能
        initMeasureLayers();
        initMeasureTooltips();
        initDrawLayers();
        initDrawTooltips(); // 初始化绘制提示
        initFeatureHighlightLayer(); // 初始化图查属性高亮图层
        initBatchHighlightLayer(); // 初始化框选查询高亮图层
        initQueryHighlightLayer(); // 初始化属性查图高亮图层
        
        function initBufferLayer() {
    // 【修复】显式使用 window.state，并添加防御性检查
        window.state = window.state || {};
        
        window.state.bufferSource = new ol.source.Vector();
        window.state.bufferLayer = new ol.layer.Vector({
            source: window.state.bufferSource,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(0, 153, 255, 0.5)' // 蓝色半透明填充
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgba(0, 102, 204, 0.8)', // 深蓝边框
                    width: 2
                })
            }),
            zIndex: 9999, // 【关键】设置极高的层级，防止被底图或业务图层遮挡
            properties: { name: 'BufferResultLayer' }
        });
        
        map.addLayer(window.state.bufferLayer);
    }

    // 确保调用它
    initBufferLayer();