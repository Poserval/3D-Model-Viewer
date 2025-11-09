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
        
        // ЯРКОЕ ОСВЕЩЕНИЕ ДЛЯ STL
        this.setupLighting(this.previewScene);
        this.setupLighting(this.mainScene);
        
        // Камеры
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);

        console.log('Three.js инициализирован');
        this.animate();
    }

    setupLighting(scene) {
        // Очищаем старое освещение
        while(scene.children.length > 0) { 
            if (scene.children[0].isLight) {
                scene.remove(scene.children[0]);
            } else {
                break;
            }
        }
        
        // ЯРКОЕ ОСВЕЩЕНИЕ ДЛЯ STL
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Максимальная яркость
        scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight1.position.set(10, 10, 10);
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight2.position.set(-10, 10, -10);
        scene.add(directionalLight2);
        
        const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight3.position.set(0, -5, 0);
        scene.add(directionalLight3);
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
            console.log('Показ превью...');
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
            console.error('Ошибка показа превью:', error);
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
            this.previewModel.src = this.currentFileURL;
            this.previewModel.hidden = false;
            this.hidePreviewPlaceholder();
            
            setTimeout(() => {
                resolve();
            }, 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

            console.log('Загрузка превью Three.js...');

            loader.load(this.currentFileURL, (object) => {
                console.log('Превью загружено');
                
                this.clearThreeJSScene(this.previewScene);
                
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const geometry = object;
                    // СВЕТЛЫЙ МАТЕРИАЛ ДЛЯ STL
                    const material = new THREE.MeshStandardMaterial({ 
                        color: 0xCCCCCC, // Светло-серый
                        roughness: 0.3,  // Меньше шероховатости
                        metalness: 0.1   // Меньше металличности
                    });
                    modelObject = new THREE.Mesh(geometry, material);
                } else {
                    modelObject = object;
                    if (modelObject.traverse) {
                        modelObject.traverse((child) => {
                            if (child.isMesh && child.material && !child.material.isMeshStandardMaterial) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0x888888,
                                    roughness: 0.7,
                                    metalness: 0.2
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
                
                resolve();
            }, 
            (progress) => {
                if (progress.lengthComputable) {
                    this.updateProgress((progress.loaded / progress.total) * 100);
                }
            },
            (error) => {
                console.error('Ошибка загрузки превью:', error);
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
        
        // Автоматическое выравнивание модели
        this.autoAlignModel(object, size);
        
        // Настраиваем камеру превью
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.previewCamera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
        
        cameraDistance = Math.max(cameraDistance, 1);
        
        console.log('📷 Дистанция камеры превью:', cameraDistance);
        
        this.previewCamera.position.set(cameraDistance * 0.7, cameraDistance * 0.3, cameraDistance * 0.7);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 Размер модели для основного просмотра:', size);
        
        // Центрируем объект
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        // Автоматическое выравнивание модели
        this.autoAlignModel(object, size);
        
        // 🎯 ОПТИМИЗИРОВАННАЯ ДИСТАНЦИЯ ДЛЯ STL
        const maxDim = Math.max(size.x, size.y, size.z);
        let cameraDistance;
        
        if (this.currentFileType === '.stl') {
            // ДЛЯ STL - БЛИЖЕ И ПРОЩЕ
            cameraDistance = maxDim * 1.2; // Размер модели + 20%
        } else {
            // Для других форматов - стандартная формула
            const fov = this.mainCamera.fov * (Math.PI / 180);
            cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
        }
        
        cameraDistance = Math.max(cameraDistance, 0.5); // Минимальная дистанция
        cameraDistance = Math.min(cameraDistance, 10);  // Максимальная дистанция
        
        console.log('📷 Дистанция камеры основного просмотра:', cameraDistance);
        
        this.mainCamera.position.set(0, 0, cameraDistance);
        this.mainCamera.lookAt(0, 0, 0);
        this.mainCamera.updateProjectionMatrix();
        
        if (this.mainControls) {
            this.mainControls.minDistance = cameraDistance * 0.5;  // Ближе можно подойти
            this.mainControls.maxDistance = cameraDistance * 3;    // Не так далеко
            this.mainControls.reset(); // Сбрасываем контролы
        }
    }

    autoAlignModel(object, size) {
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Определяем ориентацию и выравниваем модель
        if (size.y === maxDim) {
            // Вертикальная ориентация - оставляем как есть
            console.log('🎯 Модель ориентирована вертикально');
            object.rotation.x = 0;
            object.rotation.y = 0;
            object.rotation.z = 0;
        } else if (size.z === maxDim) {
            // Лежит на "спине" - поднимаем в вертикальное положение
            console.log('🎯 Модель лежит - поворачиваем в вертикальное положение');
            object.rotation.x = -Math.PI / 2;
            object.rotation.y = 0;
            object.rotation.z = 0;
        } else if (size.x === maxDim) {
            // Лежит на боку - поворачиваем в вертикальное положение
            console.log('🎯 Модель на боку - поворачиваем в вертикальное положение');
            object.rotation.x = 0;
            object.rotation.y = 0;
            object.rotation.z = -Math.PI / 2;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Рендер превью - БЕЗ ВРАЩЕНИЯ (статично)
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        // Рендер основного просмотрщика - С ВРАЩЕНИЕМ ЕСЛИ ВКЛЮЧЕНО
        if (this.mainThreejs && !this.mainThreejs.hidden) {
            // ВРАЩЕНИЕ ДЛЯ THREE.JS МОДЕЛЕЙ
            if (this.autoRotate && this.mainModelObject && this.currentRenderer === 'threejs') {
                this.mainModelObject.rotation.y += 0.01;
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
        while(scene.children.length > 0) { 
            scene.remove(scene.children[0]); 
        }
    }

    hideAllRenderers() {
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

        console.log('Открытие просмотрщика...');
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
            this.mainModel.hidden = false;
            this.hideAllRenderers();
            
            setTimeout(() => {
                this.updateProgress(100);
                resolve();
            }, 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

            console.log('Загрузка в основной просмотрщик...');

            loader.load(this.currentFileURL, (object) => {
                console.log('Основная модель загружена');
                
                this.clearThreeJSScene(this.mainScene);
                
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const geometry = object;
                    // СВЕТЛЫЙ МАТЕРИАЛ ДЛЯ STL
                    const material = new THREE.MeshStandardMaterial({ 
                        color: 0xCCCCCC, // Светло-серый
                        roughness: 0.3,  // Меньше шероховатости
                        metalness: 0.1   // Меньше металличности
                    });
                    modelObject = new THREE.Mesh(geometry, material);
                } else {
                    modelObject = object;
                    if (modelObject.traverse) {
                        modelObject.traverse((child) => {
                            if (child.isMesh && child.material && !child.material.isMeshStandardMaterial) {
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
                this.mainControls.screenSpacePanning = false;
                
                // ВКЛЮЧАЕМ АВТОПОВОРОТ ПО УМОЛЧАНИЮ ДЛЯ THREE.JS
                this.autoRotate = true;
                
                // Принудительно устанавливаем стили для canvas
                this.hideAllRenderers();
                this.mainThreejs.hidden = false;
                this.mainThreejs.style.display = 'block';
                this.mainThreejs.style.visibility = 'visible';
                this.mainThreejs.style.opacity = '1';
                
                // Гарантируем что model-viewer скрыт
                this.mainModel.style.display = 'none';
                this.mainModel.hidden = true;
                
                console.log('✅ CSS стили принудительно применены');
                console.log('🔄 Автоповорот включен для Three.js');
                
                this.updateMainThreeJSSize();
                
                this.updateProgress(100);
                resolve();
            }, 
            (progress) => {
                this.updateProgress((progress.loaded / progress.total) * 100);
            },
            (error) => {
                console.error('Ошибка загрузки:', error);
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
                
                console.log('📏 Размер основного Three.js:', width, 'x', height);
                
                this.mainRenderer.setSize(width, height);
                this.mainCamera.aspect = width / height;
                this.mainCamera.updateProjectionMatrix();
                
                // Форсируем рендер
                this.mainRenderer.render(this.mainScene, this.mainCamera);
            }
        }
    }

    handleResize() {
        this.updateMainThreeJSSize();
    }

    switchToViewer() {
        console.log('Переключение на экран просмотра');
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        setTimeout(() => {
            this.updateMainThreeJSSize();
        }, 50);
        
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
        
        // Выключаем автоповорот при возврате на главный экран
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
