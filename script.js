// script.js - ПОЛНАЯ ВЕРСИЯ С ПОДДЕРЖКОЙ GLB

// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
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
        
        // GLTFLoader для поддержки GLB
        this.gltfLoader = null;
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        this.initGLTFLoader();
        
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
        
        // ⭐ Конвертер в браузере
        this.goToConverterBtn.addEventListener('click', () => {
            const converterUrl = 'https://poserval.github.io/3D-Model-Viewer/converter.html';
            const fileParam = this.currentFile ? '?file=' + encodeURIComponent(this.currentFile.name) : '';
            const fullUrl = converterUrl + fileParam;
            
            if (window.Capacitor) {
                window.open(fullUrl, '_system');
            } else {
                window.open(fullUrl, '_blank');
            }
            
            console.log('🌐 Открываем конвертер в браузере:', fullUrl);
        });
        
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
        this.mainCamera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - 140), 0.1, 1000);
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

    initGLTFLoader() {
        // Проверяем доступность GLTFLoader
        if (THREE.GLTFLoader) {
            this.gltfLoader = new THREE.GLTFLoader();
            console.log('✅ GLTFLoader инициализирован');
        } else {
            console.warn('⚠️ GLTFLoader не найден, GLB не будут загружаться через Three.js');
        }
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
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
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
            // Определяем загрузчик по формату
            if (this.currentFileType === '.stl') {
                this.loadSTLPreview(this.currentFileURL, resolve, reject);
            } else if (this.currentFileType === '.glb' || this.currentFileType === '.gltf') {
                this.loadGLBPreview(this.currentFileURL, resolve, reject);
            } else {
                reject(new Error('Неподдерживаемый формат для Three.js превью'));
            }
        });
    }

    loadSTLPreview(url, resolve, reject) {
        const loader = new THREE.STLLoader();
        loader.load(url, (geometry) => {
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
    }

    loadGLBPreview(url, resolve, reject) {
        if (!this.gltfLoader) {
            reject(new Error('GLTFLoader не инициализирован'));
            return;
        }

        this.gltfLoader.load(url, (gltf) => {
            this.clearThreeJSScene(this.previewScene);
            
            const model = gltf.scene;
            
            // Добавляем освещение если модель темная
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
            model.add(ambientLight);
            
            this.previewScene.add(model);
            this.previewModelObject = model;
            
            // Центрируем модель
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.set(-center.x, -center.y, -center.z);
            
            this.setupPreviewCamera(model);
            
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
        (error) => {
            console.error('Ошибка загрузки GLB:', error);
            reject(error);
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        
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
            this.mainControls.target.set(0, 0, 0);
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
            // Анимация движущегося света
            if (this.orbitingLight && this.autoRotate) {
                const time = Date.now() * 0.001;
                this.orbitingLight.position.x = Math.cos(time * 0.5) * 8;
                this.orbitingLight.position.z = Math.sin(time * 0.5) * 8;
                this.orbitingLight.position.y = 4 + Math.sin(time * 0.3) * 2;
            }
            
            // Автоповорот модели для Three.js
            if (this.autoRotate && this.mainModelObject && this.currentRenderer === 'threejs' && !this.mainModel) {
                this.mainModelObject.rotation.y += 0.01;
            }
            
            this.mainRenderer.render(this.mainScene, this.mainCamera);
            
            if (this.mainControls) {
                this.mainControls.update();
            }
        }
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        const objectsToRemove = [];
        scene.traverse((child) => {
            if (child.isMesh || child.isGroup) {
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
                this.mainModel.autoRotate = this.autoRotate;
                this.mainModel.hidden = false;
            }
            setTimeout(resolve, 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            if (this.currentFileType === '.stl') {
                this.openSTLViewer(resolve, reject);
            } else if (this.currentFileType === '.glb' || this.currentFileType === '.gltf') {
                this.openGLBViewer(resolve, reject);
            } else {
                reject(new Error('Неподдерживаемый формат'));
            }
        });
    }

    openSTLViewer(resolve, reject) {
        const loader = new THREE.STLLoader();
        loader.load(this.currentFileURL, (geometry) => {
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
            if (this.mainThreejs) {
                this.mainThreejs.hidden = false;
            }
            this.updateMainThreeJSSize();
            
            resolve();
        }, 
        (progress) => {
            this.updateProgress((progress.loaded / progress.total) * 100);
        },
        reject);
    }

    openGLBViewer(resolve, reject) {
        if (!this.gltfLoader) {
            reject(new Error('GLTFLoader не инициализирован'));
            return;
        }

        this.gltfLoader.load(this.currentFileURL, (gltf) => {
            this.clearThreeJSScene(this.mainScene);
            
            const model = gltf.scene;
            
            // Добавляем базовое освещение
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            model.add(ambientLight);
            
            this.mainScene.add(model);
            this.mainModelObject = model;
            
            this.setupMainLighting();
            this.setupMainCamera(model);
            
            this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
            this.mainControls.enableDamping = true;
            this.mainControls.dampingFactor = 0.05;
            
            this.autoRotate = true;
            if (this.mainThreejs) {
                this.mainThreejs.hidden = false;
            }
            this.updateMainThreeJSSize();
            
            console.log('✅ GLB модель загружена в просмотрщик');
            resolve();
        }, 
        (progress) => {
            this.updateProgress((progress.loaded / progress.total) * 100);
        },
        (error) => {
            console.error('❌ Ошибка загрузки GLB:', error);
            reject(error);
        });
    }

    updateMainThreeJSSize() {
        if (!this.mainRenderer || !this.mainThreejs) return;
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

    handleResize() {
        this.updateMainThreeJSSize();
    }

    switchToViewer() {
        if (this.mainScreen) this.mainScreen.classList.remove('active');
        if (this.viewerScreen) this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        setTimeout(() => this.updateMainThreeJSSize(), 100);
        this.updateAutoRotateButton();
    }

    showMainScreen() {
        if (this.mainScreen) this.mainScreen.classList.add('active');
        if (this.viewerScreen) this.viewerScreen.classList.remove('active');
        this.currentState = APP_STATES.MAIN;
        
        this.autoRotate = false;
        if (this.mainModel) this.mainModel.autoRotate = false;
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        
        if (this.currentRenderer === 'model-viewer' && this.mainModel) {
            this.mainModel.autoRotate = this.autoRotate;
        }
        
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        if (!this.autoRotateBtn) return;
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
                this.mainControls.target.set(0, 0, 0);
                this.mainControls.update();
            }
            console.log('🎯 Камера сброшена');
        }
    }

    resetPreview() {
        this.showPreviewPlaceholder();
        this.hideAllRenderers();
        if (this.open3dBtn) this.open3dBtn.disabled = true;
        if (this.fileName) this.fileName.textContent = '';
        
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
        
        console.log('✅ Превью сброшено');
    }

    showLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('active');
        }
    }

    hideLoadingIndicator() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('active');
        }
        this.updateProgress(0);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем GLTFLoader если его нет
    if (!THREE.GLTFLoader && typeof GLTFLoader !== 'undefined') {
        THREE.GLTFLoader = GLTFLoader;
    }
    
    new ModelViewerApp();
});
