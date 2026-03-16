// script.js - ТРИ СТРАНИЦЫ + ВЕБ-КОНВЕРТЕР В IFRAME

// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    VIEWER: 'viewer',
    CONVERTER: 'converter'
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
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        
        console.log('🚀 3D Model Viewer запущен');
    }

    initializeElements() {
        // Главный экран
        this.mainScreen = document.getElementById('main-screen');
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.open3dBtn = document.getElementById('open-3d-btn');
        this.fileName = document.getElementById('file-name');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewArea = document.getElementById('preview-area');
        this.previewModel = document.getElementById('preview-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        
        // Экран просмотра
        this.viewerScreen = document.getElementById('viewer-screen');
        this.backFromViewerBtn = document.getElementById('back-from-viewer-btn');
        this.viewerTitle = document.getElementById('viewer-title');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
        this.mainModel = document.getElementById('main-model');
        this.mainThreejs = document.getElementById('main-threejs');
        
        // Экран конвертера
        this.converterScreen = document.getElementById('converter-screen');
        this.backFromConverterBtn = document.getElementById('back-from-converter-btn');
        this.converterWebView = document.getElementById('converter-web-view');
        
        // Кнопка перехода в конвертер
        this.goToConverterBtn = document.getElementById('go-to-converter-btn');

        // Индикатор загрузки
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
    }

    bindEvents() {
        // Главный экран
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.open3dBtn.addEventListener('click', () => this.openViewer());
        this.goToConverterBtn.addEventListener('click', () => this.showConverterScreen());
        
        // Экран просмотра
        if (this.backFromViewerBtn) {
            this.backFromViewerBtn.addEventListener('click', () => this.showMainScreen());
        }
        if (this.autoRotateBtn) {
            this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        }
        if (this.resetCameraBtn) {
            this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        }
        
        // Экран конвертера
        if (this.backFromConverterBtn) {
            this.backFromConverterBtn.addEventListener('click', () => this.showMainScreen());
        }
        
        window.addEventListener('resize', () => this.handleResize());
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

    // ОСВЕЩЕНИЕ
    setupPreviewLighting() {
        if (this.previewLightsInitialized) return;
        
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
        if (this.mainLightsInitialized) return;
        
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
            if (child.isLight) lightsToRemove.push(child);
        });
        lightsToRemove.forEach(light => scene.remove(light));
    }

    // РЕНДЕРЕРЫ
    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) return 'model-viewer';
        if (RENDERER_FORMATS.THREE_JS.includes(extension)) return 'threejs';
        return null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.currentFileURL) URL.revokeObjectURL(this.currentFileURL);
        this.resetPreview();

        if (!this.validateFile(file)) return;

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
            alert(`📁 Файл слишком большой\nРазмер: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            return false;
        }

        const validFormats = ['.glb', '.gltf', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert(`❌ Поддерживаемые форматы: ${validFormats.join(', ')}`);
            return false;
        }

        return true;
    }

    async showPreview() {
        try {
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

        } catch (error) {
            console.error('❌ Ошибка показа превью:', error);
            alert('❌ Ошибка при обработке файла');
            this.resetPreview();
        }
    }

    hidePreviewPlaceholder() {
        if (this.previewPlaceholder) {
            this.previewPlaceholder.style.display = 'none';
        }
    }

    showPreviewPlaceholder() {
        if (this.previewPlaceholder) {
            this.previewPlaceholder.style.display = 'flex';
        }
    }

    async loadModelViewerPreview() {
        return new Promise((resolve) => {
            this.clearThreeJSScene(this.previewScene);
            if (this.previewModel) {
                this.previewModel.src = this.currentFileURL;
                this.previewModel.hidden = false;
            }
            this.hidePreviewPlaceholder();
            setTimeout(resolve, 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();

            loader.load(this.currentFileURL, (geometry) => {
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
                
                if (this.previewThreejs) {
                    this.previewThreejs.hidden = false;
                }
                this.hidePreviewPlaceholder();
                resolve();
            }, 
            (progress) => {
                if (progress.lengthComputable) {
                    this.updateProgress((progress.loaded / progress.total) * 100);
                }
            },
            reject);
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
            
            if (this.mainControls) this.mainControls.update();
        }
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        const objectsToRemove = [];
        scene.traverse((child) => {
            if (child.isMesh) objectsToRemove.push(child);
        });
        objectsToRemove.forEach(obj => scene.remove(obj));
    }

    hideAllRenderers() {
        if (this.previewModel) this.previewModel.hidden = true;
        if (this.previewThreejs) this.previewThreejs.hidden = true;
        if (this.mainModel) this.mainModel.hidden = true;
        if (this.mainThreejs) this.mainThreejs.hidden = true;
    }

    updateProgress(percent) {
        if (this.progressFill) this.progressFill.style.width = percent + '%';
        if (this.progressText) this.progressText.textContent = Math.round(percent) + '%';
    }

    async openViewer() {
        if (!this.currentFile) return;

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
            console.error('❌ Ошибка:', error);
            alert('❌ Ошибка при открытии модели');
        }
    }

    async openModelViewer() {
        return new Promise((resolve) => {
            this.clearThreeJSScene(this.mainScene);
            if (this.mainControls) {
                this.mainControls.dispose();
                this.mainControls = null;
            }
            if (this.mainModel) {
                this.mainModel.src = this.currentFileURL;
                this.mainModel.autoRotate = true;
                this.mainModel.hidden = false;
            }
            setTimeout(resolve, 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();

            loader.load(this.currentFileURL, (geometry) => {
                this.clearThree
