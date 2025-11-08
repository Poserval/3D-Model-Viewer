// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

// Форматы для каждого рендерера
const RENDERER_FORMATS = {
    MODEL_VIEWER: ['.glb', '.gltf', '.obj'],
    THREE_JS: ['.stl', '.fbx', '.3mf']
};

class ModelViewerApp {
    constructor() {
        this.currentState = APP_STATES.MAIN;
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        this.MAX_FILE_SIZE = 200 * 1024 * 1024;
        
        // Three.js переменные
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.mainScene = null;
        this.mainCamera = null;
        this.mainRenderer = null;
        this.mainControls = null;
        this.previewModel = null;
        this.mainModel = null;
        this.autoRotate = true;
        
        this.init();
    }

    init() {
        // Элементы интерфейса
        this.mainScreen = document.getElementById('main-screen');
        this.viewerScreen = document.getElementById('viewer-screen');
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.open3dBtn = document.getElementById('open-3d-btn');
        this.backBtn = document.getElementById('back-btn');
        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        this.mainThreejs = document.getElementById('main-threejs');
        this.fileName = document.getElementById('file-name');
        this.viewerTitle = document.getElementById('viewer-title');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewArea = document.getElementById('preview-area');

        // Элементы индикатора загрузки
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');

        this.bindEvents();
        this.checkModelViewer();
        this.initThreeJS();
        
        console.log('🚀 3D Model Viewer запущен');
    }

    checkModelViewer() {
        const modelViewerAvailable = typeof customElements !== 'undefined' && 
                                   customElements.get('model-viewer') !== undefined;
        
        console.log('📚 Model Viewer доступен:', modelViewerAvailable);
        
        if (!modelViewerAvailable) {
            console.warn('⚠️ Model Viewer не загрузился');
        }
    }

    initThreeJS() {
        // Для превью
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        // Для основного просмотрщика
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ 
            canvas: this.mainThreejs,
            antialias: true
        });
        this.mainRenderer.setSize(800, 600);
        this.mainRenderer.setClearColor(0x000000);
        
        // Настройка освещения
        this.setupLighting(this.previewScene);
        this.setupLighting(this.mainScene);
        
        // Позиция камеры
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);
        
        // Запуск анимации
        this.animatePreview();
        this.animateMain();
    }

    setupLighting(scene) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
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

        this.showPreview(file, this.currentFileType);
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const maxSizeMB = (this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
            alert(`📁 Файл слишком большой\nРазмер: ${fileSizeMB}MB\nМаксимальный размер: ${maxSizeMB}MB`);
            return false;
        }

        const validFormats = [...RENDERER_FORMATS.MODEL_VIEWER, ...RENDERER_FORMATS.THREE_JS];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            const supportedList = validFormats.join(', ');
            alert(`❌ Неподдерживаемый формат\nПоддерживаемые форматы: ${supportedList}`);
            return false;
        }

        return true;
    }

    async showPreview(file, fileType) {
        try {
            this.previewPlaceholder.hidden = true;
            this.open3dBtn.disabled = true;
            this.fileName.textContent = file.name;

            this.hideAllRenderers();
            
            if (this.currentRenderer === 'model-viewer') {
                await this.loadModelViewerPreview(file);
                this.previewModel.hidden = false;
            } else if (this.currentRenderer === 'threejs') {
                await this.loadThreeJSPreview(file);
                this.previewThreejs.hidden = false;
            }

            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;

        } catch (error) {
            console.error('Ошибка показа превью:', error);
            alert('❌ Ошибка при обработке файла:\n' + error.message);
            this.resetPreview();
        }
    }

    async loadModelViewerPreview(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            this.previewModel.src = fileURL;

            const onLoad = () => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.log('✅ Model Viewer превью загружено');
                resolve();
            };

            const onError = (e) => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.error('❌ Ошибка загрузки Model Viewer превью:', e);
                reject(new Error('Не удалось загрузить модель в Model Viewer'));
            };

            this.previewModel.addEventListener('load', onLoad);
            this.previewModel.addEventListener('error', onError);

            setTimeout(() => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.log('⏰ Model Viewer превью загружено (таймаут)');
                resolve();
            }, 3000);
        });
    }

    async loadThreeJSPreview(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            
            let loader;
            
            switch (extension) {
                case '.stl':
                    loader = new THREE.STLLoader();
                    break;
                case '.fbx':
                    loader = new THREE.FBXLoader();
                    break;
                case '.3mf':
                    loader = new THREE.3MFLoader();
                    break;
                default:
                    reject(new Error(`Неизвестный формат: ${extension}`));
                    return;
            }

            const onLoad = (object) => {
                this.clearThreeJSScene(this.previewScene);
                
                let modelToAdd = object;
                if (extension === '.3mf') {
                    modelToAdd = object;
                }
                
                this.previewScene.add(modelToAdd);
                this.previewModel = modelToAdd;
                
                this.centerModel(modelToAdd);
                this.fitCameraToObject(this.previewCamera, modelToAdd, 2);
                
                console.log('✅ Three.js превью загружено');
                resolve();
            };

            const onProgress = (progress) => {
                if (progress.lengthComputable) {
                    const percent = (progress.loaded / progress.total) * 100;
                    this.updateProgress(percent);
                }
            };

            const onError = (error) => {
                console.error('❌ Ошибка загрузки Three.js превью:', error);
                reject(new Error('Не удалось загрузить модель в Three.js'));
            };

            loader.load(fileURL, onLoad, onProgress, onError);
        });
    }

    centerModel(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
    }

    fitCameraToObject(camera, object, offset = 1) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * offset;
        
        cameraZ *= 1.5;
        
        camera.position.set(0, 0, cameraZ);
        camera.lookAt(center);
    }

    animatePreview() {
        if (!this.previewThreejs.hidden && this.autoRotate && this.previewModel) {
            this.previewModel.rotation.y += 0.01;
        }
        
        this.previewRenderer.render(this.previewScene, this.previewCamera);
        requestAnimationFrame(() => this.animatePreview());
    }

    animateMain() {
        if (!this.mainThreejs.hidden && this.autoRotate && this.mainModel) {
            this.mainModel.rotation.y += 0.01;
        }
        
        if (this.mainControls) {
            this.mainControls.update();
        }
        
        this.mainRenderer.render(this.mainScene, this.mainCamera);
        requestAnimationFrame(() => this.animateMain());
    }

    clearThreeJSScene(scene) {
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        this.setupLighting(scene);
    }

    async openViewer() {
        if (!this.currentFile) {
            console.log('Нет выбранного файла');
            return;
        }

        console.log('🎮 Открываем просмотрщик для:', this.currentFile.name);

        this.showLoadingIndicator();

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            await this.openStandardViewer(this.currentFile);

            this.hideLoadingIndicator();
            this.switchToViewer();

            console.log('✅ Успешно перешли в режим просмотра');

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('Ошибка открытия просмотрщика:', error);
            alert('❌ Ошибка при открытии модели:\n' + error.message);
        }
    }

    async openStandardViewer(file) {
        return new Promise((resolve, reject) => {
            if (this.currentRenderer === 'model-viewer') {
                this.openModelViewer(file, resolve, reject);
            } else if (this.currentRenderer === 'threejs') {
                this.openThreeJSViewer(file, resolve, reject);
            } else {
                reject(new Error('Неизвестный рендерер'));
            }
        });
    }

    openModelViewer(file, resolve, reject) {
        const fileURL = URL.createObjectURL(file);
        
        this.mainModel.src = fileURL;
        this.mainModel.autoRotate = true;

        this.hideAllRenderers();
        this.mainModel.hidden = false;

        const onLoad = () => {
            this.mainModel.removeEventListener('load', onLoad);
            this.mainModel.removeEventListener('error', onError);
            this.updateProgress(100);
            console.log('✅ Model Viewer модель загружена');
            resolve();
        };

        const onError = (e) => {
            this.mainModel.removeEventListener('load', onLoad);
            this.mainModel.removeEventListener('error', onError);
            console.error('❌ Ошибка загрузки Model Viewer модели:', e);
            reject(new Error('Не удалось загрузить модель в Model Viewer'));
        };

        this.mainModel.addEventListener('load', onLoad);
        this.mainModel.addEventListener('error', onError);

        setTimeout(() => {
            this.mainModel.removeEventListener('load', onLoad);
            this.mainModel.removeEventListener('error', onError);
            this.updateProgress(100);
            console.log('⏰ Model Viewer модель загружена (таймаут)');
            resolve();
        }, 5000);
    }

    openThreeJSViewer(file, resolve, reject) {
        const fileURL = URL.createObjectURL(file);
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        let loader;
        
        switch (extension) {
            case '.stl':
                loader = new THREE.STLLoader();
                break;
            case '.fbx':
                loader = new THREE.FBXLoader();
                break;
            case '.3mf':
                loader = new THREE.3MFLoader();
                break;
            default:
                reject(new Error(`Неизвестный формат: ${extension}`));
                return;
        }

        const onLoad = (object) => {
            this.clearThreeJSScene(this.mainScene);
            
            let modelToAdd = object;
            if (extension === '.3mf') {
                modelToAdd = object;
            }
            
            this.mainScene.add(modelToAdd);
            this.mainModel = modelToAdd;
            
            this.centerModel(modelToAdd);
            this.fitCameraToObject(this.mainCamera, modelToAdd, 1.5);
            
            if (!this.mainControls) {
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.mainControls.dampingFactor = 0.05;
            }
            
            this.hideAllRenderers();
            this.mainThreejs.hidden = false;
            
            this.updateProgress(100);
            console.log('✅ Three.js модель загружена');
            resolve();
        };

        const onProgress = (progress) => {
            if (progress.lengthComputable) {
                const percent = (progress.loaded / progress.total) * 100;
                this.updateProgress(percent);
            }
        };

        const onError = (error) => {
            console.error('❌ Ошибка загрузки Three.js модели:', error);
            reject(new Error('Не удалось загрузить модель в Three.js'));
        };

        loader.load(fileURL, onLoad, onProgress, onError);
    }

    hideAllRenderers() {
        this.previewModel.hidden = true;
        this.previewThreejs.hidden = true;
        this.mainModel.hidden = true;
        this.mainThreejs.hidden = true;
    }

    showLoadingIndicator() {
        this.loadingIndicator.classList.add('active');
        this.startProgressAnimation();
    }

    hideLoadingIndicator() {
        this.loadingIndicator.classList.remove('active');
        this.resetProgress();
    }

    startProgressAnimation() {
        let progress = 0;
        const maxProgress = 90;
        
        const quickInterval = setInterval(() => {
            progress += 10;
            this.updateProgress(progress);
            
            if (progress >= 30) {
                clearInterval(quickInterval);
                const slowInterval = setInterval(() => {
                    progress += 2;
                    this.updateProgress(progress);
                    
                    if (progress >= maxProgress) {
                        clearInterval(slowInterval);
                    }
                }, 200);
            }
        }, 100);
    }

    updateProgress(percent) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = Math.round(percent) + '%';
    }

    resetProgress() {
        this.progressFill.style.width = '0%';
        this.progressText.textContent = '0%';
    }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
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
        
        if (isActive) {
            this.autoRotateBtn.innerHTML = '⏸️';
        } else {
            this.autoRotateBtn.innerHTML = '▶️';
        }
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
            this.mainModel.resetTurntableRotation();
        } else if (this.currentRenderer === 'threejs' && this.mainModel) {
            this.fitCameraToObject(this.mainCamera, this.mainModel, 1.5);
            if (this.mainControls) {
                this.mainControls.reset();
            }
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        this.autoRotate = false;
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.autoRotate = false;
        }

        this.currentState = APP_STATES.MAIN;
    }

    resetPreview() {
        this.previewPlaceholder.hidden = false;
        this.hideAllRenderers();
        this.previewModel.src = '';
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        
        this.clearThreeJSScene(this.previewScene);
        this.clearThreeJSScene(this.mainScene);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
