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
        
        this.currentFileURL = null; // Добавим для хранения URL
        
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
        // Для превью - статичный вид
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        // Для основного просмотрщика - интерактивный
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ 
            canvas: this.mainThreejs,
            antialias: true,
            alpha: true
        });
        this.mainRenderer.setClearColor(0x222222, 1);
        this.mainRenderer.setSize(window.innerWidth, window.innerHeight);
        
        // Настройка освещения
        this.setupLighting(this.previewScene);
        this.setupLighting(this.mainScene);
        
        // Позиция камеры для превью - статичный вид сбоку
        this.previewCamera.position.set(5, 5, 5);
        this.previewCamera.lookAt(0, 0, 0);
        
        // Позиция камеры для основного просмотрщика
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

        // Освобождаем предыдущий URL
        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
        }

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
            this.previewModel.src = this.currentFileURL;

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

                console.log('Загрузка файла в превью:', file.name);

                loader.load(this.currentFileURL, (object) => {
                    console.log('Модель успешно загружена в превью:', object);
                    
                    this.clearThreeJSScene(this.previewScene);
                    
                    let modelObject;
                    
                    if (extension === '.stl') {
                        const geometry = object;
                        const material = new THREE.MeshStandardMaterial({ 
                            color: 0x888888,
                            roughness: 0.7,
                            metalness: 0.2
                        });
                        modelObject = new THREE.Mesh(geometry, material);
                    } else {
                        modelObject = object;
                        if (modelObject.traverse) {
                            modelObject.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    if (!child.material.isMeshStandardMaterial) {
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
                    }
                    
                    this.previewScene.add(modelObject);
                    this.previewModelObject = modelObject;
                    
                    // ДЛЯ ПРЕВЬЮ: статичное позиционирование
                    this.setupPreviewCamera(modelObject);
                    
                    this.hidePreviewPlaceholder();
                    resolve();
                }, 
                (progress) => {
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total) * 100;
                        this.updateProgress(percent);
                    }
                },
                (error) => {
                    console.error('Ошибка загрузки в превью:', error);
                    this.showPreviewPlaceholder();
                    reject(new Error('Не удалось загрузить модель в Three.js'));
                });
            } catch (loaderError) {
                console.error('Ошибка создания загрузчика:', loaderError);
                reject(new Error('Ошибка инициализации загрузчика'));
            }
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Центрируем объект
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        // Вычисляем оптимальное расстояние для камеры
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.previewCamera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        
        // Статичная камера для превью - вид сбоку под углом
        this.previewCamera.position.set(cameraDistance, cameraDistance * 0.5, cameraDistance);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Центрируем объект
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        // Вычисляем оптимальное расстояние для камеры
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.mainCamera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        
        this.mainCamera.position.set(0, 0, cameraDistance);
        this.mainCamera.lookAt(0, 0, 0);
        this.mainCamera.updateProjectionMatrix();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Анимация превью - БЕЗ ВРАЩЕНИЯ (статично)
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
        
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
        
        this.previewModelObject = null;
        this.mainModelObject = null;
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
                await this.openModelViewer();
            } else if (this.currentRenderer === 'threejs') {
                await this.openThreeJSViewer();
            }

            this.hideLoadingIndicator();
            this.switchToViewer();

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('Ошибка открытия просмотрщика:', error);
            alert('❌ Ошибка при открытии модели:\n' + error.message);
        }
    }

    async openModelViewer() {
        return new Promise((resolve) => {
            this.mainModel.src = this.currentFileURL;
            this.mainModel.autoRotate = true;

            this.hideAllRenderers();
            this.mainModel.hidden = false;

            // Для Model Viewer просто ждем немного
            setTimeout(() => {
                this.updateProgress(100);
                resolve();
            }, 1000);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            const extension = this.currentFileType;
            
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

                console.log('Загрузка в основной просмотрщик:', this.currentFile.name);

                loader.load(this.currentFileURL, (object) => {
                    console.log('Модель успешно загружена в основной просмотрщик:', object);
                    
                    this.clearThreeJSScene(this.mainScene);
                    
                    let modelObject;
                    
                    if (extension === '.stl') {
                        const geometry = object;
                        const material = new THREE.MeshStandardMaterial({ 
                            color: 0x888888,
                            roughness: 0.7,
                            metalness: 0.2
                        });
                        modelObject = new THREE.Mesh(geometry, material);
                    } else {
                        modelObject = object;
                        if (modelObject.traverse) {
                            modelObject.traverse((child) => {
                                if (child.isMesh && child.material) {
                                    if (!child.material.isMeshStandardMaterial) {
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
                    }
                    
                    this.mainScene.add(modelObject);
                    this.mainModelObject = modelObject;
                    
                    // Настраиваем камеру
                    this.setupMainCamera(modelObject);
                    
                    // Инициализация OrbitControls
                    this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                    this.mainControls.enableDamping = true;
                    this.mainControls.dampingFactor = 0.05;
                    this.mainControls.screenSpacePanning = false;
                    this.mainControls.minDistance = 0.1;
                    this.mainControls.maxDistance = 1000;
                    
                    this.updateMainThreeJSSize();
                    
                    this.hideAllRenderers();
                    this.mainThreejs.hidden = false;
                    
                    // Форсируем первый рендер
                    this.mainRenderer.render(this.mainScene, this.mainCamera);
                    
                    this.updateProgress(100);
                    resolve();
                }, 
                (progress) => {
                    const percent = (progress.loaded / progress.total) * 100;
                    this.updateProgress(percent);
                },
                (error) => {
                    console.error('Ошибка загрузки в основной просмотрщик:', error);
                    reject(new Error('Не удалось загрузить модель в Three.js'));
                });
            } catch (loaderError) {
                console.error('Ошибка создания загрузчика:', loaderError);
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
                
                console.log('Установка размера основного Three.js:', width, 'x', height);
                
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
        
        // Обновляем размер после переключения
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
            this.setupMainCamera(this.mainModelObject);
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
        
        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
            this.currentFileURL = null;
        }
        
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
