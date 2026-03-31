// script.js - ПОЛНАЯ ВЕРСИЯ С ТУТОРИАЛОМ И ДУБЛЕРОМ

// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

// Форматы для каждого рендерера
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
        
        // Загрузчики
        this.stlLoader = new THREE.STLLoader();
        this.objLoader = new THREE.OBJLoader();
        
        // КНОПКА КОНВЕРТЕРА
        this.converterBtn = null;
        
        // Дублер выбора файла
        this.forceFileInput = null;
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.createForceFileInput();
        this.bindEvents();
        
        this.checkWebGLSupport();
        this.initThreeJS();
        
        // 🔥 ПРОВЕРЯЕМ ПЕРВЫЙ ЗАПУСК
        this.checkFirstLaunch();
        
        console.log('🚀 3D Model Viewer запущен');
        console.log('📱 User Agent:', navigator.userAgent);
        console.log('📁 Поддерживаемые форматы: .glb, .gltf, .obj, .stl');
    }
    
    // 🔥 СОЗДАЁМ СКРЫТЫЙ input ДЛЯ ДУБЛИРОВАНИЯ
    createForceFileInput() {
        this.forceFileInput = document.createElement('input');
        this.forceFileInput.type = 'file';
        this.forceFileInput.accept = '.glb,.gltf,.obj,.stl';
        this.forceFileInput.style.display = 'none';
        document.body.appendChild(this.forceFileInput);
        
        this.forceFileInput.addEventListener('change', (e) => {
            console.log('🔄 Выбор файла через дублер');
            this.handleFileSelect(e);
        });
    }
    
    // 🔥 ПРОВЕРКА ПЕРВОГО ЗАПУСКА
    checkFirstLaunch() {
        const tutorialShown = localStorage.getItem('tutorialShown_3dviewer');
        if (!tutorialShown) {
            setTimeout(() => {
                this.showTutorialStep1();
            }, 800);
        }
    }
    
    // 🔥 ТУТОРИАЛ - ШАГ 1 (ВЫБОР ФАЙЛА)
    showTutorialStep1() {
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.75)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.backdropFilter = 'blur(5px)';
        
        const content = document.createElement('div');
        content.style.backgroundColor = '#fff';
        content.style.borderRadius = '24px';
        content.style.padding = '24px 20px';
        content.style.maxWidth = '300px';
        content.style.textAlign = 'center';
        content.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        content.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">📁</div>
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #1a1a1a;">Как открыть модель</div>
            <div style="font-size: 15px; color: #444; margin-bottom: 20px; line-height: 1.4;">
                Нажмите <strong>«ВЫБРАТЬ ФАЙЛ»</strong> или <strong>на область с моделью</strong>
            </div>
            <div style="background: #f0f0f0; border-radius: 16px; padding: 12px; margin-bottom: 20px;">
                <div style="font-size: 13px; color: #666;">📁 Поддерживаемые форматы</div>
                <div style="font-size: 14px; font-weight: 600; color: #007AFF; margin-top: 4px;">GLB • GLTF • OBJ • STL</div>
            </div>
            <button id="tutorial-next-btn" style="background: #007AFF; color: white; border: none; padding: 14px 24px; border-radius: 40px; font-size: 16px; font-weight: 600; width: 100%; cursor: pointer;">Понятно, дальше →</button>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        document.getElementById('tutorial-next-btn').addEventListener('click', () => {
            overlay.remove();
            this.showTutorialStep2();
        });
    }
    
    // 🔥 ТУТОРИАЛ - ШАГ 2 (КОНВЕРТЕР)
    showTutorialStep2() {
        const overlay = document.createElement('div');
        overlay.id = 'tutorial-overlay-2';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.75)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.backdropFilter = 'blur(5px)';
        
        const content = document.createElement('div');
        content.style.backgroundColor = '#fff';
        content.style.borderRadius = '24px';
        content.style.padding = '24px 20px';
        content.style.maxWidth = '300px';
        content.style.textAlign = 'center';
        content.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 12px;">🔄</div>
            <div style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #1a1a1a;">Конвертер форматов</div>
            <div style="font-size: 15px; color: #444; margin-bottom: 20px; line-height: 1.4;">
                Нажмите <strong>«КОНВЕРТЕР (ОНЛАЙН)»</strong>, чтобы изменить формат 3D-модели
            </div>
            <div style="background: #f0f0f0; border-radius: 16px; padding: 12px; margin-bottom: 20px;">
                <div style="font-size: 13px; color: #666;">🔄 Доступные конвертации</div>
                <div style="font-size: 14px; font-weight: 600; color: #007AFF; margin-top: 4px;">STL ↔ OBJ ↔ GLB ↔ GLTF</div>
            </div>
            <button id="tutorial-finish-btn" style="background: #007AFF; color: white; border: none; padding: 14px 24px; border-radius: 40px; font-size: 16px; font-weight: 600; width: 100%; cursor: pointer;">Начать работу →</button>
        `;
        
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        document.getElementById('tutorial-finish-btn').addEventListener('click', () => {
            overlay.remove();
            localStorage.setItem('tutorialShown_3dviewer', 'true');
        });
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                console.warn('⚠️ WebGL не поддерживается на этом устройстве');
            } else {
                console.log('✅ WebGL поддерживается');
            }
        } catch(e) {
            console.warn('⚠️ Ошибка проверки WebGL:', e);
        }
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
        
        this.converterBtn = document.getElementById('go-to-converter-btn');
    }

    bindEvents() {
        // Основная кнопка
        this.selectFileBtn.addEventListener('click', () => {
            console.log('🖱️ Клик по кнопке ВЫБРАТЬ ФАЙЛ');
            this.fileInput.click();
        });
        
        // 🔥 ДУБЛЕР - клик по области превью
        if (this.previewArea) {
            this.previewArea.addEventListener('click', () => {
                console.log('🖱️ Клик по области превью');
                if (this.forceFileInput) {
                    this.forceFileInput.click();
                } else {
                    this.fileInput.click();
                }
            });
        }

        // Основной input
        this.fileInput.addEventListener('change', (e) => {
            console.log('📁 Основной input');
            this.handleFileSelect(e);
        });
        
        // Дублер input
        if (this.forceFileInput) {
            this.forceFileInput.addEventListener('change', (e) => {
                console.log('📁 Дублер input');
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
        
        if (this.converterBtn) {
            this.converterBtn.addEventListener('click', () => {
                this.openConverterInBrowser();
            });
        }
    }
    
    openConverterInBrowser() {
        const converterUrl = 'https://poserval.github.io/3D-Model-Viewer/converter.html';
        let fullUrl = converterUrl;
        
        if (this.currentFile) {
            const fileData = {
                name: this.currentFile.name,
                size: this.currentFile.size,
                type: this.currentFile.type,
                lastModified: this.currentFile.lastModified
            };
            const fileDataStr = JSON.stringify(fileData);
            const fileDataBase64 = btoa(unescape(encodeURIComponent(fileDataStr)));
            fullUrl += '?file=' + encodeURIComponent(this.currentFile.name) + 
                       '&data=' + encodeURIComponent(fileDataBase64);
        }
        
        console.log('🌐 Открываем конвертер');
        
        if (window.Capacitor && window.Capacitor.isNative) {
            window.open(fullUrl, '_system');
        } else {
            window.open(fullUrl, '_blank');
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
        this.previewRenderer.setSize(300, 300);
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

    setupPreviewLighting() {
        if (this.previewLightsInitialized) return;
        console.log('💡 Освещение превью');
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
        console.log('💡 Основное освещение');
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
            if (child.isLight) lightsToRemove.push(child);
        });
        lightsToRemove.forEach(light => scene.remove(light));
    }

    getRendererForFormat(extension) {
        if (RENDERER_FORMATS.MODEL_VIEWER.includes(extension)) return 'model-viewer';
        if (RENDERER_FORMATS.THREE_JS.includes(extension)) return 'threejs';
        return null;
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📁 Выбран файл:', file.name);
        console.log('📏 Тип MIME:', file.type);
        console.log('📦 Размер:', file.size);
        
        if (!file || file.size === 0) {
            alert('❌ Файл не может быть прочитан');
            return;
        }
        
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const validExts = ['.glb', '.gltf', '.obj', '.stl'];
        
        if (!validExts.includes(ext)) {
            alert(`❌ Формат ${ext} не поддерживается`);
            return;
        }

        if (this.currentFileURL) {
            URL.revokeObjectURL(this.currentFileURL);
        }

        this.resetPreview();
        
        if (!this.validateFile(file)) return;

        this.currentFile = file;
        this.currentFileType = ext;
        this.currentRenderer = this.getRendererForFormat(this.currentFileType);
        
        if (!this.currentRenderer) {
            alert('❌ Неподдерживаемый формат');
            return;
        }

        try {
            this.currentFileURL = URL.createObjectURL(file);
            console.log('✅ URL создан через createObjectURL');
            this.showPreview();
        } catch (urlError) {
            console.warn('⚠️ createObjectURL не сработал, пробуем FileReader', urlError);
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentFileURL = e.target.result;
                console.log('✅ URL создан через FileReader');
                this.showPreview();
            };
            reader.onerror = () => {
                console.error('❌ FileReader не сработал');
                alert('❌ Не удалось загрузить файл');
            };
            reader.readAsDataURL(file);
        }
    }

    validateFile(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            alert(`📁 Файл слишком большой\nМаксимум: 200MB`);
            return false;
        }
        const validFormats = ['.glb', '.gltf', '.obj', '.stl'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!validFormats.includes(ext)) {
            alert(`❌ Поддерживаемые форматы: ${validFormats.join(', ')}`);
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
            this.currentState = APP_STATES.PREVIEW;
            console.log('✅ Превью загружено');

        } catch (error) {
            console.error('❌ Ошибка превью:', error);
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
            
            this.previewModel.addEventListener('error', (e) => {
                console.error('❌ Model Viewer ошибка:', e);
            });
            
            this.previewModel.addEventListener('load', () => {
                console.log('✅ Model Viewer загружен');
            });
            
            setTimeout(() => {
                this.previewModel.src = this.currentFileURL;
                this.previewModel.hidden = false;
                this.hidePreviewPlaceholder();
                console.log('✅ Model Viewer превью настроен');
                resolve();
            }, 100);
        });
    }

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            const ext = this.currentFileType;
            if (ext === '.stl') {
                this.loadSTLPreview(this.currentFileURL, resolve, reject);
            } else if (ext === '.obj') {
                this.loadOBJPreview(this.currentFileURL, resolve, reject);
            } else {
                reject(new Error('Неподдерживаемый формат'));
            }
        });
    }

    loadSTLPreview(url, resolve, reject) {
        console.log('🎮 Загрузка STL превью...');
        this.stlLoader.load(url, (geometry) => {
            console.log('✅ STL загружено');
            this.clearThreeJSScene(this.previewScene);
            const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
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
            if (progress.lengthComputable) this.updateProgress((progress.loaded / progress.total) * 100);
        },
        (error) => {
            console.error('❌ Ошибка STL:', error);
            reject(new Error('Не удалось загрузить STL'));
        });
    }

    loadOBJPreview(url, resolve, reject) {
        console.log('🎮 Загрузка OBJ превью...');
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки');
                return response.text();
            })
            .then(text => {
                const object = this.objLoader.parse(text);
                this.clearThreeJSScene(this.previewScene);
                const group = new THREE.Group();
                let hasMesh = false;
                object.traverse((child) => {
                    if (child.isMesh) {
                        hasMesh = true;
                        if (!child.material) {
                            child.material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
                        }
                        group.add(child.clone());
                    }
                });
                if (!hasMesh) {
                    reject(new Error('OBJ не содержит геометрии'));
                    return;
                }
                this.previewScene.add(group);
                this.previewModelObject = group;
                this.setupPreviewLighting();
                this.setupPreviewCamera(group);
                this.previewThreejs.hidden = false;
                this.hidePreviewPlaceholder();
                resolve();
            })
            .catch(error => {
                console.error('❌ Ошибка OBJ:', error);
                reject(new Error('Не удалось загрузить OBJ'));
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
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.7;
        cameraDistance = Math.max(cameraDistance, 2);
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
            object.rotation.x = 0; object.rotation.y = 0; object.rotation.z = 0;
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
            if (this.mainControls) this.mainControls.update();
        }
    }

    clearThreeJSScene(scene) {
        if (scene) {
            const objectsToRemove = [];
            scene.traverse((child) => {
                if (child.isMesh || child.isGroup) objectsToRemove.push(child);
            });
            objectsToRemove.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
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
        if (this.progressFill) this.progressFill.style.width = percent + '%';
        if (this.progressText) this.progressText.textContent = Math.round(percent) + '%';
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
            console.error('❌ Ошибка:', error);
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
            const ext = this.currentFileType;
            if (ext === '.stl') {
                this.openSTLViewer(resolve, reject);
            } else if (ext === '.obj') {
                this.openOBJViewer(resolve, reject);
            } else {
                reject(new Error('Неподдерживаемый формат'));
            }
        });
    }

    openSTLViewer(resolve, reject) {
        console.log('🎮 Открытие STL...');
        this.stlLoader.load(this.currentFileURL, (geometry) => {
            this.clearThreeJSScene(this.mainScene);
            const material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
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
        }, (progress) => {
            this.updateProgress((progress.loaded / progress.total) * 100);
        }, (error) => {
            reject(new Error('Не удалось загрузить STL'));
        });
    }

    openOBJViewer(resolve, reject) {
        console.log('🎮 Открытие OBJ...');
        fetch(this.currentFileURL)
            .then(response => {
                if (!response.ok) throw new Error('Ошибка загрузки');
                return response.text();
            })
            .then(text => {
                const object = this.objLoader.parse(text);
                this.clearThreeJSScene(this.mainScene);
                const group = new THREE.Group();
                let hasMesh = false;
                object.traverse((child) => {
                    if (child.isMesh) {
                        hasMesh = true;
                        if (!child.material) {
                            child.material = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.3, metalness: 0.1 });
                        }
                        group.add(child.clone());
                    }
                });
                if (!hasMesh) {
                    reject(new Error('OBJ не содержит геометрии'));
                    return;
                }
                this.mainScene.add(group);
                this.mainModelObject = group;
                this.setupMainLighting();
                this.setupMainCamera(group);
                this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                this.mainControls.enableDamping = true;
                this.mainControls.dampingFactor = 0.05;
                this.autoRotate = true;
                this.mainThreejs.hidden = false;
                this.updateMainThreeJSSize();
                this.updateProgress(100);
                resolve();
            })
            .catch(error => {
                reject(new Error('Не удалось загрузить OBJ'));
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
        setTimeout(() => this.updateMainThreeJSSize(), 100);
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
            if (this.mainControls) this.mainControls.reset();
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

    showLoadingIndicator() {
        this.loadingIndicator.classList.add('active');
    }

    hideLoadingIndicator() {
        this.loadingIndicator.classList.remove('active');
        this.updateProgress(0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.modelViewerApp = new ModelViewerApp();
});
