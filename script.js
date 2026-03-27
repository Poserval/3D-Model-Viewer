// script.js - ИСПРАВЛЕННАЯ ВЕРСИЯ (STL + OBJ + конвертер)

const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

const RENDERER_FORMATS = {
    MODEL_VIEWER: ['.glb', '.gltf'],
    THREE_JS: ['.stl', '.obj']
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
        
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewModelObject = null;
        
        this.mainScene = null;
        this.mainCamera = null;
        this.mainRenderer = null;
        this.mainModelObject = null;
        this.mainControls = null;
        
        this.lightsInitialized = false;
        this.orbitingLight = null;
        
        this.isCapacitor = window.Capacitor ? true : false;
        
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
        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        this.mainThreejs = document.getElementById('main-threejs');
        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
        this.converterBtn = document.getElementById('go-to-converter-btn');
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

        this.open3dBtn.addEventListener('click', () => this.openViewer());
        this.backBtn.addEventListener('click', () => this.showMainScreen());
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        window.addEventListener('resize', () => this.handleResize());
        
        // КНОПКА КОНВЕРТЕРА — ЗАМЕНИ ССЫЛКУ НА РЕАЛЬНУЮ!
        if (this.converterBtn) {
            this.converterBtn.addEventListener('click', () => {
                window.open('https://ТВОЯ-ССЫЛКА-НА-КОНВЕРТЕР', '_blank');
            });
        }
    }

    async selectFileCapacitor() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.glb,.gltf,.obj,.stl';
            input.style.display = 'none';
            document.body.appendChild(input);
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) this.processSelectedFile(file);
                document.body.removeChild(input);
            };
            input.click();
        } catch (error) {
            console.error('❌ Ошибка выбора файла:', error);
        }
    }

    processSelectedFile(file) {
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

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) this.processSelectedFile(file);
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`Файл слишком большой: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
            return false;
        }
        const validFormats = ['.glb', '.gltf', '.obj', '.stl'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!validFormats.includes(ext)) {
            alert(`Неподдерживаемый формат: ${ext}`);
            return false;
        }
        return true;
    }

    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) return 'model-viewer';
        if (RENDERER_FORMATS.THREE_JS.includes(extension)) return 'threejs';
        return null;
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
            console.error('❌ Ошибка превью:', error);
            alert('Ошибка при обработке файла:\n' + error.message);
            this.resetPreview();
        }
    }

    hidePreviewPlaceholder() {
        if (this.previewPlaceholder) this.previewPlaceholder.style.display = 'none';
    }

    showPreviewPlaceholder() {
        if (this.previewPlaceholder) this.previewPlaceholder.style.display = 'flex';
    }

    async loadModelViewerPreview() {
        return new Promise((resolve) => {
            this.clearThreeJSScene(this.previewScene);
            this.previewModel.src = this.currentFileURL;
            this.previewModel.hidden = false;
            this.hidePreviewPlaceholder();
            setTimeout(() => resolve(), 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            let loader;
            if (this.currentFileType === '.stl') {
                loader = new THREE.STLLoader();
            } else if (this.currentFileType === '.obj') {
                loader = new THREE.OBJLoader();
            } else {
                reject(new Error('Неподдерживаемый формат'));
                return;
            }

            const onLoad = (object) => {
                this.clearThreeJSScene(this.previewScene);
                
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3 });
                    modelObject = new THREE.Mesh(object, material);
                } else {
                    modelObject = object;
                    modelObject.traverse(child => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3 });
                        }
                    });
                }
                
                this.previewScene.add(modelObject);
                this.previewModelObject = modelObject;
                this.setupPreviewLighting();
                this.setupPreviewCamera(modelObject);
                this.previewThreejs.hidden = false;
                this.hidePreviewPlaceholder();
                resolve();
            };

            if (this.currentFileType === '.stl') {
                loader.load(this.currentFileURL, onLoad, (p) => {
                    if (p.lengthComputable) this.updateProgress((p.loaded / p.total) * 100);
                }, reject);
            } else {
                loader.load(this.currentFileURL, onLoad, undefined, reject);
            }
        });
    }

    setupPreviewLighting() {
        const toRemove = [];
        this.previewScene.traverse(c => { if (c.isLight) toRemove.push(c); });
        toRemove.forEach(l => this.previewScene.remove(l));
        this.previewScene.add(new THREE.AmbientLight(0x404080, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(5, 10, 3);
        this.previewScene.add(dir);
        const point = new THREE.PointLight(0xffffff, 0.5, 50);
        point.position.set(0, 0, 8);
        this.previewScene.add(point);
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        object.position.set(-center.x, -center.y, -center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        let dist = Math.max(maxDim * 1.0, 1.5);
        dist = Math.min(dist, 8);
        this.previewCamera.position.set(0, 0, dist);
        this.previewCamera.lookAt(0, 0, 0);
    }

    initThreeJS() {
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ canvas: this.previewThreejs, antialias: true, alpha: true });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ canvas: this.mainThreejs, antialias: true });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);
        this.animate();
    }

    setupMainLighting() {
        if (this.lightsInitialized) return;
        this.mainScene.add(new THREE.AmbientLight(0x404080, 0.4));
        const dir = new THREE.DirectionalLight(0xffffff, 0.6);
        dir.position.set(10, 10, 5);
        this.mainScene.add(dir);
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.mainScene.add(this.orbitingLight);
        this.lightsInitialized = true;
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        object.position.set(-center.x, -center.y, -center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.mainCamera.fov * Math.PI / 180;
        let dist = maxDim / (2 * Math.tan(fov / 2));
        dist = Math.max(dist * 1.5, 1);
        dist = Math.min(dist, 10);
        this.mainCamera.position.set(0, 0, dist);
        this.mainCamera.lookAt(0, 0, 0);
        if (this.mainControls) {
            this.mainControls.minDistance = dist * 0.5;
            this.mainControls.maxDistance = dist * 3;
            this.mainControls.reset();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.previewRenderer) this.previewRenderer.render(this.previewScene, this.previewCamera);
        if (this.mainRenderer) {
            if (this.orbitingLight && this.autoRotate) {
                const t = Date.now() * 0.001;
                this.orbitingLight.position.set(Math.cos(t * 0.5) * 8, 4 + Math.sin(t * 0.3) * 2, Math.sin(t * 0.5) * 8);
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
        const toRemove = [];
        scene.traverse(c => { if (c.isMesh) toRemove.push(c); });
        toRemove.forEach(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); scene.remove(m); });
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
            if (this.currentRenderer === 'model-viewer') await this.openModelViewer();
            else if (this.currentRenderer === 'threejs') await this.openThreeJSViewer();
            this.hideLoadingIndicator();
            this.switchToViewer();
        } catch (error) {
            this.hideLoadingIndicator();
            alert('Ошибка при открытии модели:\n' + error.message);
        }
    }

    async openModelViewer() {
        return new Promise((resolve) => {
            this.clearThreeJSScene(this.mainScene);
            if (this.mainControls) this.mainControls.dispose();
            this.mainModel.src = this.currentFileURL;
            this.mainModel.autoRotate = true;
            this.mainModel.hidden = false;
            setTimeout(() => resolve(), 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            let loader;
            if (this.currentFileType === '.stl') {
                loader = new THREE.STLLoader();
            } else if (this.currentFileType === '.obj') {
                loader = new THREE.OBJLoader();
            } else {
                reject(new Error('Неподдерживаемый формат'));
                return;
            }

            const onLoad = (object) => {
                this.clearThreeJSScene(this.mainScene);
                let modelObject;
                if (this.currentFileType === '.stl') {
                    const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3 });
                    modelObject = new THREE.Mesh(object, material);
                } else {
                    modelObject = object;
                    modelObject.traverse(child => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3 });
                        }
                    });
                }
                this.mainScene.add(modelObject);
                this.mainModelObject = modelObject;
                this.setupMainLighting();
                this.setupMainCamera(modelObject);
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.autoRotate = true;
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                resolve();
            };

            if (this.currentFileType === '.stl') {
                loader.load(this.currentFileURL, onLoad, (p) => {
                    this.updateProgress((p.loaded / p.total) * 100);
                }, reject);
            } else {
                loader.load(this.currentFileURL, onLoad, undefined, reject);
            }
        });
    }

    updateMainThreeJSSize() {
        if (this.mainRenderer && this.mainThreejs) {
            const container = this.mainThreejs.parentElement;
            if (container) {
                const w = container.clientWidth, h = container.clientHeight;
                this.mainRenderer.setSize(w, h);
                this.mainCamera.aspect = w / h;
                this.mainCamera.updateProjectionMatrix();
            }
        }
    }

    handleResize() { this.updateMainThreeJSSize(); }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        setTimeout(() => this.updateMainThreeJSSize(), 100);
        this.updateAutoRotateButton();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        if (this.currentRenderer === 'model-viewer' && this.mainModel) this.mainModel.autoRotate = this.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        this.autoRotateBtn.innerHTML = this.autoRotate ? '⏸️ Автоповорот' : '▶️ Автоповорот';
        this.autoRotateBtn.setAttribute('data-active', this.autoRotate.toString());
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer' && this.mainModel) {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
        } else if (this.currentRenderer === 'threejs' && this.mainModelObject) {
            this.setupMainCamera(this.mainModelObject);
            if (this.mainControls) this.mainControls.reset();
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.resetPreview();
        this.autoRotate = false;
        if (this.mainModel) this.mainModel.autoRotate = false;
        this.lightsInitialized = false;
    }

    resetPreview() {
        this.showPreviewPlaceholder();
        this.hideAllRenderers();
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        if (this.currentFileURL) URL.revokeObjectURL(this.currentFileURL);
        this.currentFile = null;
        this.currentFileType = null;
        this.currentRenderer = null;
        this.clearThreeJSScene(this.previewScene);
        this.clearThreeJSScene(this.mainScene);
        if (this.mainControls) this.mainControls.dispose();
        this.lightsInitialized = false;
    }

    showLoadingIndicator() { if (this.loadingIndicator) this.loadingIndicator.classList.add('active'); }
    hideLoadingIndicator() { if (this.loadingIndicator) this.loadingIndicator.classList.remove('active'); this.updateProgress(0); }
}

document.addEventListener('DOMContentLoaded', () => new ModelViewerApp());
