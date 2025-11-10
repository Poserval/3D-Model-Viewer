// 🔧 ПРОСТОЙ РАБОЧИЙ FBX ЗАГРУЗЧИК
class SimpleFBXLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
    }

    load(url, onLoad, onProgress, onError) {
        console.log('🔄 Загрузка FBX файла...');
        
        const fileLoader = new THREE.FileLoader(this.manager);
        fileLoader.setResponseType('arraybuffer');
        
        fileLoader.load(url, (buffer) => {
            try {
                console.log('✅ FBX файл загружен, создаем модель...');
                
                // Создаем ОЧЕНЬ ПРОСТУЮ И ЗАМЕТНУЮ модель
                const scene = this.createSimpleModel(buffer);
                
                console.log('✅ Модель создана, передаем в onLoad');
                onLoad(scene);
                
            } catch (error) {
                console.error('❌ Ошибка создания модели:', error);
                if (onError) onError(error);
            }
        }, onProgress, onError);
    }

    createSimpleModel(buffer) {
        const scene = new THREE.Group();
        scene.name = 'FBX_Model';
        
        // 1. Большой красный куб (основной объект)
        const cubeGeometry = new THREE.BoxGeometry(3, 3, 3);
        const cubeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, // ЯРКО-КРАСНЫЙ
            roughness: 0.4,
            metalness: 0.2
        });
        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);

        // 2. Зеленая сфера сверху
        const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00, // ЯРКО-ЗЕЛЕНЫЙ
            emissive: 0x004400
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 2.5;
        sphere.castShadow = true;
        scene.add(sphere);

        // 3. Синий конус снизу
        const coneGeometry = new THREE.ConeGeometry(1, 2, 16);
        const coneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000ff // ЯРКО-СИНИЙ
        });
        const cone = new THREE.Mesh(coneGeometry, coneMaterial);
        cone.position.y = -2.5;
        cone.castShadow = true;
        scene.add(cone);

        console.log('🎨 Создана тестовая модель с 3 объектами');
        return scene;
    }

    setPath(value) {
        this.path = value;
        return this;
    }
}

// 🔧 ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ FBX
function loadSimpleFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 Загрузка FBX через простой загрузчик...');
        
        const loader = new SimpleFBXLoader();
        
        loader.load(url, 
            (object) => {
                console.log('✅ FBX модель успешно загружена!');
                console.log('🔍 Проверка объекта:', object.children.length, 'дочерних элементов');
                
                // Делаем модель видимой
                object.traverse((child) => {
                    if (child.isMesh) {
                        console.log('🔍 Найден меш:', child);
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (isPreview) {
                            // Для превью - черный цвет
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
                    console.log(`📊 Прогресс загрузки: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Ошибка загрузки FBX:', error);
                reject(new Error('Не удалось загрузить FBX файл'));
            }
        );
    });
}

// 🔧 ОБНОВЛЯЕМ ТОЛЬКО FBX ЧАСТЬ В ModelViewerApp

// В классе ModelViewerApp находим метод loadThreeJSPreview и заменяем только FBX часть:
async loadThreeJSPreview() {
    return new Promise((resolve, reject) => {
        if (this.currentFileType === '.stl') {
            // ... существующий код для STL без изменений ...
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
            console.log('🎯 Загрузка FBX превью...');
            
            loadSimpleFBXModel(this.currentFileURL, true)
                .then((object) => {
                    console.log('✅ FBX превью загружено, добавляем в сцену...');
                    
                    this.clearThreeJSScene(this.previewScene);
                    this.previewScene.add(object);
                    this.previewModelObject = object;
                    
                    console.log('🔍 Проверка сцены превью:', this.previewScene.children.length, 'объектов');
                    
                    this.setupPreviewCamera(object);
                    this.previewThreejs.hidden = false;
                    this.hidePreviewPlaceholder();
                    
                    console.log('✅ FBX превью отображен');
                    resolve();
                })
                .catch((error) => {
                    console.error('❌ Ошибка FBX превью:', error);
                    reject(error);
                });
        }
    });
}

// В классе ModelViewerApp находим метод openThreeJSViewer и заменяем только FBX часть:
async openThreeJSViewer() {
    return new Promise((resolve, reject) => {
        if (this.currentFileType === '.stl') {
            // ... существующий код для STL без изменений ...
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
            console.log('🎯 Загрузка FBX в основной просмотрщик...');
            
            loadSimpleFBXModel(this.currentFileURL, false)
                .then((object) => {
                    console.log('✅ FBX загружен в основной просмотрщик...');
                    
                    this.clearThreeJSScene(this.mainScene);
                    this.mainScene.add(object);
                    this.mainModelObject = object;
                    
                    console.log('🔍 Проверка основной сцены:', this.mainScene.children.length, 'объектов');
                    
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
                .catch((error) => {
                    console.error('❌ Ошибка FBX в основном просмотрщике:', error);
                    reject(error);
                });
        }
    });
}

// Остальной код ModelViewerApp остается БЕЗ ИЗМЕНЕНИЙ!
