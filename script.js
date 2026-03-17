// script.js - СТАБИЛЬНАЯ ВЕРСИЯ

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
        
        // Конвертер в браузере
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
        
        // Простое освещение для превью
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.previewScene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1, 2, 1);
        this.previewScene.add(dirLight);
        
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
            setTimeout(resolve, 500);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            if (this.currentFileType === '.stl') {
                this.loadSTLPreview(this.currentFileURL, resolve, reject);
            } else {
                reject(new Error('Неподдерживаемый формат для Three.js'));
            }
        });
    }

    loadSTLPreview(url, resolve, reject) {
        console.log('Загрузка STL для превью:', url);
        
        const loader = new THREE.STLLoader();
        loader.load(url, 
            (geometry) => {
                console.log('STL геометрия загружена');
                
                this.clearThreeJSScene(this.previewScene);
                
                // Создаем материал и меш
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xCCCCCC,
                    roughness: 0.4,
                    metalness: 0.1,
                    emissive: 0x000000
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                this.previewScene.add(mesh);
                this.previewModelObject = mesh;
                
                // Центрируем модель
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.set(-center.x, -center.y, -center.z);
                
                // Настраиваем камеру
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                this.previewCamera.position.set(0, 0, maxDim * 2);
                this.previewCamera.lookAt(0, 0, 0);
                this.previewCamera.updateProjectionMatrix();
                
                // Показываем канвас
                if (this.previewThreejs) {
                    this.previewThreejs.hidden = false;
                }
                
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
                console.error('Ошибка загрузки STL:', error);
                reject(error);
            }
        );
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Рендер превью
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        
        // Рендер основного просмотрщика
        if (this.mainRenderer && this.mainScene && this.mainCamera) {
            if (this.autoRotate && this.mainModelObject) {
                this.mainModelObject.rotation.y += 0.005;
            }
            this.mainRenderer.render(this.mainScene, this.mainCamera);
            if (this.mainControls) this.mainControls.update();
        }
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        while(scene.children.length > 0) {
            const child = scene.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            scene.remove(child);
        }
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
            } else {
                reject(new Error('Неподдерживаемый формат'));
            }
        });
    }

    openSTLViewer(resolve, reject) {
        console.log('Загрузка STL для просмотра');
        
        const loader = new THREE.STLLoader();
        loader.load(this.currentFileURL, 
            (geometry) => {
                console.log('STL загружен');
                
                this.clearThreeJSScene(this.mainScene);
                
                // Материал
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xCCCCCC,
                    roughness: 0.3,
                    metalness: 0.1
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                this.mainScene.add(mesh);
                this.mainModelObject = mesh;
                
                // Освещение
                const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
                this.mainScene.add(ambientLight);
                
                const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
                dirLight.position.set(5, 10, 5);
                this.mainScene.add(dirLight);
                
                // Центрируем
                const box = new THREE.Box3().setFromObject(mesh);
                const center = box.getCenter(new THREE.Vector3());
                mesh.position.set(-center.x, -center.y, -center.z);
                
                // Камера
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                this.mainCamera.position.set(0, 0, maxDim * 2);
                this.mainCamera.lookAt(0, 0, 0);
                
                // Контролы
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.mainControls.dampingFactor = 0.05;
                
                this.autoRotate = true;
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                
                resolve();
            },
            (progress) => {
                this.updateProgress((progress.loaded / progress.total) * 100);
            },
            (error) => {
                console.error('Ошибка загрузки STL:', error);
                reject(error);
            }
        );
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
            const box = new THREE.Box3().setFromObject(this.mainModelObject);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            this.mainCamera.position.set(0, 0, maxDim * 2);
            this.mainCamera.lookAt(0, 0, 0);
            if (this.mainControls) {
                this.mainControls.target.set(0, 0, 0);
                this.mainControls.update();
            }
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
    new ModelViewerApp();
});
