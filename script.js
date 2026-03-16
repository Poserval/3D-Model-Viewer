// script.js - РАБОЧАЯ ВЕРСИЯ БЕЗ КОНВЕРТЕРА

const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

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
        
        // URL конвертера
        this.converterUrl = "https://твой-username.github.io/3d-converter/converter.html";
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        
        console.log('🚀 3D Model Viewer запущен');
    }

    initializeElements() {
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
        this.convertBtn = document.getElementById('convert-btn');

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
        
        // КНОПКА КОНВЕРТЕРА - открывает второе окно
        this.convertBtn.addEventListener('click', () => {
            this.openConverter();
        });
    }

    openConverter() {
        console.log('🌐 Открытие конвертера');
        
        // Пытаемся открыть в новом окне
        const converterWindow = window.open(this.converterUrl, '_blank');
        
        // Если не получилось (блокировщик всплывающих окон)
        if (!converterWindow) {
            if (confirm('Разрешить открыть конвертер в браузере?')) {
                window.location.href = this.converterUrl;
            }
        }
    }

    initThreeJS() {
        console.log('Инициализация Three.js...');
        
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ 
            canvas: this.mainThreejs,
            antialias: true,
            alpha: true
        });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);

        console.log('Three.js инициализирован');
        this.animate();
    }

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
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        
        lightsToRemove.forEach(light => {
            scene.remove(light);
            if (light.dispose) light.dispose();
        });
    }

    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) return 'model-viewer';
        if (RENDERER_FORMATS.THREE_JS.includes(extension)) return 'threejs';
        return null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
        }

        this.resetPreview();

        if (!this.validateFile(file)) return;

        this.currentFile = file;
        this.currentFileType = '.' + file.name.split('.').pop().toLowerCase();
        this.currentRenderer = this.getRendererForFormat(this.currentFileType);
        
        if (!this.currentRenderer) {
            alert('❌ Неподдерживаемый формат');
            return;
        }

        this.currentFileURL = URL.createObjectURL(file);
        this.showPreview();
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`📁 Файл слишком большой\nМакс: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
            return false;
        }

        const validFormats = ['.glb', '.gltf', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert(`❌ Поддерживаются: ${validFormats.join(', ')}`);
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
            this.currentState = APP_STATES.PREVIEW;

        } catch (error) {
            console.error('❌ Ошибка:', error);
            alert('❌ ' + error.message);
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
            this.clearThreeJSScene(this.previewScene);
            this.previewModel.src = this.currentFileURL;
            this.previewModel.hidden = false;
            this.hidePreviewPlaceholder();
            setTimeout(resolve, 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();

            loader.load(this.currentFileURL, (geometry) => {
                this.clearThreeJSScene(this.previewScene);
                
                const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
                const modelObject = new THREE.Mesh(geometry, material);
                
                this.previewScene.add(modelObject);
                this.previewModelObject = modelObject;
                
                this.setupPreviewLighting();
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
                reject(error);
            });
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
            alert('❌ ' + error.message);
        }
    }

    async openModelViewer() {
        return new Promise((resolve) => {
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

            loader.load(this.currentFileURL, (geometry) => {
                this.clearThreeJSScene(this.mainScene);
                
                const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
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
                reject(error);
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
        this.resetPreview();
        this.autoRotate = false;
        if (this.mainModel) {
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

document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
