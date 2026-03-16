// script.js - РАБОЧАЯ ВЕРСИЯ ТОЛЬКО ДЛЯ ПРОСМОТРА

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
        
        this.previewScene = null;
        this.previewCamera = null;
        this.previewRenderer = null;
        this.previewModelObject = null;
        
        this.mainScene = null;
        this.mainCamera = null;
        this.mainRenderer = null;
        this.mainModelObject = null;
        this.mainControls = null;
        
        this.previewLightsInitialized = false;
        this.mainLightsInitialized = false;
        this.orbitingLight = null;
        
        this.converterUrl = "https://твой-сайт.github.io/converter.html"; // ЗАМЕНИТЬ НА РЕАЛЬНЫЙ URL
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        console.log('🚀 3D Viewer запущен');
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

        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        this.mainThreejs = document.getElementById('main-threejs');

        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
    }

    bindEvents() {
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.open3dBtn.addEventListener('click', () => this.openViewer());
        this.backBtn.addEventListener('click', () => this.showMainScreen());
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        window.addEventListener('resize', () => this.handleResize());
        
        // КНОПКА КОНВЕРТЕРА - открывает браузер
        this.convertBtn.addEventListener('click', () => {
            window.open(this.converterUrl, '_blank');
        });
    }

    initThreeJS() {
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ canvas: this.previewThreejs, antialias: true, alpha: true });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        this.mainScene = new THREE.Scene();
        this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.mainRenderer = new THREE.WebGLRenderer({ canvas: this.mainThreejs, antialias: true, alpha: true });
        this.mainRenderer.setClearColor(0x222222, 1);
        
        this.previewCamera.position.set(0, 0, 5);
        this.mainCamera.position.set(0, 0, 5);
        
        this.animate();
    }

    setupPreviewLighting() {
        if (this.previewLightsInitialized) return;
        this.removeAllLights(this.previewScene);
        this.previewScene.add(new THREE.AmbientLight(0x404080, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 3);
        this.previewScene.add(dirLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
        pointLight.position.set(0, 0, 8);
        this.previewScene.add(pointLight);
        this.previewLightsInitialized = true;
    }

    setupMainLighting() {
        if (this.mainLightsInitialized) return;
        this.removeAllLights(this.mainScene);
        this.mainScene.add(new THREE.AmbientLight(0x404080, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 10, 5);
        this.mainScene.add(dirLight);
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.mainScene.add(this.orbitingLight);
        this.mainLightsInitialized = true;
    }

    removeAllLights(scene) {
        const lights = [];
        scene.traverse(c => c.isLight && lights.push(c));
        lights.forEach(l => scene.remove(l));
    }

    getRendererForFormat(ext) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(ext)) return 'model-viewer';
        if (RENDERER_FORMATS.THREE_JS.includes(ext)) return 'threejs';
        return null;
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (this.currentFileURL) URL.revokeObjectURL(this.currentFileURL);
        this.resetPreview();
        if (!this.validateFile(file)) return;
        this.currentFile = file;
        this.currentFileType = '.' + file.name.split('.').pop().toLowerCase();
        this.currentRenderer = this.getRendererForFormat(this.currentFileType);
        if (!this.currentRenderer) return alert('❌ Неподдерживаемый формат');
        this.currentFileURL = URL.createObjectURL(file);
        this.showPreview();
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`📁 Максимальный размер: ${this.MAX_FILE_SIZE/1024/1024}MB`);
            return false;
        }
        const valid = ['.glb', '.gltf', '.obj', '.stl'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!valid.includes(ext)) {
            alert(`❌ Поддерживаются: ${valid.join(', ')}`);
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
                this.previewModel.src = this.currentFileURL;
                this.previewModel.hidden = false;
            } else {
                await this.loadThreeJSPreview();
            }
            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;
        } catch (error) {
            alert('❌ ' + error.message);
            this.resetPreview();
        }
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            new THREE.STLLoader().load(this.currentFileURL, (geo) => {
                this.clearThreeJSScene(this.previewScene);
                const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xCCCCCC }));
                this.previewScene.add(mesh);
                this.previewModelObject = mesh;
                this.setupPreviewLighting();
                this.setupPreviewCamera(mesh);
                this.previewThreejs.hidden = false;
                this.hidePreviewPlaceholder();
                resolve();
            }, (p) => {
                if (p.lengthComputable) this.updateProgress((p.loaded / p.total) * 100);
            }, reject);
        });
    }

    setupPreviewCamera(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        obj.position.set(-center.x, -center.y, -center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(maxDim * 1.5, 2);
        this.previewCamera.position.set(0, 0, dist);
        this.previewCamera.lookAt(0, 0, 0);
        this.previewCamera.updateProjectionMatrix();
    }

    setupMainCamera(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        obj.position.set(-center.x, -center.y, -center.z);
        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = Math.max(maxDim * 1.8, 2);
        this.mainCamera.position.set(0, 0, dist);
        this.mainCamera.lookAt(0, 0, 0);
        this.mainCamera.updateProjectionMatrix();
        if (this.mainControls) {
            this.mainControls.minDistance = dist * 0.5;
            this.mainControls.maxDistance = dist * 3;
            this.mainControls.reset();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.previewRenderer && this.previewScene && this.previewCamera)
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        if (this.mainRenderer && this.mainScene && this.mainCamera) {
            if (this.orbitingLight && this.autoRotate) {
                const t = Date.now() * 0.001;
                this.orbitingLight.position.set(Math.cos(t*0.5)*8, 4+Math.sin(t*0.3)*2, Math.sin(t*0.5)*8);
            }
            if (this.autoRotate && this.mainModelObject && this.currentRenderer === 'threejs')
                this.mainModelObject.rotation.y += 0.01;
            this.mainRenderer.render(this.mainScene, this.mainCamera);
            if (this.mainControls) this.mainControls.update();
        }
    }

    clearThreeJSScene(scene) {
        if (!scene) return;
        const toRemove = [];
        scene.traverse(c => c.isMesh && toRemove.push(c));
        toRemove.forEach(obj => {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material?.dispose();
            scene.remove(obj);
        });
    }

    hideAllRenderers() {
        this.previewModel.hidden = true;
        this.previewThreejs.hidden = true;
        this.mainModel.hidden = true;
        this.mainThreejs.hidden = true;
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
                this.mainModel.src = this.currentFileURL;
                this.mainModel.autoRotate = true;
                this.mainModel.hidden = false;
            } else {
                await this.openThreeJSViewer();
            }
            this.hideLoadingIndicator();
            this.switchToViewer();
        } catch (error) {
            this.hideLoadingIndicator();
            alert('❌ ' + error.message);
        }
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            new THREE.STLLoader().load(this.currentFileURL, (geo) => {
                this.clearThreeJSScene(this.mainScene);
                const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xCCCCCC }));
                this.mainScene.add(mesh);
                this.mainModelObject = mesh;
                this.setupMainLighting();
                this.setupMainCamera(mesh);
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.mainControls.dampingFactor = 0.05;
                this.autoRotate = true;
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                this.updateProgress(100);
                resolve();
            }, (p) => {
                this.updateProgress((p.loaded / p.total) * 100);
            }, reject);
        });
    }

    updateMainThreeJSSize() {
        if (!this.mainRenderer || !this.mainThreejs) return;
        const container = this.mainThreejs.parentElement;
        if (container) {
            const w = container.clientWidth, h = container.clientHeight;
            this.mainRenderer.setSize(w, h);
            this.mainCamera.aspect = w / h;
            this.mainCamera.updateProjectionMatrix();
            this.mainRenderer.render(this.mainScene, this.mainCamera);
        }
    }

    handleResize() { this.updateMainThreeJSSize(); }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        setTimeout(() => this.updateMainThreeJSSize(), 100);
        this.updateAutoRotateButton();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        if (this.currentRenderer === 'model-viewer' && this.mainModel)
            this.mainModel.autoRotate = this.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        const a = this.autoRotate;
        this.autoRotateBtn.setAttribute('data-active', a.toString());
        this.autoRotateBtn.innerHTML = a ? '⏸️ Автоповорот' : '▶️ Автоповорот';
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
        } else if (this.mainModelObject) {
            this.setupMainCamera(this.mainModelObject);
            this.mainControls?.reset();
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.currentState = APP_STATES.MAIN;
        this.resetPreview();
        this.autoRotate = false;
        if (this.mainModel) this.mainModel.autoRotate = false;
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

    hidePreviewPlaceholder() { this.previewPlaceholder.style.display = 'none'; }
    showPreviewPlaceholder() { this.previewPlaceholder.style.display = 'flex'; }
    showLoadingIndicator() { this.loadingIndicator.classList.add('active'); }
    hideLoadingIndicator() { this.loadingIndicator.classList.remove('active'); this.updateProgress(0); }
}

document.addEventListener('DOMContentLoaded', () => new ModelViewerApp());
