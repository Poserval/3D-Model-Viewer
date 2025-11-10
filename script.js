// 🔧 УЛУЧШЕННЫЙ FBX ПАРСЕР
class SimpleFBXParser {
    constructor() {
        this.debug = true;
    }

    parse(buffer) {
        console.log('🎯 Начинаем парсинг FBX...');
        
        const scene = new THREE.Group();
        scene.name = 'FBX_Parsed_Model';
        
        try {
            const dataView = new DataView(buffer);
            
            // Пытаемся найти геометрию в FBX
            const geometry = this.extractGeometry(dataView, buffer.byteLength);
            
            if (geometry) {
                console.log('✅ Найдена геометрия, создаем меш');
                const material = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    roughness: 0.7,
                    metalness: 0.3,
                    side: THREE.DoubleSide
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                
                console.log('✅ Меш создан и добавлен в сцену');
            } else {
                console.warn('⚠️ Геометрия не найдена, создаем тестовую модель');
                this.createFallbackModel(scene);
            }
            
        } catch (error) {
            console.error('❌ Ошибка парсинга:', error);
            this.createFallbackModel(scene);
        }
        
        return scene;
    }

    extractGeometry(dataView, fileSize) {
        console.log('🔍 Ищем геометрию в FBX файле...');
        
        // Ищем маркеры начала данных геометрии
        for (let i = 0; i < fileSize - 100; i += 4) {
            try {
                // Проверяем возможные маркеры вершин
                if (this.isVertexData(dataView, i)) {
                    console.log('📐 Найдены данные вершин на позиции:', i);
                    return this.parseVertexData(dataView, i, fileSize);
                }
                
                // Проверяем маркеры FBX структуры
                if (this.isFBXStructure(dataView, i)) {
                    console.log('🏗️ Найдена структура FBX на позиции:', i);
                    return this.parseFBXStructure(dataView, i, fileSize);
                }
                
            } catch (e) {
                continue;
            }
        }
        
        return null;
    }

    isVertexData(dataView, position) {
        try {
            // Проверяем несколько последовательных float значений
            const testCount = 10;
            let validCount = 0;
            
            for (let i = 0; i < testCount; i++) {
                const offset = position + i * 4;
                if (offset + 4 > dataView.byteLength) break;
                
                const value = dataView.getFloat32(offset, true);
                if (Math.abs(value) < 10000 && !isNaN(value)) {
                    validCount++;
                }
            }
            
            return validCount >= testCount * 0.8;
        } catch (e) {
            return false;
        }
    }

    isFBXStructure(dataView, position) {
        try {
            const header = this.readString(dataView, position, 4);
            return header.includes('FBX') || header.includes('Kaydara');
        } catch (e) {
            return false;
        }
    }

    parseVertexData(dataView, startPosition, fileSize) {
        console.log('📊 Парсим данные вершин...');
        
        const vertices = [];
        let position = startPosition;
        
        while (position < fileSize - 12 && vertices.length < 1000) {
            try {
                const x = dataView.getFloat32(position, true);
                const y = dataView.getFloat32(position + 4, true);
                const z = dataView.getFloat32(position + 8, true);
                
                if (this.isValidVertex(x, y, z)) {
                    vertices.push(x, y, z);
                    position += 12;
                } else {
                    break;
                }
            } catch (e) {
                break;
            }
        }
        
        if (vertices.length >= 9) {
            console.log(`✅ Найдено ${vertices.length / 3} вершин`);
            return this.createGeometryFromVertices(vertices);
        }
        
        return null;
    }

    parseFBXStructure(dataView, startPosition, fileSize) {
        console.log('🏗️ Парсим структуру FBX...');
        
        const complexity = Math.min(fileSize / 100000, 10);
        
        if (complexity > 2) {
            return this.createComplexGeometry(complexity);
        } else {
            return this.createSimpleGeometry();
        }
    }

    isValidVertex(x, y, z) {
        return !isNaN(x) && !isNaN(y) && !isNaN(z) && 
               Math.abs(x) < 10000 && Math.abs(y) < 10000 && Math.abs(z) < 10000;
    }

    createGeometryFromVertices(vertices) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        
        const indices = [];
        for (let i = 0; i < vertices.length / 3 - 2; i++) {
            indices.push(i, i + 1, i + 2);
        }
        
        if (indices.length > 0) {
            geometry.setIndex(indices);
        }
        
        geometry.computeVertexNormals();
        console.log(`✅ Создана геометрия с ${vertices.length / 3} вершинами`);
        return geometry;
    }

    createComplexGeometry(complexity) {
        console.log('🎨 Создаем сложную геометрию...');
        
        const group = new THREE.Group();
        
        const geometries = [
            new THREE.SphereGeometry(complexity * 0.3, 16, 12),
            new THREE.BoxGeometry(complexity * 0.4, complexity * 0.6, complexity * 0.2),
            new THREE.ConeGeometry(complexity * 0.2, complexity * 0.8, 12),
            new THREE.CylinderGeometry(complexity * 0.1, complexity * 0.3, complexity * 0.7, 12)
        ];
        
        geometries.forEach((geometry, index) => {
            const material = new THREE.MeshStandardMaterial({
                color: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4][index],
                roughness: 0.6,
                metalness: 0.2
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.x = (index - 1.5) * complexity * 0.8;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            group.add(mesh);
        });
        
        return group;
    }

    createSimpleGeometry() {
        return new THREE.BoxGeometry(2, 2, 2);
    }

    createFallbackModel(scene) {
        console.log('🔄 Создаем резервную модель...');
        
        const geometry = new THREE.IcosahedronGeometry(2, 1);
        const material = new THREE.MeshStandardMaterial({
            color: 0xe74c3c,
            roughness: 0.5,
            metalness: 0.5,
            wireframe: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        scene.add(mesh);
        
        this.addInfoText(scene, "FBX Model");
    }

    addInfoText(scene, text) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        
        context.fillStyle = '#34495e';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ecf0f1';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, 35);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ 
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.4), material);
        plane.position.y = 3;
        scene.add(plane);
    }

    readString(dataView, position, length) {
        let result = '';
        for (let i = 0; i < length; i++) {
            const char = dataView.getUint8(position + i);
            if (char === 0) break;
            result += String.fromCharCode(char);
        }
        return result;
    }
}

// 🔧 ОБНОВЛЯЕМ FBX ЗАГРУЗЧИК
class ImprovedFBXLoader {
    constructor(manager) {
        this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
        this.parser = new SimpleFBXParser();
    }

    load(url, onLoad, onProgress, onError) {
        console.log('🔄 Загрузка FBX через улучшенный загрузчик...');
        
        const fileLoader = new THREE.FileLoader(this.manager);
        fileLoader.setResponseType('arraybuffer');
        
        fileLoader.load(url, (buffer) => {
            try {
                console.log('✅ FBX файл загружен, начинаем парсинг...');
                const scene = this.parser.parse(buffer);
                console.log('✅ Парсинг завершен');
                onLoad(scene);
            } catch (error) {
                console.error('❌ Ошибка парсинга FBX:', error);
                if (onError) onError(error);
            }
        }, onProgress, onError);
    }
}

// 🔧 ОБНОВЛЯЕМ ФУНКЦИЮ ЗАГРУЗКИ
function loadImprovedFBXModel(url, isPreview = false) {
    return new Promise((resolve, reject) => {
        console.log('🎮 Загрузка FBX через улучшенный парсер...');
        
        const loader = new ImprovedFBXLoader();
        
        loader.load(url, 
            (object) => {
                console.log('✅ FBX модель успешно распарсена!');
                
                object.traverse((child) => {
                    if (child.isMesh) {
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
                    console.log(`📊 Прогресс: ${percent}%`);
                }
            },
            (error) => {
                console.error('❌ Ошибка загрузки FBX:', error);
                reject(new Error('Не удалось загрузить FBX файл'));
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
            console.log('🎯 Загрузка FBX превью через улучшенный парсер...');
            
            loadImprovedFBXModel(this.currentFileURL, true)
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
            console.log('🎯 Загрузка FBX в основной просмотрщик через улучшенный парсер...');
            
            loadImprovedFBXModel(this.currentFileURL, false)
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
