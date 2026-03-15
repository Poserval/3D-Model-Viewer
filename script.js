// script.js - ИСПРАВЛЕННАЯ ВЕРСИЯ С РАБОЧИМ КОНВЕРТЕРОМ

// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

// Форматы для каждого рендерера
const RENDERER_FORMATS = {
    MODEL_VIEWER: ['.glb', '.gltf', '.obj'],
    THREE_JS: ['.stl']
};

class ModelViewerApp {
    constructor() {
        this.currentState = APP_STATES.MAIN;
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        this.MAX_FILE_SIZE = 200 * 1024 * 1024;
        
        this.autoRotate = true;
        this.currentFileURL = null;
        
        // Three.js переменные
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewModelObject = null;
        
        this.mainScene = null;
        this.mainCamera = null;
        this.mainRenderer = null;
        this.mainModelObject = null;
        this.mainControls = null;
        
        // ФЛАГИ ОСВЕЩЕНИЯ
        this.previewLightsInitialized = false;
        this.mainLightsInitialized = false;
        this.orbitingLight = null;
        
        // КОНВЕРТЕР
        this.stlExporter = null;
        this.gltfExporter = null;
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        this.initExporters();
        
        console.log('🚀 3D Model Viewer запущен');
    }

    initializeElements() {
        // Основные элементы
        this.mainScreen = document.getElementById('main-screen');
        this.viewerScreen = document.getElementById('viewer-screen');
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.open3dBtn = document.getElementById('open-3d-btn');
        this.backBtn = document.getElementById('back-btn');
        this.fileName = document.getElementById('file-name');
        this.viewerTitle = document.getElementById('viewer-title');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewArea = document.getElementById('preview-area');

        // Рендереры
        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        this.mainThreejs = document.getElementById('main-threejs');

        // Индикатор загрузки
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
        
        // ЭЛЕМЕНТЫ КОНВЕРТЕРА
        this.convertBtn = document.getElementById('convert-btn');
        this.converterPanel = document.getElementById('converter-panel');
        this.formatFrom = document.getElementById('format-from');
        this.formatTo = document.getElementById('format-to');
        this.startConvertBtn = document.getElementById('start-convert-btn');
        this.convertProgressContainer = document.getElementById('convert-progress-container');
        this.convertProgressBar = document.getElementById('convert-progress-bar');
        this.convertProgressText = document.getElementById('convert-progress-text');
        this.downloadLinkContainer = document.getElementById('download-link-container');
        this.downloadLink = document.getElementById('download-link');
    }

    bindEvents() {
        this.selectFileBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        this.open3dBtn.addEventListener('click', () => {
            this.openViewer();
        });

        this.backBtn.addEventListener('click', () => {
            this.showMainScreen();
        });

        this.autoRotateBtn.addEventListener('click', () => {
            this.toggleAutoRotate();
        });

        this.resetCameraBtn.addEventListener('click', () => {
            this.resetCamera();
        });

        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // СОБЫТИЯ КОНВЕРТЕРА
        this.convertBtn.addEventListener('click', () => {
            this.toggleConverterPanel();
        });
        
        this.startConvertBtn.addEventListener('click', () => {
            this.startConversion();
        });
    }

    initThreeJS() {
        console.log('Инициализация Three.js...');
        
        // Для превью
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        // Для основного просмотрщика
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ 
            canvas: this.mainThreejs,
            antialias: true,
            alpha: true
        });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        // Камеры
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);

        console.log('Three.js инициализирован');
        this.animate();
    }

    initExporters() {
        console.log('🔧 Инициализация экспортеров...');
        
        try {
            if (typeof THREE.STLExporter !== 'undefined') {
                this.stlExporter = new THREE.STLExporter();
                console.log('✅ STLExporter готов');
            } else {
                console.warn('⚠️ STLExporter не найден');
            }
            
            if (typeof THREE.GLTFExporter !== 'undefined') {
                this.gltfExporter = new THREE.GLTFExporter();
                console.log('✅ GLTFExporter готов');
            } else {
                console.warn('⚠️ GLTFExporter не найден');
            }
        } catch (e) {
            console.error('❌ Ошибка инициализации экспортеров:', e);
        }
    }

    setupPreviewLighting() {
        if (this.previewLightsInitialized) {
            return;
        }

        console.log('💡 Создаем освещение превью...');
        
        this.removeAllLights(this.previewScene);
        
        const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
        this.previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 3);
        this.previewScene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
        pointLight.position.set(0, 0, 8);
        this.previewScene.add(pointLight);
        
        this.previewLightsInitialized = true;
    }

    setupMainLighting() {
        if (this.mainLightsInitialized) {
            return;
        }

        console.log('💡 Создаем основное освещение...');
        
        this.removeAllLights(this.mainScene);
        
        const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        this.mainScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 10, 5);
        this.mainScene.add(directionalLight);
        
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.mainScene.add(this.orbitingLight);
        
        this.mainLightsInitialized = true;
    }

    removeAllLights(scene) {
        const lightsToRemove = [];
        scene.traverse((child) => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        
        lightsToRemove.forEach(light => {
            scene.remove(light);
            if (light.dispose) light.dispose();
        });
    }

    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) {
            return 'model-viewer';
        } else if (RENDERER_FORMATS.THREE_JS.includes(extension)) {
            return 'threejs';
        }
        return null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
        }

        this.resetPreview();

        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;
        this.currentFileType = '.' + file.name.split('.').pop().toLowerCase();
        this.currentRenderer = this.getRendererForFormat(this.currentFileType);
        
        if (!this.currentRenderer) {
            alert('❌ Неподдерживаемый формат файла');
            return;
        }

        this.currentFileURL = URL.createObjectURL(file);
        this.showPreview();
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`📁 Файл слишком большой\nРазмер: ${(file.size / (1024 * 1024)).toFixed(1)}MB\nМаксимальный размер: ${(this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`);
            return false;
        }

        const validFormats = ['.glb', '.gltf', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert(`❌ Неподдерживаемый формат\nПоддерживаемые форматы: ${validFormats.join(', ')}`);
            return false;
        }

        return true;
    }

    async showPreview() {
        try {
            console.log('🔄 Показ превью...');
            this.hidePreviewPlaceholder();
            this.open3dBtn.disabled = true;
            this.fileName.textContent = this.currentFile.name;

            this.hideAllRenderers();
            
            if (this.currentRenderer === 'model-viewer') {
                await this.loadModelViewerPreview();
            } else if (this.currentRenderer === 'threejs') {
                await this.loadThreeJSPreview();
            }

            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;

        } catch (error) {
            console.error('❌ Ошибка показа превью:', error);
            alert('❌ Ошибка при обработке файла:\n' + error.message);
            this.resetPreview();
        }
    }

    hidePreviewPlaceholder() {
        this.previewPlaceholder.style.display = 'none';
    }

    showPreviewPlaceholder() {
        this.previewPlaceholder.style.display = 'flex';
    }

    async loadModelViewerPreview() {
        return new Promise((resolve) => {
            console.log('📱 Загрузка Model Viewer превью...');
            
            this.clearThreeJSScene(this.previewScene);
            
            this.previewModel.src = this.currentFileURL;
            this.previewModel.hidden = false;
            this.hidePreviewPlaceholder();
            
            console.log('✅ Model Viewer превью настроен');
            
            setTimeout(() => {
                console.log('✅ Model Viewer превью загружено');
                resolve();
            }, 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();

            console.log('🎮 Загрузка Three.js превью...');

            loader.load(this.currentFileURL, (geometry) => {
                console.log('✅ Three.js превью загружено');
                
                this.clearThreeJSScene(this.previewScene);
                
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xCCCCCC,
                    roughness: 0.3,
                    metalness: 0.1
                });
                const modelObject = new THREE.Mesh(geometry, material);
                
                this.previewScene.add(modelObject);
                this.previewModelObject = modelObject;
                
                this.setupPreviewLighting();
                this.setupPreviewCamera(modelObject);
                
                this.previewThreejs.hidden = false;
                this.hidePreviewPlaceholder();
                
                console.log('✅ Three.js превью отображен');
                resolve();
            }, 
            (progress) => {
                if (progress.lengthComputable) {
                    this.updateProgress((progress.loaded / progress.total) * 100);
                }
            },
            (error) => {
                console.error('❌ Ошибка загрузки Three.js превью:', error);
                reject(new Error('Не удалось загрузить STL модель'));
            });
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.previewCamera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        
        cameraDistance = Math.max(cameraDistance, 1);
        
        this.previewCamera.position.set(0, 0, cameraDistance);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.mainCamera.fov * (Math.PI / 180);
        let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
        cameraDistance = Math.max(cameraDistance * 1.5, 1);
        cameraDistance = Math.min(cameraDistance, 10);
        
        this.mainCamera.position.set(0, 0, cameraDistance);
        this.mainCamera.lookAt(0, 0, 0);
        this.mainCamera.updateProjectionMatrix();
        
        if (this.mainControls) {
            this.mainControls.minDistance = cameraDistance * 0.5;
            this.mainControls.maxDistance = cameraDistance * 3;
            this.mainControls.reset();
        }
    }

    autoAlignModel(object, size) {
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (size.y === maxDim) {
            object.rotation.x = 0;
            object.rotation.y = 0;
            object.rotation.z = 0;
        } else if (size.z === maxDim) {
            object.rotation.x = -Math.PI / 2;
        } else if (size.x === maxDim) {
            object.rotation.z = -Math.PI / 2;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        if (this.mainRenderer && this.mainScene && this.mainCamera) {
            if (this.orbitingLight && this.autoRotate) {
                const time = Date.now() * 0.001;
                this.orbitingLight.position.x = Math.cos(time * 0.5) * 8;
                this.orbitingLight.position.z = Math.sin(time * 0.5) * 8;
                this.orbitingLight.position.y = 4 + Math.sin(time * 0.3) * 2;
            }
            
            if (this.autoRotate && this.mainModelObject && this.currentRenderer === 'threejs') {
                this.mainModelObject.rotation.y += 0.01;
            }
            
            this.mainRenderer.render(this.mainScene, this.mainCamera);
            
            if (this.mainControls) {
                this.mainControls.update();
            }
        }
    }

    clearThreeJSScene(scene) {
        if (scene) {
            const objectsToRemove = [];
            scene.traverse((child) => {
                if (child.isMesh) {
                    objectsToRemove.push(child);
                }
            });
            
            objectsToRemove.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
                scene.remove(obj);
            });
        }
    }

    hideAllRenderers() {
        console.log('🔄 Скрываем все рендереры');
        
        this.previewModel.hidden = true;
        this.previewThreejs.hidden = true;
        this.mainModel.hidden = true;
        this.mainThreejs.hidden = true;
    }

    updateProgress(percent) {
        if (this.progressFill) {
            this.progressFill.style.width = percent + '%';
        }
        if (this.progressText) {
            this.progressText.textContent = Math.round(percent) + '%';
        }
    }

    async openViewer() {
        if (!this.currentFile) return;

        console.log('🎯 Открытие просмотрщика...');
        this.showLoadingIndicator();

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            this.hideAllRenderers();

            if (this.currentRenderer === 'model-viewer') {
                await this.openModelViewer();
            } else if (this.currentRenderer === 'threejs') {
                await this.openThreeJSViewer();
            }

            this.hideLoadingIndicator();
            this.switchToViewer();

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('❌ Ошибка открытия просмотрщика:', error);
            alert('❌ Ошибка при открытии модели:\n' + error.message);
        }
    }

    async openModelViewer() {
        return new Promise((resolve) => {
            console.log('📱 Открытие Model Viewer...');
            
            this.clearThreeJSScene(this.mainScene);
            if (this.mainControls) {
                this.mainControls.dispose();
                this.mainControls = null;
            }
            
            this.mainModel.src = this.currentFileURL;
            this.mainModel.autoRotate = true;
            this.mainModel.hidden = false;
            
            console.log('✅ Model Viewer настроен для отображения');
            
            setTimeout(() => {
                console.log('✅ Model Viewer загружен');
                this.updateProgress(100);
                resolve();
            }, 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();

            console.log('🎮 Открытие Three.js просмотрщика...');

            loader.load(this.currentFileURL, (geometry) => {
                console.log('✅ Three.js модель загружена');
                
                this.clearThreeJSScene(this.mainScene);
                
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xCCCCCC,
                    roughness: 0.3,
                    metalness: 0.1
                });
                const modelObject = new THREE.Mesh(geometry, material);
                
                this.mainScene.add(modelObject);
                this.mainModelObject = modelObject;
                
                this.setupMainLighting();
                this.setupMainCamera(modelObject);
                
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.mainControls.dampingFactor = 0.05;
                
                this.autoRotate = true;
                
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                
                console.log('✅ Three.js настроен для отображения');
                
                this.updateProgress(100);
                resolve();
            }, 
            (progress) => {
                this.updateProgress((progress.loaded / progress.total) * 100);
            },
            (error) => {
                console.error('❌ Ошибка загрузки:', error);
                reject(new Error('Не удалось загрузить STL модель'));
            });
        });
    }

    updateMainThreeJSSize() {
        if (this.mainRenderer && this.mainThreejs) {
            const container = this.mainThreejs.parentElement;
            if (container) {
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                this.mainRenderer.setSize(width, height);
                this.mainCamera.aspect = width / height;
                this.mainCamera.updateProjectionMatrix();
                
                this.mainRenderer.render(this.mainScene, this.mainCamera);
            }
        }
    }

    handleResize() {
        this.updateMainThreeJSSize();
    }

    switchToViewer() {
        console.log('🔄 Переключение на экран просмотра');
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        setTimeout(() => {
            this.updateMainThreeJSSize();
        }, 100);
        
        this.updateAutoRotateButton();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        
        if (this.currentRenderer === 'model-viewer' && this.mainModel) {
            this.mainModel.autoRotate = this.autoRotate;
        }
        
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        const isActive = this.autoRotate;
        this.autoRotateBtn.setAttribute('data-active', isActive.toString());
        this.autoRotateBtn.innerHTML = isActive ? '⏸️ Автоповорот' : '▶️ Автоповорот';
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
        } else if (this.currentRenderer === 'threejs' && this.mainModelObject) {
            this.setupMainCamera(this.mainModelObject);
            if (this.mainControls) {
                this.mainControls.reset();
            }
            console.log('🎯 Камера сброшена');
        }
    }

    showMainScreen() {
        console.log('🔄 Возврат на главный экран');
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.currentState = APP_STATES.MAIN;
        
        this.resetPreview();
        
        this.autoRotate = false;
        if (this.mainModel) {
            this.mainModel.autoRotate = false;
        }
    }

    resetPreview() {
        console.log('🔄 Сброс превью');
        
        this.showPreviewPlaceholder();
        this.hideAllRenderers();
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        
        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
            this.currentFileURL = null;
        }
        
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        
        this.clearThreeJSScene(this.previewScene);
        this.clearThreeJSScene(this.mainScene);
        
        if (this.mainControls) {
            this.mainControls.dispose();
            this.mainControls = null;
        }
        
        // СКРЫВАЕМ ПАНЕЛЬ КОНВЕРТЕРА ПРИ СБРОСЕ
        if (this.converterPanel) {
            this.converterPanel.style.display = 'none';
        }
        
        console.log('✅ Превью сброшено');
    }

    showLoadingIndicator() {
        this.loadingIndicator.classList.add('active');
    }

    hideLoadingIndicator() {
        this.loadingIndicator.classList.remove('active');
        this.updateProgress(0);
    }
    
    // МЕТОДЫ КОНВЕРТЕРА
    
    toggleConverterPanel() {
        if (!this.converterPanel) return;
        
        const isHidden = this.converterPanel.style.display === 'none';
        this.converterPanel.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            this.convertProgressContainer.style.display = 'none';
            this.downloadLinkContainer.style.display = 'none';
        }
    }
    
    async startConversion() {
        if (!this.currentFile) {
            alert('❌ Сначала выберите файл на главном экране');
            return;
        }
        
        const fromFormat = this.formatFrom.value;
        const toFormat = this.formatTo.value;
        
        if (fromFormat === toFormat) {
            if (!confirm(`⚠️ Вы пытаетесь конвертировать ${fromFormat.toUpperCase()} в ${toFormat.toUpperCase()}.\n\nЭто не изменит файл. Просто скачать оригинал?`)) {
                return;
            }
            
            // Просто отдаем оригинальный файл
            const blob = new Blob([await this.currentFile.arrayBuffer()]);
            const baseName = this.currentFile.name.replace(`.${fromFormat}`, '').replace(`.${fromFormat.toUpperCase()}`, '');
            const fileName = `${baseName}.${toFormat}`;
            
            this.saveFile(blob, fileName);
            return;
        }
        
        this.showConvertProgress();
        
        try {
            await this.convertWithThreeJS(this.currentFile, fromFormat, toFormat);
        } catch (error) {
            console.error('❌ Ошибка конвертации:', error);
            alert('❌ Не удалось конвертировать файл: ' + error.message);
            this.convertProgressContainer.style.display = 'none';
        }
    }
    
    showConvertProgress() {
        this.convertProgressContainer.style.display = 'block';
        this.downloadLinkContainer.style.display = 'none';
        this.updateConvertProgress(0);
    }
    
    updateConvertProgress(percent) {
        if (this.convertProgressBar) {
            this.convertProgressBar.style.width = percent + '%';
        }
        if (this.convertProgressText) {
            this.convertProgressText.textContent = percent + '%';
        }
    }
    
    async convertWithThreeJS(file, fromFormat, toFormat) {
        return new Promise((resolve, reject) => {
            this.updateConvertProgress(10);
            
            console.log(`🔄 Начинаем конвертацию ${fromFormat} → ${toFormat}`);
            
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    this.updateConvertProgress(20);
                    console.log('📦 Файл загружен в память');
                    
                    let scene = new THREE.Scene();
                    
                    // ЗАГРУЗКА разных форматов
                    if (fromFormat === 'stl') {
                        console.log('📐 Парсим STL...');
                        const loader = new THREE.STLLoader();
                        const geometry = loader.parse(e.target.result);
                        const material = new THREE.MeshStandardMaterial();
                        const mesh = new THREE.Mesh(geometry, material);
                        scene.add(mesh);
                        
                    } else if (fromFormat === 'obj') {
                        console.log('📐 Парсим OBJ...');
                        const loader = new THREE.OBJLoader();
                        const result = loader.parse(e.target.result);
                        result.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial();
                            }
                        });
                        scene = result;
                        
                    } else if (fromFormat === 'glb' || fromFormat === 'gltf') {
                        console.log('📐 Парсим GLTF...');
                        const loader = new THREE.GLTFLoader();
                        const result = await new Promise((res, rej) => {
                            loader.parse(e.target.result, '', res, rej);
                        });
                        scene = result.scene;
                        
                    } else {
                        throw new Error(`Конвертация из ${fromFormat} пока не поддерживается`);
                    }
                    
                    console.log('✅ Модель загружена');
                    this.updateConvertProgress(50);
                    
                    // ЭКСПОРТ
                    console.log(`💾 Экспортируем в ${toFormat}...`);
                    
                    let output;
                    
                    if (toFormat === 'stl') {
                        if (!this.stlExporter) {
                            this.stlExporter = new THREE.STLExporter();
                        }
                        output = this.stlExporter.parse(scene, { binary: false });
                        
                        this.updateConvertProgress(80);
                        this.saveFile(output, file.name, fromFormat, toFormat);
                        this.updateConvertProgress(100);
                        resolve();
                        
                    } else if (toFormat === 'obj') {
                        output = this.exportToOBJ(scene);
                        
                        this.updateConvertProgress(80);
                        this.saveFile(output, file.name, fromFormat, toFormat);
                        this.updateConvertProgress(100);
                        resolve();
                        
                    } else if (toFormat === 'glb' || toFormat === 'gltf') {
                        if (!this.gltfExporter) {
                            this.gltfExporter = new THREE.GLTFExporter();
                        }
                        
                        this.gltfExporter.parse(scene, (gltfResult) => {
                            this.updateConvertProgress(80);
                            console.log('✅ GLTF экспорт готов');
                            
                            output = toFormat === 'glb' ? gltfResult : JSON.stringify(gltfResult, null, 2);
                            
                            this.saveFile(output, file.name, fromFormat, toFormat);
                            this.updateConvertProgress(100);
                            resolve();
                        }, { binary: toFormat === 'glb' });
                        return;
                        
                    } else {
                        throw new Error(`Конвертация в ${toFormat} пока не поддерживается`);
                    }
                    
                } catch (error) {
                    console.error('❌ Ошибка:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };
            
            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 30);
                    this.updateConvertProgress(10 + percent);
                }
            };
            
            console.log('📖 Читаем файл...');
            reader.readAsArrayBuffer(file);
        });
    }
    
    // УНИВЕРСАЛЬНЫЙ МЕТОД СОХРАНЕНИЯ
    saveFile(data, originalName, fromFormat, toFormat) {
        try {
            console.log('💾 Сохраняем файл...');
            
            // Создаем Blob
            let blob;
            if (typeof data === 'string') {
                blob = new Blob([data], { type: 'text/plain' });
            } else if (data instanceof Blob) {
                blob = data;
            } else {
                blob = new Blob([data]);
            }
            
            // Генерируем имя файла
            let fileName;
            if (typeof originalName === 'string' && fromFormat && toFormat) {
                const baseName = originalName
                    .replace(`.${fromFormat}`, '')
                    .replace(`.${fromFormat.toUpperCase()}`, '')
                    .replace(`.${fromFormat.toLowerCase()}`, '');
                fileName = `${baseName}.${toFormat}`;
            } else if (typeof originalName === 'string') {
                fileName = originalName;
            } else {
                fileName = 'converted_file';
            }
            
            console.log(`📄 Имя файла: ${fileName}`);
            console.log(`📦 Размер: ${blob.size} байт`);
            
            // ПРОСТОЙ СПОСОБ - открыть файл в новой вкладке
            const url = URL.createObjectURL(blob);
            
            // Показываем ссылку
            this.downloadLink.href = url;
            this.downloadLink.download = fileName;
            this.downloadLinkContainer.style.display = 'block';
            
            // При клике открываем в новой вкладке (на телефонах это часто срабатывает)
            this.downloadLink.onclick = (e) => {
                e.preventDefault();
                
                // Пробуем открыть в новой вкладке
                const newWindow = window.open(url, '_blank');
                
                // Если не получилось - пробуем скачать
                if (!newWindow) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => document.body.removeChild(link), 1000);
                }
                
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                return false;
            };
            
            // Кнопка для принудительного скачивания
            if (!document.getElementById('force-download-btn')) {
                const downloadButton = document.createElement('button');
                downloadButton.textContent = '📥 Скачать файл';
                downloadButton.className = 'btn primary';
                downloadButton.style.marginTop = '10px';
                downloadButton.id = 'force-download-btn';
                downloadButton.onclick = (e) => {
                    e.preventDefault();
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    setTimeout(() => {
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }, 1000);
                };
                this.downloadLinkContainer.appendChild(downloadButton);
            }
            
            console.log('✅ Файл готов к скачиванию');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            alert('Не удалось создать файл для скачивания');
        }
    }
    
    exportToOBJ(scene) {
        let output = '# Конвертировано из 3D Viewer\n';
        let vertices = [];
        let normals = [];
        let faces = [];
        let vertexOffset = 1;
        
        scene.traverse((child) => {
            if (child.isMesh) {
                const geometry = child.geometry;
                
                if (geometry.attributes.position) {
                    const pos = geometry.attributes.position.array;
                    for (let i = 0; i < pos.length; i += 3) {
                        vertices.push(`v ${pos[i].toFixed(6)} ${pos[i+1].toFixed(6)} ${pos[i+2].toFixed(6)}`);
                    }
                }
                
                if (geometry.attributes.normal) {
                    const norm = geometry.attributes.normal.array;
                    for (let i = 0; i < norm.length; i += 3) {
                        normals.push(`vn ${norm[i].toFixed(6)} ${norm[i+1].toFixed(6)} ${norm[i+2].toFixed(6)}`);
                    }
                }
                
                if (geometry.index) {
                    const indices = geometry.index.array;
                    for (let i = 0; i < indices.length; i += 3) {
                        const a = indices[i] + vertexOffset;
                        const b = indices[i+1] + vertexOffset;
                        const c = indices[i+2] + vertexOffset;
                        
                        if (normals.length > 0) {
                            faces.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
                        } else {
                            faces.push(`f ${a} ${b} ${c}`);
                        }
                    }
                }
                
                vertexOffset += geometry.attributes.position.count;
            }
        });
        
        output += vertices.join('\n') + '\n';
        output += normals.join('\n') + '\n';
        output += faces.join('\n');
        
        return output;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
