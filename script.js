class ModelViewerApp {
    constructor() {
        this.currentState = 'main';
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
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.bindEvents();
        this.initThreeJS();
        console.log('3D Viewer запущен');
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

        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.previewThreejs = document.getElementById('preview-threejs');
        this.mainThreejs = document.getElementById('main-threejs');

        this.loadingIndicator = document.getElementById('loading-indicator');
        this.progressFill = document.querySelector('.progress-fill');
        this.progressText = document.querySelector('.progress-text');
    }

    bindEvents() {
        this.selectFileBtn.addEventListener('click', () => {
            // Пытаемся использовать нативный выбор файла, если доступен
            if (window.Capacitor && Capacitor.getPlatform() === 'android') {
                this.pickFileWithCapacitor();
            } else {
                this.fileInput.click();
            }
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

    async pickFileWithCapacitor() {
        try {
            const { Filesystem } = Capacitor.Plugins;
            const result = await Filesystem.chooseFile({
                types: ['*/*'],
                multiple: false
            });

            if (!result || !result.files || !result.files[0]) return;

            const fileData = result.files[0];
            const blob = new Blob([fileData.data], { type: fileData.mimeType });
            const file = new File([blob], fileData.name, { type: fileData.mimeType });

            const fakeEvent = { target: { files: [file] } };
            this.handleFileSelect(fakeEvent);
        } catch (err) {
            console.warn('Capacitor FilePicker не сработал, используем fallback', err);
            this.fileInput.click();
        }
    }

    initThreeJS() {
        this.previewScene = new THREE.Scene();
        this.previewCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.previewRenderer = new THREE.WebGLRenderer({ 
            canvas: this.previewThreejs,
            antialias: true,
            alpha: true
        });
        this.previewRenderer.setSize(200, 200);
        this.previewRenderer.setClearColor(0x000000, 0);
        
        const previewAmbient = new THREE.AmbientLight(0xffffff, 1.0);
        this.previewScene.add(previewAmbient);
        
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

        this.animate();
    }

    setupPreviewLighting() {
        const lightsToRemove = [];
        this.previewScene.traverse((child) => {
            if (child.isLight) lightsToRemove.push(child);
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
    }

    setupMainLighting() {
        if (this.lightsInitialized) return;

        const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        this.mainScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 10, 5);
        this.mainScene.add(directionalLight);
        
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.2, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.mainScene.add(this.orbitingLight);
        
        this.lightsInitialized = true;
    }

    getRendererForFormat(extension) {
        const MODEL_VIEWER = ['.glb', '.gltf', '.obj'];
        const THREE_JS = ['.stl'];
        if (MODEL_VIEWER.includes(extension)) return 'model-viewer';
        if (THREE_JS.includes(extension)) return 'threejs';
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
            this.currentState = 'preview';
        } catch (error) {
            console.error('Ошибка показа превью:', error);
            alert('Ошибка при обработке файла: ' + error.message);
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
            setTimeout(() => resolve(), 1000);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(this.currentFileURL, (geometry) => {
                this.clearThreeJSScene(this.previewScene);
                const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
                const modelObject = new THREE.Mesh(geometry, material);
                this.previewScene.add(modelObject);
                this.previewModelObject = modelObject;
                this.setupPreviewLighting();
                this.setupPreviewCamera(modelObject);
                this.previewThreejs.hidden = false;
                resolve();
            }, null, reject);
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        object.position.set(-center.x, -center.y, -center.z);
        this.autoAlignModel(object, size);
        const maxDim = Math.max(size.x, size.y, size.z);
        let dist = maxDim * 1.0;
        dist = Math.min(Math.max(dist, 1.5), 8);
        this.previewCamera.position.set(0, 0, dist);
        this.previewCamera.lookAt(0, 0, 0);
    }

    setupMainCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        object.position.set(-center.x, -center.y, -center.z);
        this.autoAlignModel(object, size);
        const maxDim = Math.max(size.x, size.y, size.z);
        let dist = maxDim / (2 * Math.tan(this.mainCamera.fov * Math.PI / 360));
        dist = Math.min(Math.max(dist * 1.5, 1), 10);
        this.mainCamera.position.set(0, 0, dist);
        this.mainCamera.lookAt(0, 0, 0);
        if (this.mainControls) {
            this.mainControls.minDistance = dist * 0.5;
            this.mainControls.maxDistance = dist * 3;
            this.mainControls.reset();
        }
    }

    autoAlignModel(object, size) {
        const maxDim = Math.max(size.x, size.y, size.z);
        if (size.y === maxDim) return;
        if (size.z === maxDim) object.rotation.x = -Math.PI / 2;
        else if (size.x === maxDim) object.rotation.z = -Math.PI / 2;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.previewRenderer && this.previewScene && this.previewCamera) {
            this.previewRenderer.render(this.previewScene, this.previewCamera);
        }
        if (this.mainRenderer && this.mainScene && this.mainCamera) {
            if (this.orbitingLight && this.autoRotate) {
                const t = Date.now() * 0.001;
                this.orbitingLight.position.x = Math.cos(t * 0.5) * 8;
                this.orbitingLight.position.z = Math.sin(t * 0.5) * 8;
                this.orbitingLight.position.y = 4 + Math.sin(t * 0.3) * 2;
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
        scene.traverse(child => { if (child.isMesh) toRemove.push(child); });
        toRemove.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
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
                await this.openModelViewer();
            } else {
                await this.openThreeJSViewer();
            }
            this.hideLoadingIndicator();
            this.switchToViewer();
        } catch (error) {
            this.hideLoadingIndicator();
            alert('Ошибка при открытии модели: ' + error.message);
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
            setTimeout(() => resolve(), 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.STLLoader();
            loader.load(this.currentFileURL, (geometry) => {
                this.clearThreeJSScene(this.mainScene);
                const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
                const model = new THREE.Mesh(geometry, material);
                this.mainScene.add(model);
                this.mainModelObject = model;
                this.setupMainLighting();
                this.setupMainCamera(model);
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.autoRotate = true;
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                resolve();
            }, null, reject);
        });
    }

    updateMainThreeJSSize() {
        if (this.mainRenderer && this.mainThreejs) {
            const container = this.mainThreejs.parentElement;
            if (container) {
                const w = container.clientWidth;
                const h = container.clientHeight;
                this.mainRenderer.setSize(w, h);
                this.mainCamera.aspect = w / h;
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
        setTimeout(() => this.updateMainThreeJSSize(), 100);
        this.updateAutoRotateButton();
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        if (this.currentRenderer === 'model-viewer') this.mainModel.autoRotate = this.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        this.autoRotateBtn.setAttribute('data-active', this.autoRotate);
        this.autoRotateBtn.innerHTML = this.autoRotate ? '⏸️ Автоповорот' : '▶️ Автоповорот';
    }

    resetCamera() {
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
        } else if (this.mainModelObject) {
            this.setupMainCamera(this.mainModelObject);
            if (this.mainControls) this.mainControls.reset();
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.autoRotate = false;
        if (this.currentRenderer === 'model-viewer') this.mainModel.autoRotate = false;
        this.resetPreview();
        this.lightsInitialized = false;
    }

    resetPreview() {
        this.showPreviewPlaceholder();
        this.hideAllRenderers();
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        if (this.currentFileURL) URL.revokeObjectURL(this.currentFileURL);
        this.currentFileURL = null;
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
    window.app = new ModelViewerApp();
});
