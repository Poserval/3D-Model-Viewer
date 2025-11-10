// 🔧 ПОДКЛЮЧАЕМ НАСТОЯЩИЙ FBXLoader
class RealFBXLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
        this.loader = new THREE.FBXLoader(this.manager);
    }

    load(url, onLoad, onProgress, onError) {
        console.log('🔄 Загрузка FBX через настоящий FBXLoader...');
        
        this.loader.load(url, 
            (object) => {
                console.log('✅ FBX модель загружена!');
                onLoad(object);
            }, 
            onProgress, 
            onError
        );
    }
}

// 🔧 ФУНКЦИЯ ДЛЯ ЗАГРУЗКИ FBX
function loadRealFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 Загрузка FBX через настоящий загрузчик...');
        
        const loader = new RealFBXLoader();
        
        loader.load(url, 
            (object) => {
                console.log('✅ FBX модель успешно загружена!');
                console.log('🔍 Объект содержит:', object.children.length, 'дочерних элементов');
                
                // Настраиваем материалы и тени
                object.traverse((child) => {
                    if (child.isMesh) {
                        console.log('🔍 Найден меш:', child);
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (isPreview) {
                            // Для превью - простые материалы
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x000000,
                                transparent: true,
                                opacity: 0.9
                            });
                        } else {
                            // Для основного просмотра - убедимся что материалы работают
                            if (!child.material || child.material.isMeshBasicMaterial) {
                                child.material = new THREE.MeshStandardMaterial({
                                    color: 0x888888,
                                    roughness: 0.7,
                                    metalness: 0.3
                                });
                            }
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
                reject(new Error('Не удалось загрузить FBX файл: ' + error.message));
            }
        );
    });
}

// 🔧 В КЛАССЕ ModelViewerApp ЗАМЕНЯЕМ ТОЛЬКО FBX ЧАСТИ
// Находим метод loadThreeJSPreview и заменяем FBX часть:
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
            console.log('🎯 Загрузка FBX превью через настоящий FBXLoader...');
            
            loadRealFBXModel(this.currentFileURL, true)
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

// Находим метод openThreeJSViewer и заменяем FBX часть:
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
            console.log('🎯 Загрузка FBX в основной просмотрщик через настоящий FBXLoader...');
            
            loadRealFBXModel(this.currentFileURL, false)
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
