// script.js - ИСПРАВЛЕНИЕ ДЛЯ STL МОДЕЛЕЙ

// В методе setupLighting ЗАМЕНИТЬ на этот код:
setupLighting(scene) {
    // Очищаем старое освещение
    while(scene.children.length > 0) { 
        if (scene.children[0].isLight) {
            scene.remove(scene.children[0]);
        } else {
            break;
        }
    }
    
    // 1. МОЩНЫЙ РАССЕЯННЫЙ СВЕТ - ОСНОВНОЙ ИСТОЧНИК
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // УВЕЛИЧИЛИ ИНТЕНСИВНОСТЬ
    scene.add(ambientLight);
    
    // 2. ЯРКИЙ НАПРАВЛЕННЫЙ СВЕТ СПЕРЕДИ
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight1.position.set(10, 10, 10);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);
    
    // 3. ДОПОЛНИТЕЛЬНЫЙ СВЕТ СЗАДИ
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-10, 5, -10);
    scene.add(directionalLight2);
    
    // 4. БОКОВОЙ СВЕТ
    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight3.position.set(0, -10, 0);
    scene.add(directionalLight3);
    
    console.log('💡 УСИЛЕННОЕ ОСВЕЩЕНИЕ ДЛЯ STL');
}

// В методе loadThreeJSPreview ЗАМЕНИТЬ материал для STL:
async loadThreeJSPreview() {
    return new Promise((resolve, reject) => {
        const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

        console.log('🎮 Загрузка Three.js превью...');

        loader.load(this.currentFileURL, (object) => {
            console.log('✅ Three.js превью загружено');
            
            this.clearThreeJSScene(this.previewScene);
            
            let modelObject;
            if (this.currentFileType === '.stl') {
                const geometry = object;
                // ПРОСТОЙ И ЯРКИЙ МАТЕРИАЛ ДЛЯ STL
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0x4a90e2,        // ЯРКИЙ СИНИЙ
                    shininess: 100,         // БЛЕСК
                    specular: 0xffffff,     // БЕЛЫЕ ОТБЛЕСКИ
                    emissive: 0x000000,     // БЕЗ СВЕЧЕНИЯ
                    transparent: false,
                    opacity: 1
                });
                modelObject = new THREE.Mesh(geometry, material);
            } else {
                modelObject = object;
                if (modelObject.traverse) {
                    modelObject.traverse((child) => {
                        if (child.isMesh) {
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
            reject(new Error('Не удалось загрузить модель'));
        });
    });
}

// В методе openThreeJSViewer ТАКЖЕ ЗАМЕНИТЬ материал для STL:
async openThreeJSViewer() {
    return new Promise((resolve, reject) => {
        const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : new THREE.FBXLoader();

        console.log('🎮 Открытие Three.js просмотрщика...');

        loader.load(this.currentFileURL, (object) => {
            console.log('✅ Three.js модель загружена');
            
            this.clearThreeJSScene(this.mainScene);
            
            let modelObject;
            if (this.currentFileType === '.stl') {
                const geometry = object;
                // ТОТ ЖЕ ЯРКИЙ МАТЕРИАЛ ДЛЯ ОСНОВНОГО ПРОСМОТРА
                const material = new THREE.MeshPhongMaterial({ 
                    color: 0x4a90e2,        // ЯРКИЙ СИНИЙ
                    shininess: 100,         // БЛЕСК
                    specular: 0xffffff,     // БЕЛЫЕ ОТБЛЕСКИ
                    emissive: 0x000000,
                    transparent: false,
                    opacity: 1
                });
                modelObject = new THREE.Mesh(geometry, material);
            } else {
                modelObject = object;
                if (modelObject.traverse) {
                    modelObject.traverse((child) => {
                        if (child.isMesh) {
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
            
            this.autoRotate = true;
            
            this.mainThreejs.hidden = false;
            this.updateMainThreeJSSize();
            
            console.log('✅ Three.js настроен для отображения');
            
            this.updateProgress(100);
            resolve();
        }, 
        (progress) => {
            this.updateProgress((progress.loaded / progress.total) * 100);
        },
        (error) => {
            console.error('❌ Ошибка загрузки Three.js:', error);
            reject(new Error('Не удалось загрузить модель'));
        });
    });
}

// ДОБАВИТЬ в метод initThreeJS() после создания рендерера:
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
    this.previewRenderer.setClearColor(0xf0f0f0, 1); // СВЕТЛЫЙ ФОН ДЛЯ ПРЕВЬЮ
    
    // Для основного просмотрщика
    this.mainScene = new THREE.Scene();
    this.mainCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.mainRenderer = new THREE.WebGLRenderer({ 
        canvas: this.mainThreejs,
        antialias: true,
        alpha: true
    });
    this.mainRenderer.setClearColor(0x222222, 1);
    
    // НАСТРОЙКА ТОНАЛЬНОГО ОТОБРАЖЕНИЯ ДЛЯ ЛУЧШЕЙ ВИДИМОСТИ
    this.mainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.mainRenderer.toneMappingExposure = 1.2;
    this.previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.previewRenderer.toneMappingExposure = 1.2;
    
    // Освещение
    this.setupLighting(this.previewScene);
    this.setupLighting(this.mainScene);
    
    // Камеры
    this.previewCamera.position.set(0, 0, 5);
    this.mainCamera.position.set(0, 0, 5);

    console.log('Three.js инициализирован с улучшенным освещением');
    this.animate();
}
