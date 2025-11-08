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
        console.log('Three.js доступен:', typeof THREE !== 'undefined');
        console.log('STLLoader доступен:', typeof THREE.STLLoader !== 'undefined');
        console.log('FBXLoader доступен:', typeof THREE.FBXLoader !== 'undefined');
        console.log('OrbitControls доступен:', typeof THREE.OrbitControls !== 'undefined');
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
        // Кнопка выбора файла
        this.selectFileBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Загрузка файла
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        // Открытие 3D просмотра
        this.open3dBtn.addEventListener('click', () => {
            this.openViewer();
        });

        // Назад к главному экрану
        this.backBtn.addEventListener('click', () => {
            this.showMainScreen();
        });

        // Управление в просмотрщике
        this.autoRotateBtn.addEventListener('click', () => {
            this.toggleAutoRotate();
        });

        this.resetCameraBtn.addEventListener('click', () => {
            this.resetCamera();
        });

        // Ресайз окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });
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
            antialias: true,
            alpha: true
        });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        // Настройка освещения
        this.setupLighting(this.previewScene);
        this.setupLighting(this.mainScene);
        
        // Позиция камеры
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);

        // Запуск анимации
        this.animate();
    }

    setupLighting(scene) {
        // Очищаем старое освещение
        const lightsToRemove = [];
        scene.children.forEach(child => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => scene.remove(light));
        
        // Добавляем новое освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
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
            this.hidePreviewPlaceholder();
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

    hidePreviewPlaceholder() {
        this.previewPlaceholder.style.display = 'none';
        this.previewPlaceholder.hidden = true;
    }

    showPreviewPlaceholder() {
        this.previewPlaceholder.style.display = 'flex';
        this.previewPlaceholder.hidden = false;
    }

    async loadModelViewerPreview(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            this.previewModel.src = fileURL;

            const onLoad = () => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                this.hidePreviewPlaceholder();
                resolve();
            };

            const onError = (e) => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                this.showPreviewPlaceholder();
                reject(new Error('Не удалось загрузить модель в Model Viewer'));
            };

            this.previewModel.addEventListener('load', onLoad);
            this.previewModel.addEventListener('error', onError);

            setTimeout(() => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                this.hidePreviewPlaceholder();
                resolve();
            }, 3000);
        });
    }

    async loadThreeJSPreview(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            
            let loader;
            
            try {
                if (extension === '.stl') {
                    loader = new THREE.STLLoader();
                } else if (extension === '.fbx') {
                    loader = new THREE.FBXLoader();
                } else {
                    reject(new Error(`Неизвестный формат: ${extension}`));
                    return;
                }

                console.log('Загрузка файла:', file.name, 'с загрузчиком:', loader.constructor.name);

                loader.load(fileURL, (object) => {
                    console.log('Модель успешно загружена:', object);
                    
                    this.clearThreeJSScene(this.previewScene);
                    
                    // Обрабатываем материалы
                    this.setupModelMaterials(object);
                    
                    this.previewScene.add(object);
                    this.previewModelObject = object;
                    
                    this.centerModel(object);
                    this.fitCameraToObject(this.previewCamera, object, 2);
                    
                    this.hidePreviewPlaceholder();
                    resolve();
                }, 
                (progress) => {
                    console.log('Прогресс загрузки:', progress);
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total) * 100;
                        this.updateProgress(percent);
                    }
                },
                (error) => {
                    console.error('Ошибка загрузки:', error);
                    this.showPreviewPlaceholder();
                    reject(new Error('Не удалось загрузить модель в Three.js'));
                });
            } catch (loaderError) {
                console.error('Ошибка создания загрузчика:', loaderError);
                reject(new Error('Ошибка инициализации загрузчика'));
            }
        });
    }

    setupModelMaterials(object) {
        object.traverse((child) => {
            if (child.isMesh) {
                // Если у меша нет материала, создаем стандартный
                if (!child.material) {
                    child.material = new THREE.MeshStandardMaterial({ 
                        color: 0x888888,
                        roughness: 0.7,
                        metalness: 0.2
                    });
                }
                
                // Если материал есть, но это базовый материал без свойств PBR
                if (child.material && !child.material.isMeshStandardMaterial) {
                    const oldMaterial = child.material;
                    child.material = new THREE.MeshStandardMaterial({
                        color: oldMaterial.color || 0x888888,
                        map: oldMaterial.map,
                        roughness: 0.7,
                        metalness: 0.2
                    });
                }
            }
        });
    }

    centerModel(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Центрируем объект
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        return size;
    }

    fitCameraToObject(camera, object, offset = 1) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * offset;
        
        cameraZ *= 1.5;
        
        camera.position.set(center.x, center.y, cameraZ);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Анимация превью
        if (this.previewThreejs && !this.previewThreejs.hidden && this.autoRotate && this.previewModelObject) {
            this.previewModelObject.rotation.y += 0.01;
        }
        
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        // Анимация основного просмотрщика
        if (this.mainThreejs && !this.mainThreejs.hidden) {
            if (this.autoRotate && this.mainModelObject) {
                this.mainModelObject.rotation.y += 0.005;
            }
            
            if (this.mainRenderer && this.mainScene && this.mainCamera) {
                this.mainRenderer.render(this.mainScene, this.mainCamera);
            }
            
            if (this.mainControls) {
                this.mainControls.update();
            }
        }
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        
        const objectsToRemove = [];
        scene.children.forEach(child => {
            if (!child.isLight) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(obj => scene.remove(obj));
        
        if (this.previewModelObject) {
            this.previewModelObject = null;
        }
        if (this.mainModelObject) {
            this.mainModelObject = null;
        }
    }

    hideAllRenderers() {
        if (this.previewModel) this.previewModel.hidden = true;
        if (this.previewThreejs) this.previewThreejs.hidden = true;
        if (this.mainModel) this.mainModel.hidden = true;
        if (this.mainThreejs) this.mainThreejs.hidden = true;
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

        this.showLoadingIndicator();

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            if (this.currentRenderer === 'model-viewer') {
                await this.openModelViewer(this.currentFile);
            } else if (this.currentRenderer === 'threejs') {
                await this.openThreeJSViewer(this.currentFile);
            }

            this.hideLoadingIndicator();
            this.switchToViewer();

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('Ошибка открытия просмотрщика:', error);
            alert('❌ Ошибка при открытии модели:\n' + error.message);
        }
    }

    async openModelViewer(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            this.mainModel.src = fileURL;
            this.mainModel.autoRotate = true;

            this.hideAllRenderers();
            this.mainModel.hidden = false;

            const onLoad = () => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
                this.updateProgress(100);
                resolve();
            };

            const onError = (e) => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
                reject(new Error('Не удалось загрузить модель в Model Viewer'));
            };

            this.mainModel.addEventListener('load', onLoad);
            this.mainModel.addEventListener('error', onError);

            setTimeout(() => {
                this.updateProgress(100);
                resolve();
            }, 2000);
        });
    }

    async openThreeJSViewer(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            
            let loader;
            
            try {
                if (extension === '.stl') {
                    loader = new THREE.STLLoader();
                } else if (extension === '.fbx') {
                    loader = new THREE.FBXLoader();
                } else {
                    reject(new Error(`Неизвестный формат: ${extension}`));
                    return;
                }

                console.log('Загрузка в основной просмотрщик:', file.name);

                loader.load(fileURL, (object) => {
                    console.log('Основная модель загружена:', object);
                    
                    this.clearThreeJSScene(this.mainScene);
                    
                    // Обрабатываем материалы
                    this.setupModelMaterials(object);
                    
                    this.mainScene.add(object);
                    this.mainModelObject = object;
                    
                    this.centerModel(object);
                    this.fitCameraToObject(this.mainCamera, object, 1.5);
                    
                    // Инициализация OrbitControls
                    if (!this.mainControls) {
                        this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                        this.mainControls.enableDamping = true;
                        this.mainControls.dampingFactor = 0.05;
                        this.mainControls.screenSpacePanning = false;
                        this.mainControls.minDistance = 0.1;
                        this.mainControls.maxDistance = 1000;
                    }
                    
                    this.updateMainThreeJSSize();
                    
                    this.hideAllRenderers();
                    this.mainThreejs.hidden = false;
                    
                    this.updateProgress(100);
                    resolve();
                }, 
                (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    this.updateProgress(percent);
                },
                (error) => {
                    console.error('Ошибка загрузки основной модели:', error);
                    reject(new Error('Не удалось загрузить модель в Three.js'));
                });
            } catch (loaderError) {
                console.error('Ошибка создания загрузчика для основного просмотрщика:', loaderError);
                reject(new Error('Ошибка инициализации загрузчика'));
            }
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
            }
        }
    }

    handleResize() {
        this.updateMainThreeJSSize();
    }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        // Обновляем размер Three.js при переключении
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
        
        if (isActive) {
            this.autoRotateBtn.innerHTML = '⏸️ Автоповорот';
        } else {
            this.autoRotateBtn.innerHTML = '▶️ Автоповорот';
        }
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
            this.mainModel.resetTurntableRotation();
        } else if (this.currentRenderer === 'threejs' && this.mainModelObject) {
            this.fitCameraToObject(this.mainCamera, this.mainModelObject, 1.5);
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
        this.showPreviewPlaceholder();
        this.hideAllRenderers();
        if (this.previewModel) {
            this.previewModel.src = '';
        }
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        
        this.clearThreeJSScene(this.previewScene);
        this.clearThreeJSScene(this.mainScene);
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
