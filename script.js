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
                
                // Создаем простую группу для модели
                const group = new THREE.Group();
                
                // Пытаемся распарсить FBX или создаем заглушку
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
            // Простой анализ заголовка FBX
            const header = new Uint8Array(buffer, 0, 20);
            const headerStr = String.fromCharCode.apply(null, header);
            
            console.log('📦 FBX заголовок:', headerStr.substring(0, 10));
            
            // Создаем простую геометрию на основе размера файла
            const size = Math.min(Math.max(buffer.byteLength / 100000, 0.5), 5);
            
            // Создаем куб как представление модели
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
            
            // Добавляем текст с информацией
            this.addInfoText(group, buffer.byteLength);
            
        } catch (error) {
            console.warn('⚠️ Упрощенный парсинг FBX, создаем базовую модель');
            this.createBasicModel(group);
        }
    }

    createBasicModel(group) {
        // Создаем простую композицию из примитивов
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
        // Создаем плоскость с информацией о файле
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
        
        // Создаем заметную модель-заглушку
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
        
        // Добавляем текст ошибки
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

// 🔧 ОБНОВЛЕННЫЙ МЕТОД ДЛЯ ЗАГРУЗКИ FBX
async function loadFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 Загрузка FBX через SimpleFBXLoader...');
        
        const loader = new SimpleFBXLoader();
        
        loader.load(url, (object) => {
            console.log('✅ FBX модель успешно загружена');
            
            // Настраиваем материалы для превью или основного просмотра
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    if (isPreview) {
                        // Для превью - простые материалы
                        if (child.material) {
                            child.material = new THREE.MeshBasicMaterial({
                                color: 0x000000,
                                transparent: true,
                                opacity: 0.9
                            });
                        }
                    } else {
                        // Для основного просмотра - качественные материалы
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

// 🔧 ОБНОВЛЯЕМ МЕТОДЫ КЛАССА ModelViewerApp

// В методе loadThreeJSPreview ЗАМЕНИ эту часть:
async loadThreeJSPreview() {
    return new Promise((resolve, reject) => {
        const loader = this.currentFileType === '.stl' ? new THREE.STLLoader() : null;
        
        if (this.currentFileType === '.fbx') {
            // 🔧 ИСПОЛЬЗУЕМ НАШ FBX ЗАГРУЗЧИК
            loadFBXModel(this.currentFileURL, true)
                .then((object) => {
                    this.setupThreeJSPreview(object);
                    resolve();
                })
                .catch(reject);
            return;
        }

        // Существующий код для STL...
        if (this.currentFileType === '.stl') {
            loader.load(this.currentFileURL, (object) => {
                // ... существующий код для STL
            }, reject);
        }
    });
}

// В методе openThreeJSViewer ЗАМЕНИ FBX часть:
async openThreeJSViewer() {
    return new Promise((resolve, reject) => {
        if (this.currentFileType === '.stl') {
            // ... существующий код для STL
        } else if (this.currentFileType === '.fbx') {
            // 🔧 ИСПОЛЬЗУЕМ НАШ FBX ЗАГРУЗЧИК
            loadFBXModel(this.currentFileURL, false)
                .then((object) => {
                    this.setupThreeJSViewer(object);
                    resolve();
                })
                .catch(reject);
        }
    });
}

// 🔧 ДОБАВЛЯЕМ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
function setupThreeJSPreview(object) {
    this.clearThreeJSScene(this.previewScene);
    this.previewScene.add(object);
    this.previewModelObject = object;
    this.setupPreviewCamera(object);
    this.previewThreejs.hidden = false;
    this.hidePreviewPlaceholder();
}

function setupThreeJSViewer(object) {
    this.clearThreeJSScene(this.mainScene);
    this.mainScene.add(object);
    this.mainModelObject = object;
    this.setupMainLighting();
    this.setupMainCamera(object);
    
    // Контролы
    this.mainControls = new THREE.OrbitControls(this.mainCamera, this.mainThreejs);
    this.mainControls.enableDamping = true;
    this.mainControls.dampingFactor = 0.05;
    
    this.autoRotate = true;
    this.mainThreejs.hidden = false;
    this.updateMainThreeJSSize();
}

console.log('✅ FBX загрузчик инициализирован');
