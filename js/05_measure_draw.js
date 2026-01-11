// --- 鼠标交互（优化：绘制时同步更新鼠标提示） ---
        map.on('pointermove', function(evt) {
            if (evt.dragging) {
                return;
            }
            
            const lonLat = ol.proj.toLonLat(evt.coordinate);
            document.getElementById('mouse-position').innerText = 
                `经度: ${lonLat[0].toFixed(4)}, 纬度: ${lonLat[1].toFixed(4)}`;
            
            // 更新鼠标样式（图查属性模式下）
            if (isFeatureQueryActive) {
                let cursor = 'default';
                
                if (featureQueryMode === 'single') {
                    const pixel = evt.pixel;
                    
                    map.forEachFeatureAtPixel(pixel, function(feature, layer) {
                        if (layer !== drawLayer && layer !== measureLayer && 
                            layer !== featureHighlightLayer && layer !== queryHighlightLayer &&
                            layer !== batchHighlightLayer) {
                            cursor = 'pointer';
                        }
                        return false;
                    });
                } else if (featureQueryMode === 'box') {
                    cursor = 'crosshair';
                }
                
                map.getTargetElement().style.cursor = cursor;
            } else {
                const hit = map.forEachFeatureAtPixel(evt.pixel, (f, l) => l);
                map.getTargetElement().style.cursor = hit ? 'pointer' : '';
            }

            // 测量提示逻辑（原有）
            if (activeMeasureTool && sketch) {
                const helpMsg = activeMeasureTool === 'distance' ? '点击添加点进行距离测量，双击结束' : '点击添加点进行面积测量，双击结束';
                helpTooltipElement.innerHTML = helpMsg;
                helpTooltip.setPosition(evt.coordinate);
            } else {
                helpTooltip.setPosition(undefined);
            }

            // ========== 绘制提示逻辑（跟随鼠标实时更新） ==========
            if (activeDrawTool && drawInteraction) {
                let drawMsg = '';
                // 根据绘制类型，显示差异化操作提示
                switch(activeDrawTool) {
                    case 'point': drawMsg = '✅ 单击地图任意位置，添加点要素'; break;
                    case 'line': drawMsg = '✅ 单击添加顶点，双击完成画线 | 🚫 ESC取消'; break;
                    case 'polygon': drawMsg = '✅ 单击添加顶点，双击闭合面 | 🚫 ESC取消'; break;
                    case 'circle': drawMsg = '✅ 拖拽调整圆半径，单击完成绘制 | 🚫 ESC取消'; break;
                }
                drawHelpTooltipElement.innerHTML = drawMsg;
                drawHelpTooltip.setPosition(evt.coordinate);
            } else {
                drawHelpTooltip.setPosition(undefined);
            }
        });

        // --- 测量功能（优化：清除测量时同步隐藏绘制提示） ---
        document.getElementById('measure-distance').addEventListener('click', function() {
            startMeasure('distance');
            updateMeasureButtonStates('distance');
            clearDraw();
            updateDrawButtonStates(null);
            deactivateFeatureQuery();
            deactivateAttributeQuery();
            deactivateBoxSelection();
            setOperationTip('📏 已激活【距离测量】功能，绘制功能已关闭', true);
        });

        document.getElementById('measure-area').addEventListener('click', function() {
            startMeasure('area');
            updateMeasureButtonStates('area');
            clearDraw();
            updateDrawButtonStates(null);
            deactivateFeatureQuery();
            deactivateAttributeQuery();
            deactivateBoxSelection();
            setOperationTip('🗺️ 已激活【面积测量】功能，绘制功能已关闭', true);
        });

        document.getElementById('clear-measure').addEventListener('click', function() {
            clearMeasure();
            updateMeasureButtonStates(null);
            setOperationTip('🗑️ 已清除所有测量结果', true);
        });

        document.getElementById('reset-map').addEventListener('click', function() {
            map.getView().animate({
                center: ol.proj.fromLonLat([116.4, 39.9]),
                zoom: 4,
                duration: 1000
            });
            clearMeasure();
            updateMeasureButtonStates(null);
            clearDraw();
            updateDrawButtonStates(null);
            deactivateFeatureQuery();
            deactivateAttributeQuery();
            deactivateBoxSelection();
            setOperationTip('🔄 地图已重置，所有绘制/测量内容已清除', true);
        });

        function startMeasure(type) {
            clearMeasure();
            activeMeasureTool = type;
            const drawType = type === 'distance' ? 'LineString' : 'Polygon';
            
            const draw = new ol.interaction.Draw({
                source: measureSource,
                type: drawType,
                style: new ol.style.Style({
                    fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.5)', lineDash: [10, 10], width: 2 }),
                    image: new ol.style.Circle({
                        radius: 5,
                        stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 0, 0.7)' }),
                        fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)' })
                    })
                })
            });
            
            map.addInteraction(draw);
            
            let listener;
            draw.on('drawstart', function(evt) {
                sketch = evt.feature;
                listener = sketch.getGeometry().on('change', function(evt) {
                    const geom = evt.target;
                    let output;
                    if (geom instanceof ol.geom.Polygon) {
                        const area = ol.sphere.getArea(geom);
                        output = area > 10000 ? (Math.round(area / 1000000 * 100) / 100) + ' 平方公里' : (Math.round(area * 100) / 100) + ' 平方米';
                        measureTooltipElement.innerHTML = output;
                        measureTooltip.setPosition(geom.getInteriorPoint().getCoordinates());
                    } else if (geom instanceof ol.geom.LineString) {
                        const length = ol.sphere.getLength(geom);
                        output = length > 1000 ? (Math.round(length / 1000 * 100) / 100) + ' 公里' : (Math.round(length * 100) / 100) + ' 米';
                        measureTooltipElement.innerHTML = output;
                        measureTooltip.setPosition(geom.getLastCoordinate());
                    }
                });
            }, this);
            
            draw.on('drawend', function() {
                measureTooltipElement.className = 'measure-tooltip measure-tooltip-static';
                measureTooltip.setOffset([0, -7]);
                ol.Observable.unByKey(listener);
                sketch = null;
                helpTooltipElement.innerHTML = '';
                helpTooltip.setPosition(undefined);
            }, this);
        }

        function clearMeasure() {
            if (activeMeasureTool) {
                map.getInteractions().forEach(interaction => {
                    if (interaction instanceof ol.interaction.Draw) {
                        map.removeInteraction(interaction);
                    }
                });
                activeMeasureTool = null;
            }
            measureSource.clear();
            if (measureTooltip) measureTooltip.setPosition(undefined);
            if (helpTooltip) {
                helpTooltipElement.innerHTML = '';
                helpTooltip.setPosition(undefined);
            }
            sketch = null;
        }

        function updateMeasureButtonStates(activeType) {
            document.getElementById('measure-distance').classList.remove('active');
            document.getElementById('measure-area').classList.remove('active');
            if (activeType === 'distance') {
                document.getElementById('measure-distance').classList.add('active');
            } else if (activeType === 'area') {
                document.getElementById('measure-area').classList.add('active');
            }
        }

        // ========== 核心优化：绘制功能 ==========
        function startDraw(type) {
            clearMeasure();
            updateMeasureButtonStates(null);
            deactivateFeatureQuery();
            deactivateAttributeQuery();
            deactivateBoxSelection();
            
            activeDrawTool = type;
            let drawType;
            let geometryFunction;
            
            switch(type) {
                case 'point': drawType = 'Point'; break;
                case 'line': drawType = 'LineString'; break;
                case 'polygon': drawType = 'Polygon'; break;
                case 'circle': 
                    drawType = 'Circle'; 
                    geometryFunction = ol.interaction.Draw.createRegularPolygon(100); 
                    break;
                default: return;
            }

            if(drawInteraction) {
                map.removeInteraction(drawInteraction);
            }

            drawInteraction = new ol.interaction.Draw({
                source: drawSource,
                type: drawType,
                geometryFunction: geometryFunction,
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

            map.addInteraction(drawInteraction);
            
            const typeName = {point:'点', line:'线', polygon:'面', circle:'圆'}[type];
            setOperationTip(`📍 已激活【绘制${typeName}】功能，可叠加绘制多个要素`, true);

            registerDrawEscHandlerOnce();

            drawInteraction.on('drawend', function(evt) {
                const feature = evt.feature;
                console.log(`绘制完成 | 类型: ${type} | 要素ID: ${feature.getId()}`);
                const total = drawSource.getFeatures().length;
                setOperationTip(`✅ 绘制成功！已添加${typeName}要素 | 当前共${total}个手绘要素`, true);
                drawHelpTooltip.setPosition(undefined);
            });

            
        }

        function clearDraw() {
            activeDrawTool = null;
            if (drawInteraction) {
                map.removeInteraction(drawInteraction);
                drawInteraction = null;
            }
            if (drawSource) {
                const hasFeature = drawSource.getFeatures().length > 0;
                drawSource.clear();
                if(hasFeature) setOperationTip('🧹 已清空所有手绘图形要素', true);
            }
            if(drawHelpTooltip) drawHelpTooltip.setPosition(undefined);
        }

        function updateDrawButtonStates(activeType) {
            document.getElementById('draw-point').classList.remove('active');
            document.getElementById('draw-line').classList.remove('active');
            document.getElementById('draw-polygon').classList.remove('active');
            document.getElementById('draw-circle').classList.remove('active');
            if (activeType) {
                document.getElementById(`draw-${activeType}`).classList.add('active');
            }
        }


        // ========== 绘制取消（ESC）全局监听（修复：避免重复绑定导致累积触发） ==========
        const __drawTypeNameMap = { point: '点', line: '线', polygon: '面', circle: '圆' };
        let __drawEscHandlerBound = false;
        function registerDrawEscHandlerOnce() {
            if (__drawEscHandlerBound) return;
            __drawEscHandlerBound = true;
            document.addEventListener('keydown', function(e) {
                if (e.key !== 'Escape') return;
                if (!activeDrawTool) return;

                // 取消当前绘制交互，但保留已绘制要素
                if (drawInteraction) {
                    map.removeInteraction(drawInteraction);
                    drawInteraction = null;
                }

                const typeName = __drawTypeNameMap[activeDrawTool] || '';
                activeDrawTool = null;
                updateDrawButtonStates(null);
                if (drawHelpTooltip) drawHelpTooltip.setPosition(undefined);

                setOperationTip(typeName ? `🚫 已取消【绘制${typeName}】操作，历史要素已保留` : '🚫 已取消绘制操作，历史要素已保留', true);
            });
        }
        // ========== 绘制按钮事件绑定 ==========
        document.getElementById('draw-point').addEventListener('click', function() {
            startDraw('point');
            updateDrawButtonStates('point');
        });

        document.getElementById('draw-line').addEventListener('click', function() {
            startDraw('line');
            updateDrawButtonStates('line');
        });

        document.getElementById('draw-polygon').addEventListener('click', function() {
            startDraw('polygon');
            updateDrawButtonStates('polygon');
        });

        document.getElementById('draw-circle').addEventListener('click', function() {
            startDraw('circle');
            updateDrawButtonStates('circle');
        });

        document.getElementById('clear-draw').addEventListener('click', function() {
            clearDraw();
            updateDrawButtonStates(null);
        });
