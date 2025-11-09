// script.js - ПОЛНЫЙ КОД С ПРАВИЛЬНЫМ ОСВЕЩЕНИЕМ

// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

// Форматы для каждого рендерера
const RENDERER_FORMATS = {
    MODEL_VIEWER: ['.glb', '.gltf', '.obj'],
    THREE_JS: ['.stl', '.fbx']
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
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        
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
    }

    initThreeJS() {
        console.log('Инициализация Three.js...');
        
        // Для превью - ПРОСТОЙ РЕНДЕРЕР БЕЗ ОСВЕЩЕНИЯ
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0); // Прозрачный фон
        
        // Простое освещение для превью
        const previewAmbient = new THREE.AmbientLight(0xffffff, 1.0);
        this.previewScene.add(previewAmbient);
        
        // Для основного просмотрщика - ПОЛНОЕ ОСВЕЩЕНИЕ
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ 
            canvas: this.mainThreejs,
            antialias: true,
            alpha: true
        });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        // Настройка тонального отображения для лучшей видимости
        this.mainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.mainRenderer.toneMappingExposure = 1.2;
        
        // Мощное освещение для основного просмотрщика
        this.setupMainLighting();
        
        // Камеры
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);

        console.log('Three.js инициализирован');
        this.animate();
    }

    setupMainLighting() {
        // Очищаем старое освещение
        while(this.mainScene.children.length > 0) { 
            if (this.mainScene.children[0].isLight) {
                this.mainScene.remove(this.mainScene.children[0]);
            } else {
                break;
            }
        }
        
        // 1. МОЩНЫЙ РАССЕЯННЫЙ СВЕТ
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        this.mainScene.add(ambientLight);
        
        // 2. ЯРКИЙ НАПРАВЛЕННЫЙ СВЕТ СПЕРЕДИ
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight1.position.set(10, 10, 10);
        this.mainScene.add(directionalLight1);
        
        // 3. ДОПОЛНИТЕЛЬНЫЙ СВЕТ СЗАДИ
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight2.position.set(-10, 5, -10);
        this.mainScene.add(directionalLight2);
        
        // 4. БОКОВОЙ СВЕТ
        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight3.position.set(0, -10, 0);
        this.mainScene.add(directionalLight3);
        
        console.log('💡 Мощное освещение установлено для основного просмотрщика');
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

        // ОЧИЩАЕМ ПРЕДЫДУЩИЕ ДАННЫЕ
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

        const validFormats = [...RENDERER_FORMATS.MODEL_VIEWER, ...RENDERER_FORMATS.THREE_JS];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert(`❌ Неподдерживаемый формат\nПоддерживаемые форматы: ${validFormats.join(', ')}`);
            return false;
        }

        return true;
    }

    async showPreview() {
        try {
            console.log('🔄 Показ превью...', {
                file: this.currentFile.name,
                type: this.currentFileType,
                renderer: this.currentRenderer
            });
            
            this.hidePreviewPlaceholder();
            this.open3dBtn.disabled = true;
            this.fileName.textContent = this.currentFile.name;

            // СКРЫВАЕМ ВСЕ РЕНДЕРЕРЫ
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
            
            // ОЧИЩАЕМ Three.js
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
            const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

            console.log('🎮 Загрузка Three.js превью...');

            loader.load(this.currentFileURL, (object) => {
                console.log('✅ Three.js превью загружено');
                
                this.clearThreeJSScene(this.previewScene);
                
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const geometry = object;
                    // ДЛЯ ПРЕВЬЮ - ПРОСТОЙ ЯРКИЙ МАТЕРИАЛ
                    const material = new THREE.MeshBasicMaterial({ 
                        color: 0x4a90e2,    // ЯРКИЙ СИНИЙ
                        transparent: true,
                        opacity: 0.9
                    });
                    modelObject = new THREE.Mesh(geometry, material);
                } else {
                    modelObject = object;
                    if (modelObject.traverse) {
                        modelObject.traverse((child) => {
                            if (child.isMesh) {
                                // ДЛЯ FBX В ПРЕВЬЮ ТОЖЕ ПРОСТОЙ МАТЕРИАЛ
                                child.material = new THREE.MeshBasicMaterial({
                                    color: 0x888888,
                                    transparent: true,
                                    opacity: 0.9
                                });
                            }
                        });
                    }
                }
                
                this.previewScene.add(modelObject);
                this.previewModelObject = modelObject;
                
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
                reject(new Error('Не удалось загрузить модель'));
            });
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 Размер модели для превью:', size);
        
        // Центрируем объект
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.previewCamera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        
        cameraDistance = Math.max(cameraDistance, 1);
        
        this.previewCamera.position.set(cameraDistance * 0.7, cameraDistance * 0.3, cameraDistance * 0.7);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 Размер модели для основного просмотра:', size);
        
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        let cameraDistance = maxDim * 1.5;
        cameraDistance = Math.max(cameraDistance, 0.5);
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
        
        // Рендер превью
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        // Рендер основного просмотрщика
        if (this.mainRenderer && this.mainScene && this.mainCamera) {
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
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
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

        console.log('🎯 Открытие просмотрщика...', {
            file: this.currentFile.name,
            type: this.currentFileType,
            renderer: this.currentRenderer
        });
        
        this.showLoadingIndicator();

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            // СКРЫВАЕМ ВСЕ РЕНДЕРЕРЫ
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
            
            // ОЧИЩАЕМ Three.js
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
            const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

            console.log('🎮 Открытие Three.js просмотрщика...');

            loader.load(this.currentFileURL, (object) => {
                console.log('✅ Three.js модель загружена');
                
                this.clearThreeJSScene(this.mainScene);
                
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const geometry = object;
                    // ДЛЯ ОСНОВНОГО ПРОСМОТРА - МАТЕРИАЛ С ОСВЕЩЕНИЕМ
                    const material = new THREE.MeshPhongMaterial({ 
                        color: 0x4a90e2,
                        shininess: 100,
                        specular: 0xffffff,
                        emissive: 0x000000
                    });
                    modelObject = new THREE.Mesh(geometry, material);
                } else {
                    modelObject = object;
                    if (modelObject.traverse) {
                        modelObject.traverse((child) => {
                            if (child.isMesh) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0x888888,
                                    roughness: 0.7,
                                    metalness: 0.2
                                });
                            }
                        });
                    }
                }
                
                this.mainScene.add(modelObject);
                this.mainModelObject = modelObject;
                
                this.setupMainCamera(modelObject);
                
                // Инициализация контролов
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
                console.error('❌ Ошибка загрузки Three.js:', error);
                reject(new Error('Не удалось загрузить модель'));
            });
        });
    }

    updateMainThreeJSSize() {
        if (this.mainRenderer && this.mainThreejs) {
            const container = this.mainThreejs.parentElement;
            if (container) {
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                console.log('📏 Размер контейнера:', width, 'x', height);
                
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
        
        if (this.currentRenderer === 'model-viewer') {
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
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.currentState = APP_STATES.MAIN;
        
        this.autoRotate = false;
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.autoRotate = false;
        }
    }

    resetPreview() {
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
    }

    showLoadingIndicator() {
        this.loadingIndicator.classList.add('active');
    }

    hideLoadingIndicator() {
        this.loadingIndicator.classList.remove('active');
        this.updateProgress(0);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
