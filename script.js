<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>3D Model Viewer</title>
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        /* Главный экран */
        #mainScreen {
            padding: 40px 20px;
            text-align: center;
        }

        .logo {
            font-size: 3em;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 1.2em;
            margin-bottom: 40px;
        }

        .upload-area {
            border: 3px dashed #667eea;
            border-radius: 15px;
            padding: 60px 20px;
            margin: 0 auto 30px;
            max-width: 500px;
            background: rgba(102, 126, 234, 0.05);
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .upload-area:hover {
            background: rgba(102, 126, 234, 0.1);
            border-color: #764ba2;
        }

        .upload-icon {
            font-size: 4em;
            color: #667eea;
            margin-bottom: 20px;
        }

        .file-input {
            display: none;
        }

        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .preview-container {
            margin: 30px auto;
            max-width: 300px;
        }

        .preview-title {
            margin-bottom: 15px;
            color: #333;
        }

        #modelPreview {
            width: 200px;
            height: 200px;
            border: 2px solid #ddd;
            border-radius: 10px;
            margin: 0 auto;
            background: #f8f9fa;
        }

        .file-name {
            margin-top: 15px;
            color: #666;
            font-style: italic;
        }

        /* Экран просмотра */
        #viewerScreen {
            display: none;
            flex-direction: column;
            height: 80vh;
        }

        .viewer-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .viewer-content {
            flex: 1;
            position: relative;
            background: #000;
        }

        #modelContainer {
            width: 100%;
            height: 100%;
        }

        #threejsContainer {
            width: 100%;
            height: 100%;
            display: none;
        }

        .controls-panel {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.9);
            padding: 15px 25px;
            border-radius: 50px;
            display: flex;
            gap: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }

        .control-btn {
            background: none;
            border: none;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9em;
        }

        .control-btn:hover {
            background: rgba(102, 126, 234, 0.1);
        }

        .control-btn.active {
            background: #667eea;
            color: white;
        }

        /* Индикатор загрузки */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .loading-content {
            background: white;
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            max-width: 400px;
            width: 90%;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            margin: 20px 0;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            width: 0%;
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Главный экран -->
        <div id="mainScreen">
            <div class="logo">3D Viewer</div>
            <div class="subtitle">Просмотр 3D моделей в браузере</div>
            
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">📁</div>
                <div style="margin-bottom: 20px; font-size: 1.2em; color: #333;">
                    Перетащите файл сюда или нажмите для выбора
                </div>
                <button class="btn" onclick="document.getElementById('fileInput').click()">
                    Выбрать файл
                </button>
                <input type="file" id="fileInput" class="file-input" accept=".glb,.gltf,.obj,.stl,.fbx">
            </div>

            <div class="preview-container">
                <div class="preview-title">Превью модели:</div>
                <model-viewer 
                    id="modelPreview" 
                    camera-controls 
                    auto-rotate 
                    shadow-intensity="1"
                    environment-image="neutral"
                    style="width: 200px; height: 200px; display: none;">
                </model-viewer>
                <div id="threejsPreview" style="width: 200px; height: 200px; display: none; background: #f8f9fa; border-radius: 10px;"></div>
                <div id="fileName" class="file-name"></div>
            </div>

            <button class="btn" id="open3dBtn" disabled onclick="open3DViewer()">
                Открыть в 3D
            </button>
        </div>

        <!-- Экран просмотра -->
        <div id="viewerScreen">
            <div class="viewer-header">
                <button class="btn" onclick="backToMain()">← Назад</button>
                <div id="viewerTitle" style="font-size: 1.2em;"></div>
                <div style="width: 100px;"></div>
            </div>
            
            <div class="viewer-content">
                <model-viewer 
                    id="modelContainer" 
                    camera-controls 
                    auto-rotate 
                    shadow-intensity="1"
                    environment-image="neutral"
                    style="width: 100%; height: 100%;">
                </model-viewer>
                <div id="threejsContainer"></div>
                
                <div class="controls-panel">
                    <button class="control-btn" id="autoRotateBtn" onclick="toggleAutoRotate()">
                        Автоповорот: ВКЛ
                    </button>
                    <button class="control-btn" onclick="resetCamera()">
                        Сброс камеры
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Индикатор загрузки -->
    <div class="loading-overlay" id="loadingOverlay">
        <div class="loading-content">
            <div style="font-size: 1.5em; margin-bottom: 20px;">Загрузка модели...</div>
            <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <div id="loadingText">Подготовка...</div>
        </div>
    </div>

    <script>
        // Глобальные переменные
        let currentRenderer = null;
        let currentModel = null;
        let currentFileName = '';
        let isAutoRotate = true;

        // Three.js переменные
        let scene, camera, renderer, controls, orbitingLight;

        // Инициализация при загрузке
        document.addEventListener('DOMContentLoaded', function() {
            initializeEventListeners();
        });

        function initializeEventListeners() {
            const fileInput = document.getElementById('fileInput');
            const uploadArea = document.getElementById('uploadArea');

            fileInput.addEventListener('change', handleFileSelect);

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.background = 'rgba(102, 126, 234, 0.15)';
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.background = 'rgba(102, 126, 234, 0.05)';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.background = 'rgba(102, 126, 234, 0.05)';
                if (e.dataTransfer.files.length) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        function handleFileSelect(event) {
            if (event.target.files.length) {
                handleFile(event.target.files[0]);
            }
        }

        function handleFile(file) {
            if (!file) return;

            const fileName = file.name;
            const fileExt = fileName.split('.').pop().toLowerCase();
            currentFileName = fileName;

            document.getElementById('fileName').textContent = fileName;
            document.getElementById('open3dBtn').disabled = false;

            if (['glb', 'gltf', 'obj'].includes(fileExt)) {
                currentRenderer = 'model-viewer';
                showModelViewerPreview(file);
            } else if (['stl', 'fbx'].includes(fileExt)) {
                currentRenderer = 'threejs';
                showThreeJSPreview(file);
            } else {
                alert('Неподдерживаемый формат файла');
                return;
            }
        }

        function showModelViewerPreview(file) {
            const preview = document.getElementById('modelPreview');
            const threePreview = document.getElementById('threejsPreview');
            
            threePreview.style.display = 'none';
            preview.style.display = 'block';
            
            const url = URL.createObjectURL(file);
            preview.src = url;
        }

        function showThreeJSPreview(file) {
            const preview = document.getElementById('modelPreview');
            const threePreview = document.getElementById('threejsPreview');
            
            preview.style.display = 'none';
            threePreview.style.display = 'block';
            
            // Очищаем предыдущее превью
            while (threePreview.firstChild) {
                threePreview.removeChild(threePreview.firstChild);
            }

            initThreeJSPreview(threePreview, file);
        }

        function initThreeJSPreview(container, file) {
            // Просто показываем placeholder для превью
            const placeholder = document.createElement('div');
            placeholder.style.width = '100%';
            placeholder.style.height = '100%';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.color = '#666';
            placeholder.style.fontSize = '14px';
            placeholder.innerHTML = '3D превью<br>' + file.name;
            container.appendChild(placeholder);
        }

        function open3DViewer() {
            showLoading('Загрузка 3D просмотрщика...');
            
            setTimeout(() => {
                document.getElementById('mainScreen').style.display = 'none';
                document.getElementById('viewerScreen').style.display = 'flex';
                document.getElementById('viewerTitle').textContent = currentFileName;

                if (currentRenderer === 'model-viewer') {
                    openModelViewer();
                } else {
                    openThreeJSViewer();
                }
                
                hideLoading();
            }, 500);
        }

        function openModelViewer() {
            const modelContainer = document.getElementById('modelContainer');
            const threeContainer = document.getElementById('threejsContainer');
            
            threeContainer.style.display = 'none';
            modelContainer.style.display = 'block';
            
            const fileInput = document.getElementById('fileInput');
            if (fileInput.files.length) {
                const url = URL.createObjectURL(fileInput.files[0]);
                modelContainer.src = url;
            }
        }

        function openThreeJSViewer() {
            const modelContainer = document.getElementById('modelContainer');
            const threeContainer = document.getElementById('threejsContainer');
            
            modelContainer.style.display = 'none';
            threeContainer.style.display = 'block';
            
            initThreeJSViewer();
            loadThreeJSModel();
        }

        function initThreeJSViewer() {
            const container = document.getElementById('threejsContainer');
            
            // Очищаем контейнер
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }

            // Сцена
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x111111);

            // Камера
            camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            camera.position.z = 5;

            // Рендерер
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(container.clientWidth, container.clientHeight);
            renderer.shadowMap.enabled = true;
            container.appendChild(renderer.domElement);

            // Controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;

            // Создаем освещение ТОЛЬКО ОДИН РАЗ - это ключевое исправление!
            createLightingSystem();

            // Ресайз
            window.addEventListener('resize', onWindowResize);

            // Анимация
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                
                if (orbitingLight && isAutoRotate) {
                    const time = Date.now() * 0.001;
                    orbitingLight.position.x = Math.cos(time * 0.5) * 8;
                    orbitingLight.position.z = Math.sin(time * 0.5) * 8;
                    orbitingLight.position.y = 4 + Math.sin(time * 0.3) * 2;
                }
                
                renderer.render(scene, camera);
            }
            animate();
        }

        function createLightingSystem() {
            // Удаляем старое освещение если было
            if (orbitingLight) scene.remove(orbitingLight);
            
            // 1. Движущийся свет
            orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
            orbitingLight.position.set(8, 4, 0);
            scene.add(orbitingLight);

            // 2. Окружающее освещение
            const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
            scene.add(ambientLight);

            // 3. Направленный свет
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
            directionalLight.position.set(10, 10, 5);
            scene.add(directionalLight);

            console.log('Освещение создано один раз');
        }

        function loadThreeJSModel() {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files.length) return;

            const file = fileInput.files[0];
            const url = URL.createObjectURL(file);
            const fileExt = file.name.split('.').pop().toLowerCase();

            showLoading('Загрузка модели...');

            if (fileExt === 'stl') {
                loadSTLModel(url);
            } else if (fileExt === 'fbx') {
                loadFBXModel(url);
            }
        }

        function loadSTLModel(url) {
            const loader = new THREE.STLLoader();
            loader.load(url, (geometry) => {
                // Удаляем старую модель
                if (currentModel) {
                    scene.remove(currentModel);
                }
                
                const material = new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    roughness: 0.7,
                    metalness: 0.2
                });
                
                currentModel = new THREE.Mesh(geometry, material);
                currentModel.castShadow = true;
                currentModel.receiveShadow = true;
                
                scene.add(currentModel);
                centerModel(currentModel);
                hideLoading();
            });
        }

        function loadFBXModel(url) {
            const loader = new THREE.FBXLoader();
            loader.load(url, (object) => {
                // Удаляем старую модель
                if (currentModel) {
                    scene.remove(currentModel);
                }
                
                currentModel = object;
                object.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                scene.add(currentModel);
                centerModel(currentModel);
                hideLoading();
            });
        }

        function centerModel(model) {
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());
            const size = bbox.getSize(new THREE.Vector3());

            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));

            camera.position.z = cameraZ * 1.5;
            camera.near = cameraZ / 100;
            camera.far = cameraZ * 100;
            camera.updateProjectionMatrix();

            controls.reset();
        }

        function resetCamera() {
            if (currentRenderer === 'model-viewer') {
                const modelViewer = document.getElementById('modelContainer');
                modelViewer.cameraOrbit = '0deg 75deg 105%';
                modelViewer.cameraTarget = '0m 0m 0m';
            } else if (currentRenderer === 'threejs' && controls) {
                controls.reset();
                // Освещение НЕ пересоздается - баг исправлен!
            }
        }

        function toggleAutoRotate() {
            isAutoRotate = !isAutoRotate;
            const btn = document.getElementById('autoRotateBtn');
            
            if (currentRenderer === 'model-viewer') {
                const modelViewer = document.getElementById('modelContainer');
                modelViewer.autoRotate = isAutoRotate;
            }
            
            btn.textContent = `Автоповорот: ${isAutoRotate ? 'ВКЛ' : 'ВЫКЛ'}`;
        }

        function backToMain() {
            document.getElementById('viewerScreen').style.display = 'none';
            document.getElementById('mainScreen').style.display = 'block';
        }

        function onWindowResize() {
            if (camera && renderer) {
                const container = document.getElementById('threejsContainer');
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        }

        function showLoading(text) {
            document.getElementById('loadingText').textContent = text;
            document.getElementById('loadingOverlay').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    </script>
</body>
</html>
