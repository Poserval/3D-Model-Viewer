// 🔧 ДЕБАГ ВЕРСИЯ FBX ЗАГРУЗЧИКА
class DebugFBXLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
        this.debug = true;
    }

    load(url, onLoad, onProgress, onError) {
        console.log('🔄 [DEBUG] Начинаем загрузку FBX:', url);
        
        if (onProgress) {
            onProgress({ loaded: 0, total: 100, lengthComputable: true });
        }

        const fileLoader = new THREE.FileLoader(this.manager);
        fileLoader.setResponseType('arraybuffer');
        
        fileLoader.load(url, 
            (buffer) => {
                console.log('✅ [DEBUG] FBX файл загружен в память, размер:', buffer.byteLength, 'байт');
                
                if (onProgress) {
                    onProgress({ loaded: 50, total: 100, lengthComputable: true });
                }

                try {
                    setTimeout(() => {
                        const scene = this.parse(buffer);
                        console.log('🎉 [DEBUG] FBX сцена успешно создана!');
                        
                        if (onProgress) {
                            onProgress({ loaded: 100, total: 100, lengthComputable: true });
                        }
                        
                        onLoad(scene);
                    }, 100);
                    
                } catch (error) {
                    console.error('❌ [DEBUG] Ошибка парсинга FBX:', error);
                    if (onError) onError(error);
                }
            },
            (progress) => {
                console.log(`📊 [DEBUG] Прогресс загрузки: ${progress.loaded}/${progress.total}`);
                if (onProgress) onProgress(progress);
            },
            (error) => {
                console.error('❌ [DEBUG] Ошибка загрузки FBX:', error);
                if (onError) onError(error);
            }
        );
    }

    parse(buffer) {
        console.log('🔧 [DEBUG] Начинаем парсинг FBX...');
        
        const scene = new THREE.Group();
        scene.name = 'FBX_Debug_Scene';
        
        // Создаем ОЧЕНЬ заметную тестовую модель
        this.createTestModel(scene);
        
        console.log('✅ [DEBUG] Тестовая модель создана');
        return scene;
    }

    createTestModel(scene) {
        // 1. Большой цветной куб
        const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
        const cubeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            wireframe: false,
            transparent: true,
            opacity: 0.8
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.position.set(0, 0, 0);
        scene.add(cube);

        // 2. Вращающаяся сфера сверху
        const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x004400
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(0, 1.5, 0);
        scene.add(sphere);

        // 3. Конус снизу
        const coneGeometry = new THREE.ConeGeometry(0.5, 1, 16);
        const coneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff 
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.set(0, -1.5, 0);
        scene.add(cone);

        // 4. Текстурная плоскость с надписью
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        context.fillStyle = '#2c3e50';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#ecf0f1';
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillText('FBX МОДЕЛЬ ЗАГРУЖЕНА', canvas.width / 2, 40);
        context.font = '18px Arial';
        context.fillText('DEBUG TEST MODEL', canvas.width / 2, 70);
        context.fillText('Должна быть видна в просмотрщике', canvas.width / 2, 100);
        
        const texture = new THREE.CanvasTexture(canvas);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), planeMaterial);
        plane.position.set(0, 0, 2);
        scene.add(plane);

        console.log('🎨 [DEBUG] Тестовая модель создана с 4 объектами');
    }

    setPath(value) {
        this.path = value;
        return this;
    }
}

// 🔧 ДЕБАГ ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ FBX
function loadDebugFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 [DEBUG] Загрузка FBX через дебаг загрузчик...');
        
        const loader = new DebugFBXLoader();
        
        loader.load(url, 
            (object) => {
                console.log('✅ [DEBUG] FBX модель успешно загружена!');
                console.log('📦 [DEBUG] Объект содержит:', object.children.length, 'дочерних элементов');
                
                // Делаем модель очень заметной
                object.traverse((child) => {
                    if (child.isMesh) {
                        console.log('🔍 [DEBUG] Меш найден:', child);
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (isPreview) {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x000000,
                                transparent: true,
                                opacity: 0.9
                            });
                        }
                    }
                });
                
                resolve(object);
            },
            (progress) => {
                if (progress.lengthComputable) {
                    const percent = Math.round(progress.loaded / progress.total * 100);
                    console.log(`📊 [DEBUG] Прогресс: ${percent}%`);
                    
                    // Обновляем индикатор загрузки
                    if (window.app && window.app.updateProgress) {
                        window.app.updateProgress(percent);
                    }
                }
            },
            (error) => {
                console.error('❌ [DEBUG] Ошибка загрузки FBX:', error);
                reject(new Error('Не удалось загрузить FBX файл: ' + error.message));
            }
        );
    });
}

// 🔧 ОБНОВЛЯЕМ МЕТОДЫ ModelViewerApp ДЛЯ ДЕБАГА
class ModelViewerApp {
    // ... остальные методы без изменений ...

    async loadThreeJSPreview() {
        return new Promise((resolve, reject) => {
            if (this.currentFileType === '.stl') {
                // ... существующий код для STL ...
            } else if (this.currentFileType === '.fbx') {
                console.log('🎯 [DEBUG] Загрузка FBX превью...');
                
                // Показываем индикатор загрузки
                this.showLoadingIndicator();
                this.updateProgress(10);
                
                loadDebugFBXModel(this.currentFileURL, true)
                    .then((object) => {
                        console.log('✅ [DEBUG] FBX превью загружено, добавляем в сцену...');
                        
                        this.clearThreeJSScene(this.previewScene);
                        this.previewScene.add(object);
                        this.previewModelObject = object;
                        
                        console.log('🔍 [DEBUG] Проверка сцены превью:', this.previewScene.children.length, 'объектов');
                        
                        this.setupPreviewCamera(object);
                        this.previewThreejs.hidden = false;
                        this.hidePreviewPlaceholder();
                        
                        this.hideLoadingIndicator();
                        console.log('✅ [DEBUG] FBX превью отображен');
                        resolve();
                    })
                    .catch((error) => {
                        console.error('❌ [DEBUG] Ошибка FBX превью:', error);
                        this.hideLoadingIndicator();
                        reject(error);
                    });
            }
        });
    }

    async openThreeJSViewer() {
        return new Promise((resolve, reject) => {
            if (this.currentFileType === '.stl') {
                // ... существующий код для STL ...
            } else if (this.currentFileType === '.fbx') {
                console.log('🎯 [DEBUG] Загрузка FBX в основной просмотрщик...');
                
                this.showLoadingIndicator();
                this.updateProgress(10);
                
                loadDebugFBXModel(this.currentFileURL, false)
                    .then((object) => {
                        console.log('✅ [DEBUG] FBX загружен в основной просмотрщик...');
                        
                        this.clearThreeJSScene(this.mainScene);
                        this.mainScene.add(object);
                        this.mainModelObject = object;
                        
                        console.log('🔍 [DEBUG] Проверка основной сцены:', this.mainScene.children.length, 'объектов');
                        
                        this.setupMainLighting();
                        this.setupMainCamera(object);
                        
                        this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
                        this.mainControls.enableDamping = true;
                        this.mainControls.dampingFactor = 0.05;
                        
                        this.autoRotate = true;
                        this.mainThreejs.hidden = false;
                        this.updateMainThreeJSSize();
                        
                        this.hideLoadingIndicator();
                        console.log('✅ [DEBUG] FBX настроен для отображения');
                        this.updateProgress(100);
                        resolve();
                    })
                    .catch((error) => {
                        console.error('❌ [DEBUG] Ошибка FBX в основном просмотрщике:', error);
                        this.hideLoadingIndicator();
                        reject(error);
                    });
            }
        });
    }

    // Добавляем метод для обновления прогресса извне
    updateProgress(percent) {
        console.log(`📊 Прогресс обновлен: ${percent}%`);
        if (this.progressFill) {
            this.progressFill.style.width = percent + '%';
        }
        if (this.progressText) {
            this.progressText.textContent = Math.round(percent) + '%';
        }
    }
}

// Делаем app глобальной для доступа из загрузчика
let appInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    appInstance = new ModelViewerApp();
    window.app = appInstance; // Делаем глобально доступным
    console.log('🚀 [DEBUG] App инициализирован и доступен глобально');
});
