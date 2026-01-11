/**
 * 11_path_analysis.js
 * 优化版：按固定距离绘制方向箭头，避免箭头堆叠
 */
(function () {
    const toggleBtn = document.getElementById('path-analysis-toggle');
    const panel = document.getElementById('path-analysis-panel');
    const typeBtns = document.querySelectorAll('#path-point-type-selector .layer-selector-btn');
    
    // --- 1. 样式定义：按距离均匀分布箭头 ---
    
    const routeStyle = function(feature) {
        const geometry = feature.getGeometry();
        const styles = [
            new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#1a73e8', width: 6 })
            })
        ];

        // 获取路径总长度（EPSG:3857下单位为米）
        const length = geometry.getLength();
        const arrowInterval = 1500; // 设置箭头间距：每1500米绘制一个
        const arrowCount = Math.floor(length / arrowInterval);

        for (let i = 1; i <= arrowCount; i++) {
            // 计算当前箭头在全线中的百分比位置
            const fraction = (i * arrowInterval) / length;
            const coordinate = geometry.getCoordinateAt(fraction);
            
            // 为了获取准确的旋转角度，取该点前后极小一段距离的切线
            const aheadFraction = Math.min(fraction + 0.001, 1);
            const aheadCoordinate = geometry.getCoordinateAt(aheadFraction);
            
            const dx = aheadCoordinate[0] - coordinate[0];
            const dy = aheadCoordinate[1] - coordinate[1];
            const rotation = Math.atan2(dy, dx);

            styles.push(new ol.style.Style({
                geometry: new ol.geom.Point(coordinate),
                image: new ol.style.RegularShape({
                    fill: new ol.style.Fill({ color: '#fff' }),
                    points: 3,
                    radius: 3,
                    rotation: -rotation + Math.PI / 2, // 旋转箭头
                    angle: 0
                })
            }));
        }
        return styles;
    };

    // 标记点样式（带序号文字）
    function createMarkerStyle(label, color) {
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 11,
                fill: new ol.style.Fill({ color: color }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
            }),
            text: new ol.style.Text({
                text: label,
                fill: new ol.style.Fill({ color: '#fff' }),
                font: 'bold 12px sans-serif',
                textAlign: 'center'
            })
        });
    }

    // --- 2. 初始化与交互逻辑 ---

    const pathSource = new ol.source.Vector();
    const pathLayer = new ol.layer.Vector({
        source: pathSource,
        style: routeStyle, 
        zIndex: 2000
    });
    window.map.addLayer(pathLayer);

    // 按钮与面板控制
    toggleBtn.addEventListener('click', function () {
        const active = panel.classList.toggle('active');
        this.classList.toggle('active', active);
        if (active) setOperationTip('🚀 路径分析：设置【起点】后点击地图', true);
        else clearAll();
    });

    // 点类型切换
    typeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            typeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            window.currentPathType = this.dataset.type;
        });
    });

    // 地图选点
    map.on('click', function (evt) {
        if (!panel.classList.contains('active')) return;
        
        const type = window.currentPathType || 'start';
        const coords = ol.proj.toLonLat(evt.coordinate);
        
        

        let label = '', color = '#4caf50';
        if (type === 'start') { pathPoints.start = coords; label = '起'; }
        else if (type === 'end') { pathPoints.end = coords; label = '终'; color = '#f44336'; }
        else if (type === 'waypoint') { 
            pathPoints.waypoints.push(coords); 
            label = pathPoints.waypoints.length.toString(); 
            color = '#2196f3';
        }
        else if (type === 'barrier') {
            pathPoints.barriers.push(coords);
            label = '×'; color = '#000';
            setOperationTip('🚫 障碍点已标记', true);
        }

        const feat = new ol.Feature({ geometry: new ol.geom.Point(evt.coordinate) });
        feat.setStyle(createMarkerStyle(label, color));
        pathSource.addFeature(feat);
    });

    // 计算路径
    document.getElementById('execute-path-calc').addEventListener('click', async function() {
        if (!pathPoints.start || !pathPoints.end) {
            setOperationTip('❌ 缺少起点或终点', true);
            return;
        }

        let points = [`${pathPoints.start[0]},${pathPoints.start[1]}`];
        pathPoints.waypoints.forEach(p => points.push(`${p[0]},${p[1]}`));
        points.push(`${pathPoints.end[0]},${pathPoints.end[1]}`);

        const url = `https://router.project-osrm.org/route/v1/driving/${points.join(';')}?overview=full&geometries=geojson`;

        try {
            setOperationTip('🔄 正在请求路径...', true);
            const resp = await fetch(url);
            const data = await resp.json();

            if (data.code === 'Ok') {
                const route = data.routes[0];
                const feature = new ol.Feature({
                    geometry: new ol.format.GeoJSON().readGeometry(route.geometry, {
                        dataProjection: 'EPSG:4326',
                        featureProjection: 'EPSG:3857'
                    })
                });
                pathSource.addFeature(feature);

                document.getElementById('path-results-section').style.display = 'block';
                document.getElementById('path-distance').innerText = (route.distance / 1000).toFixed(2);
                document.getElementById('path-duration').innerText = Math.ceil(route.duration / 60);
                setOperationTip('✅ 规划成功', true);
            }
        } catch (e) {
            setOperationTip('❌ API 请求失败', true);
        }
    });

    function clearAll() {
        pathSource.clear();
        pathPoints = { start: null, end: null, waypoints: [], barriers: [] };
        document.getElementById('path-results-section').style.display = 'none';
    }

    document.getElementById('clear-path-analysis').addEventListener('click', clearAll);
    document.getElementById('close-path-panel').addEventListener('click', () => {
        panel.classList.remove('active');
        toggleBtn.classList.remove('active');
    });

})();