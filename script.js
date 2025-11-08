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
        
        this.autoRotate = true;
        this.threeInitialized = false;
        
        console.log('🚀 Инициализация приложения...');
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.checkLibraries();
        
        console.log('✅ Приложение запущено');
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

        console.log('✅ Элементы инициализированы');
    }

    checkLibraries() {
        // Проверяем Three.js
        const threeAvailable = typeof THREE !== 'undefined';
        console.log('📚 Three.js доступен:', threeAvailable);
        
        // Проверяем Model Viewer
        const modelViewerAvailable = typeof customElements !== 'undefined' && 
                                   customElements.get('model-viewer') !== undefined;
        console.log('📚 Model Viewer доступен:', modelViewerAvailable);
        
        if (!threeAvailable) {
            console.error('❌ Three.js не загрузился');
        }
        if (!modelViewerAvailable) {
            console.warn('⚠️ Model Viewer не загрузился');
        }
    }

    bindEvents() {
        console.log('🔗 Привязываем события...');
        
        // Кнопка выбора файла
        this.selectFileBtn.addEventListener('click', () => {
            console.log('🎯 Нажата кнопка выбора файла');
            this.fileInput.click();
        });

        // Загрузка файла
        this.fileInput.addEventListener('change', (e) => {
            console.log('📁 Файл выбран:', e.target.files[0]?.name);
            this.handleFileSelect(e);
        });

        // Открытие 3D просмотра
        this.open3dBtn.addEventListener('click', () => {
            console.log('🎮 Нажата кнопка "Открыть в 3D"');
            this.openViewer();
        });

        // Назад к главному экрану
        this.backBtn.addEventListener('click', () => {
            console.log('🔙 Нажата кнопка "Назад"');
            this.showMainScreen();
        });

        // Управление в просмотрщике
        this.autoRotateBtn.addEventListener('click', () => {
            console.log('🔄 Нажата кнопка автоповорота');
            this.toggleAutoRotate();
        });

        this.resetCameraBtn.addEventListener('click', () => {
            console.log('🎯 Нажата кнопка сброса камеры');
            this.resetCamera();
        });

        console.log('✅ События привязаны');
    }

    // Определение рендерера для формата
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
        if (!file) {
            console.log('❌ Файл не выбран');
            return;
        }

        console.log('📄 Обработка файла:', file.name);

        // Проверка файла
        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;
        this.currentFileType = '.' + file.name.split('.').pop().toLowerCase();
        this.currentRenderer = this.getRendererForFormat(this.currentFileType);
        
        console.log(`🎯 Формат: ${this.currentFileType}, Рендерер: ${this.currentRenderer}`);
        
        if (!this.currentRenderer) {
            alert('❌ Неподдерживаемый формат файла');
            return;
        }

        this.showPreview(file, this.currentFileType);
    }

    validateFile(file) {
        // Проверка размера файла
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

        console.log('✅ Файл прошел валидацию');
        return true;
    }

    async showPreview(file, fileType) {
        console.log('👀 Показываем превью...');
        
        try {
            this.previewPlaceholder.hidden = true;
            this.open3dBtn.disabled = true;
            this.fileName.textContent = file.name;

            // Скрываем все рендереры
            this.hideAllRenderers();
            
            // Загружаем в соответствующий рендерер
            if (this.currentRenderer === 'model-viewer') {
                console.log('🎯 Используем Model Viewer для превью');
                await this.loadModelViewerPreview(file);
                this.previewModel.hidden = false;
            } else if (this.currentRenderer === 'threejs') {
                console.log('🎯 Используем Three.js для превью');
                await this.loadThreeJSPreview(file);
                this.previewThreejs.hidden = false;
            }

            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;

            console.log('✅ Превью успешно загружено');

        } catch (error) {
            console.error('❌ Ошибка показа превью:', error);
            alert('❌ Ошибка при обработке файла:\n' + error.message);
            this.resetPreview();
        }
    }

    async loadModelViewerPreview(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            console.log('🔄 Загружаем в Model Viewer...');
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
            if (typeof THREE === 'undefined') {
                reject(new Error('Three.js не загружен'));
                return;
            }

            // Инициализируем Three.js если еще не инициализирован
            if (!this.threeInitialized) {
                this.initThreeJS();
                this.threeInitialized = true;
            }

            const fileURL = URL.createObjectURL(file);
            const extension = '.' + file.name.split('.').pop().toLowerCase();
            
            console.log(`🔄 Загружаем ${extension} в Three.js...`);
            
            let loader;
            
            // Выбираем соответствующий лоадер
            try {
                switch (extension) {
                    case '.stl':
                        if (typeof THREE.STLLoader === 'undefined') throw new Error('STLLoader не загружен');
                        loader = new THREE.STLLoader();
                        break;
                    case '.fbx':
                        if (typeof THREE.FBXLoader === 'undefined') throw new Error('FBXLoader не загружен');
                        loader = new THREE.FBXLoader();
                        break;
                    case '.3mf':
                        if (typeof THREE.3MFLoader === 'undefined') throw new Error('3MFLoader не загружен');
                        loader = new THREE.3MFLoader();
                        break;
                    default:
                        reject(new Error(`Неизвестный формат: ${extension}`));
                        return;
                }

                loader.load(fileURL, (object) => {
                    console.log('✅ Three.js модель загружена');
                    
                    // Очищаем предыдущую модель
                    this.clearThreeJSScene(this.previewScene);
                    
                    // Добавляем новую модель
                    this.previewScene.add(object);
                    this.previewModelObject = object;
                    
                    // Центрируем модель
                    this.centerModel(object);
                    
                    // Настраиваем камеру
                    this.fitCameraToObject(this.previewCamera, object, 2);
                    
                    // Запускаем анимацию
                    this.animatePreview();
                    
                    resolve();
                }, 
                (progress) => {
                    // Прогресс загрузки
                    if (progress.lengthComputable) {
                        const percent = (progress.loaded / progress.total) * 100;
                        this.updateProgress(percent);
                    }
                },
                (error) => {
                    console.error('❌ Ошибка загрузки Three.js:', error);
                    reject(new Error('Не удалось загрузить модель в Three.js'));
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    initThreeJS() {
        console.log('🔄 Инициализируем Three.js...');
        
        try {
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
            
            // Настройка освещения
            this.setupLighting(this.previewScene);
            this.setupLighting(this.mainScene);
            
            // Позиция камеры
            this.previewCamera.position.set(0, 0, 5);
            this.mainCamera.position.set(0, 0, 5);
            
            console.log('✅ Three.js инициализирован');
        } catch (error) {
            console.error('❌ Ошибка инициализации Three.js:', error);
        }
    }

    setupLighting(scene) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
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
        if (this.previewThreejs && !this.previewThreejs.hidden && this.autoRotate && this.previewModelObject) {
            this.previewModelObject.rotation.y += 0.01;
        }
        
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        requestAnimationFrame(() => this.animatePreview());
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        
        // Удаляем все объекты кроме света
        const objectsToRemove = [];
        scene.children.forEach(child => {
            if (!(child instanceof THREE.Light)) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(obj => scene.remove(obj));
    }

    // Скрыть все рендереры
    hideAllRenderers() {
        if (this.previewModel) this.previewModel.hidden = true;
        if (this.previewThreejs) this.previewThreejs.hidden = true;
        if (this.mainModel) this.mainModel.hidden = true;
        if (this.mainThreejs) this.mainThreejs.hidden = true;
    }

    // Методы для управления индикатором
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
        if (this.progressFill) {
            this.progressFill.style.width = percent + '%';
        }
        if (this.progressText) {
            this.progressText.textContent = Math.round(percent) + '%';
        }
    }

    resetProgress() {
        this.updateProgress(0);
    }

    async openViewer() {
        if (!this.currentFile) {
            console.log('Нет выбранного файла');
            return;
        }

        console.log('🎮 Открываем просмотрщик...');

        this.showLoadingIndicator();

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            // Для простоты - сразу переходим к просмотру
            this.hideLoadingIndicator();
            this.switchToViewer();

            console.log('✅ Успешно перешли в режим просмотра');

        } catch (error) {
            this.hideLoadingIndicator();
            console.error('Ошибка открытия просмотрщика:', error);
            alert('❌ Ошибка при открытии модели:\n' + error.message);
        }
    }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        this.updateAutoRotateButton();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
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
        console.log('🎯 Сбрасываем камеру');
        // Базовая реализация
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        this.autoRotate = false;
        this.currentState = APP_STATES.MAIN;
    }

    resetPreview() {
        this.previewPlaceholder.hidden = false;
        this.hideAllRenderers();
        if (this.previewModel) {
            this.previewModel.src = '';
        }
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
    }
}

// Инициализация приложения когда DOM готов
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM готов, запускаем приложение...');
    new ModelViewerApp();
});
