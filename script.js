// script.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (с Capacitor Filesystem, без FilePicker)

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
        
        // Флаг для отслеживания освещения
        this.lightsInitialized = false;
        this.orbitingLight = null;
        
        // Capacitor
        this.isCapacitor = window.Capacitor ? true : false;
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        
        console.log('🚀 3D Model Viewer запущен');
        if (this.isCapacitor) {
            console.log('📱 Запущено в Capacitor (Android)');
        }
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
            if (this.isCapacitor) {
                this.selectFileCapacitor();
            } else {
                this.fileInput.click();
            }
        });

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

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

    async selectFileCapacitor() {
        try {
            console.log('📱 Выбор файла в Capacitor...');
            
            // Используем стандартный input в Capacitor - он работает на Android 16
            // Просто создаем временный input и кликаем по нему
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.glb,.gltf,.obj,.stl';
            input.style.display = 'none';
            document.body.appendChild(input);
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.processSelectedFile(file);
                }
                document.body.removeChild(input);
            };
            
            input.click();
            
        } catch (error) {
            console.error('❌ Ошибка выбора файла:', error);
            alert('Не удалось выбрать файл. Попробуйте еще раз.');
        }
    }

    processSelectedFile(file) {
        // Освобождаем предыдущий URL
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

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.processSelectedFile(file);
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

    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) {
            return 'model-viewer';
        } else if (RENDERER_FORMATS.THREE_JS.includes(extension)) {
            return 'threejs';
        }
        return null;
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

    setupPreviewLighting() {
        const lightsToRemove = [];
        this.previewScene.traverse((child) => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => this.previewScene.remove(light));

        const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
        this.previewScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 3);
        this.previewScene.add(directionalLight);
        
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
        pointLight.position.set(0, 0, 8);
        this.previewScene.add(pointLight);
        
        console.log('💡 Освещение превью настроено');
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
        let cameraDistance = maxDim * 1.0;
        cameraDistance = Math.max(cameraDistance, 1.5);
        cameraDistance = Math.min(cameraDistance, 8);
        
        this.previewCamera.position.set(0, 0, cameraDistance);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainLighting() {
        if (this.lightsInitialized) {
            console.log('💡 Освещение уже создано, пропускаем');
            return;
        }

        console.log('💡 Создаем основное освещение...');
        
        const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        this.mainScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 10, 5);
        this.mainScene.add(directionalLight);
        
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.mainScene.add(this.orbitingLight);
        
        this.lightsInitialized = true;
        console.log('💡 Основное освещение создано один раз');
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
            
            setTimeout(() => {
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
        if (this.currentRenderer === 'model-viewer' && this.mainModel) {
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
        console.log('🔄 Возврат на главный экран - полный сброс');
        
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.currentState = APP_STATES.MAIN;
        
        this.resetPreview();
        
        this.autoRotate = false;
        if (this.mainModel) {
            this.mainModel.autoRotate = false;
        }
        
        this.lightsInitialized = false;
        
        console.log('✅ Главный экран полностью сброшен');
    }

    resetPreview() {
        console.log('🔄 Полный сброс превью');
        
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
        
        this.lightsInitialized = false;
        
        console.log('✅ Превью полностью сброшено');
    }

    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('active');
        }
    }

    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('active');
            this.updateProgress(0);
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
