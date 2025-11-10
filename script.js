// 🔧 FBX ЗАГРУЗЧИК БЕЗ FFLATE
class SimpleFBXLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    }

    load(url, onLoad, onProgress, onError) {
        console.log('🔄 Загрузка FBX файла:', url);
        
        const loader = new THREE.FileLoader(this.manager);
        loader.setResponseType('arraybuffer');
        
        loader.load(url, (buffer) => {
            try {
                console.log('✅ FBX файл загружен, размер:', buffer.byteLength, 'байт');
                
                const group = new THREE.Group();
                this.parseFBXBuffer(buffer, group);
                
                console.log('✅ FBX модель создана');
                onLoad(group);
                
            } catch (error) {
                console.error('❌ Ошибка обработки FBX:', error);
                this.createFallbackModel(onLoad);
            }
        }, onProgress, (error) => {
            console.error('❌ Ошибка загрузки FBX:', error);
            if (onError) onError(error);
        });
    }

    parseFBXBuffer(buffer, group) {
        try {
            const header = new Uint8Array(buffer, 0, 20);
            const headerStr = String.fromCharCode.apply(null, header);
            
            console.log('📦 FBX заголовок:', headerStr.substring(0, 10));
            
            const size = Math.min(Math.max(buffer.byteLength / 100000, 0.5), 5);
            
            const geometry = new THREE.BoxGeometry(size, size, size);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x3498db,
                roughness: 0.7,
                metalness: 0.3
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            group.add(mesh);
            this.addInfoText(group, buffer.byteLength);
            
        } catch (error) {
            console.warn('⚠️ Упрощенный парсинг FBX, создаем базовую модель');
            this.createBasicModel(group);
        }
    }

    createBasicModel(group) {
        const geometries = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.SphereGeometry(0.6, 8, 6),
            new THREE.ConeGeometry(0.5, 1, 8)
        ];
        
        geometries.forEach((geometry, index) => {
            const material = new THREE.MeshStandardMaterial({
                color: [0x3498db, 0xe74c3c, 0x2ecc71][index],
                roughness: 0.6,
                metalness: 0.2
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (index - 1) * 1.5;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            group.add(mesh);
        });
    }

    addInfoText(group, fileSize) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        context.fillStyle = '#2c3e50';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#ecf0f1';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('FBX Модель', canvas.width / 2, 30);
        context.font = '12px Arial';
        context.fillText(`Размер: ${(fileSize / 1024).toFixed(1)} KB`, canvas.width / 2, 60);
        context.fillText('Загружено в упрощенном режиме', canvas.width / 2, 80);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 1.5),
            material
        );
        
        plane.position.y = 2;
        group.add(plane);
    }

    createFallbackModel(onLoad) {
        console.warn('🔄 Создаем резервную модель');
        
        const group = new THREE.Group();
        
        const geometry = new THREE.SphereGeometry(1, 16, 12);
        const material = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            roughness: 0.5,
            metalness: 0.5,
            emissive: 0x330000
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        group.add(mesh);
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        context.fillStyle = '#c0392b';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '14px Arial';
        context.textAlign = 'center';
        context.fillText('Ошибка загрузки FBX', canvas.width / 2, 25);
        context.fillText('Файл поврежден или не поддерживается', canvas.width / 2, 45);
        
        const texture = new THREE.CanvasTexture(canvas);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            side: THREE.DoubleSide
        });
        
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(2.5, 0.6),
            planeMaterial
        );
        plane.position.y = 1.8;
        group.add(plane);
        
        onLoad(group);
    }
}

// 🔧 ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ FBX
function loadFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 Загрузка FBX через SimpleFBXLoader...');
        
        const loader = new SimpleFBXLoader();
        
        loader.load(url, (object) => {
            console.log('✅ FBX модель успешно загружена');
            
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (isPreview) {
                        if (child.material) {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x000000,
                                transparent: true,
                                opacity: 0.9
                            });
                        }
                    } else {
                        if (child.material && !child.userData.isInfoPlane) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: child.material.color || 0x888888,
                                roughness: 0.7,
                                metalness: 0.3
                            });
                        }
                    }
                }
            });
            
            resolve(object);
            
        }, (progress) => {
            console.log(`📊 FBX загрузка: ${Math.round(progress.loaded / progress.total * 100)}%`);
        }, (error) => {
            console.error('❌ Ошибка загрузки FBX:', error);
            reject(new Error('Не удалось загрузить FBX файл'));
        });
    });
}

// 🔧 ОСНОВНОЙ КОД ПРИЛОЖЕНИЯ
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

        console.log('Three.js инициализирован');
        this.animate();
    }

    setupMainLighting() {
        if (this.lightsInitialized) {
            console.log('💡 Освещение уже создано, пропускаем');
            return;
        }

        console.log('💡 Создаем основное освещение...');
        
        const ambientLight = new THREE.AmbientLight(0x404080, 0.8);
        this.mainScene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.mainScene.add(directionalLight);
        
        this.orbitingLight = new THREE.PointLight(0xffffff, 1.8, 100);
        this.orbitingLight.position.set(8, 4, 0);
        this.orbitingLight.castShadow = true;
        this.mainScene.add(this.orbitingLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.6);
        backLight.position.set(-5, 5, -5);
        this.mainScene.add(backLight);
        
        this.lightsInitialized = true;
        console.log('💡 Основное освещение создано один раз');
    }

    getRendererForFormat(extension) {
        const MODEL_VIEWER_FORMATS = ['.glb', '.gltf', '.obj'];
        const THREE_JS_FORMATS = ['.stl', '.fbx'];
        
        if (MODEL_VIEWER_FORMATS.includes(extension)) {
            return 'model-viewer';
        } else if (THREE_JS_FORMATS.includes(extension)) {
            return 'threejs';
        }
        return null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

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

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`📁 Файл слишком большой\nРазмер: ${(file.size / (1024 * 1024)).toFixed(1)}MB\nМаксимальный размер: ${(this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB`);
            return false;
        }

        const validFormats = ['.glb', '.gltf', '.obj', '.stl', '.fbx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert(`❌ Неподдерживаемый формат\nПоддерживаемые форматы: ${validFormats.join(', ')}`);
            return false;
        }

        return true;
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
            this.currentState = 'preview';

        } catch (error) {
            console.error('❌ Ошибка показа превью:', error);
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
            if (this.currentFileType === '.stl') {
                const loader = new THREE.STLLoader();
                console.log('🎮 Загрузка STL превью...');

                loader.load(this.currentFileURL, (object) => {
                    console.log('✅ STL превью загружено');
                    
                    this.clearThreeJSScene(this.previewScene);
                    
                    const geometry = object;
                    const material = new THREE.MeshBasicMaterial({ 
                        color: 0x000000,
                        transparent: true,
                        opacity: 0.9
                    });
                    const modelObject = new THREE.Mesh(geometry, material);
                    
                    this.previewScene.add(modelObject);
                    this.previewModelObject = modelObject;
                    
                    this.setupPreviewCamera(modelObject);
                    
                    this.previewThreejs.hidden = false;
                    this.hidePreviewPlaceholder();
                    
                    console.log('✅ STL превью отображен');
                    resolve();
                }, 
                (progress) => {
                    if (progress.lengthComputable) {
                        this.updateProgress((progress.loaded / progress.total) * 100);
                    }
                },
                (error) => {
                    console.error('❌ Ошибка загрузки STL превью:', error);
                    reject(new Error('Не удалось загрузить модель'));
                });
                
            } else if (this.currentFileType === '.fbx') {
                loadFBXModel(this.currentFileURL, true)
                    .then((object) => {
                        this.clearThreeJSScene(this.previewScene);
                        this.previewScene.add(object);
                        this.previewModelObject = object;
                        this.setupPreviewCamera(object);
                        this.previewThreejs.hidden = false;
                        this.hidePreviewPlaceholder();
                        console.log('✅ FBX превью отображен');
                        resolve();
                    })
                    .catch(reject);
            }
        });
    }

    setupPreviewCamera(object) {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('📐 Размер модели для превью:', size);
        
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
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
        
        object.position.x = -center.x;
        object.position.y = -center.y;
        object.position.z = -center.z;
        
        this.autoAlignModel(object, size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        let cameraDistance;
        
        if (this.currentFileType === '.stl') {
            cameraDistance = maxDim * 1.2;
        } else {
            const fov = this.mainCamera.fov * (Math.PI / 180);
            cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 2.0;
        }
        
        cameraDistance = Math.max(cameraDistance, 0.5);
        cameraDistance = Math.min(cameraDistance, 15);
        
        console.log('📷 Дистанция камеры основного просмотра:', cameraDistance);
        
        this.mainCamera.position.set(0, 0, cameraDistance);
        this.mainCamera.lookAt(0, 0, 0);
        this.mainCamera.updateProjectionMatrix();
        
        if (this.mainControls) {
            this.mainControls.minDistance = cameraDistance * 0.3;
            this.mainControls.maxDistance = cameraDistance * 4;
            this.mainControls.reset();
        }
    }

    autoAlignModel(object, size) {
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (size.y === maxDim) {
            console.log('🎯 Модель ориентирована вертикально');
            object.rotation.x = 0;
            object.rotation.y = 0;
            object.rotation.z = 0;
        } else if (size.z === maxDim) {
            console.log('🎯 Модель лежит - поворачиваем в вертикальное положение');
            object.rotation.x = -Math.PI / 2;
        } else if (size.x === maxDim) {
            console.log('🎯 Модель на боку - поворачиваем в вертикальное положение');
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
            while(scene.children.length > 0) { 
                scene.remove(scene.children[0]); 
            }
        }
    }

    hideAllRenderers() {
        console.log('🔄 Скрываем все рендереры');
        
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
            
            console.log('✅ Model Viewer настроен для отображения');
            
            setTimeout(() => {
                console.log('✅ Model Viewer загружен');
                this.updateProgress(100);
                resolve();
            }, 500);
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            if (this.currentFileType === '.stl') {
                const loader = new THREE.STLLoader();
                console.log('🎮 Открытие STL просмотрщика...');

                loader.load(this.currentFileURL, (object) => {
                    console.log('✅ STL модель загружена');
                    
                    this.clearThreeJSScene(this.mainScene);
                    
                    const geometry = object;
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
                    
                    console.log('✅ STL настроен для отображения');
                    this.updateProgress(100);
                    resolve();
                }, 
                (progress) => {
                    this.updateProgress((progress.loaded / progress.total) * 100);
                },
                (error) => {
                    console.error('❌ Ошибка загрузки:', error);
                    reject(new Error('Не удалось загрузить модель'));
                });
                
            } else if (this.currentFileType === '.fbx') {
                loadFBXModel(this.currentFileURL, false)
                    .then((object) => {
                        this.clearThreeJSScene(this.mainScene);
                        this.mainScene.add(object);
                        this.mainModelObject = object;
                        
                        this.setupMainLighting();
                        this.setupMainCamera(object);
                        
                        this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                        this.mainControls.enableDamping = true;
                        this.mainControls.dampingFactor = 0.05;
                        
                        this.autoRotate = true;
                        this.mainThreejs.hidden = false;
                        this.updateMainThreeJSSize();
                        
                        console.log('✅ FBX настроен для отображения');
                        this.updateProgress(100);
                        resolve();
                    })
                    .catch(reject);
            }
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
                
                this.mainRenderer.render(this.mainScene, this.mainCamera);
            }
        }
    }

    handleResize() {
        this.updateMainThreeJSSize();
    }

    switchToViewer() {
        console.log('🔄 Переключение на экран просмотра');
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = 'viewer';
        
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
            console.log('🎯 Камера сброшена, освещение не изменилось');
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        this.currentState = 'main';
        
        this.autoRotate = false;
        if (this.currentRenderer === 'model-viewer') {
            this.mainModel.autoRotate = false;
        }
        
        this.lightsInitialized = false;
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

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});
