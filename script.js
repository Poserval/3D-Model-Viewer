// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

// Простой STL Loader так как внешний не работает
class SimpleSTLLoader {
    parse(data) {
        const geometry = new THREE.BufferGeometry();
        
        // Проверяем бинарный или текстовый STL
        const isBinary = !this.isASCII(data);
        
        if (isBinary) {
            return this.parseBinary(data);
        } else {
            return this.parseASCII(data);
        }
    }

    isASCII(data) {
        // Простая проверка - если первые 5 байт содержат "solid" - это ASCII
        const header = new Uint8Array(data, 0, 5);
        const headerString = String.fromCharCode.apply(null, header);
        return headerString.toLowerCase() === 'solid';
    }

    parseBinary(data) {
        const geometry = new THREE.BufferGeometry();
        const faces = new DataView(data).getUint32(80, true);
        
        const vertices = [];
        const normals = [];
        
        const dataOffset = 84;
        const faceLength = 12 * 4 + 2;
        
        for (let face = 0; face < faces; face++) {
            const start = dataOffset + face * faceLength;
            const normal = [
                this.readFloat(data, start),
                this.readFloat(data, start + 4),
                this.readFloat(data, start + 8)
            ];
            
            for (let i = 1; i <= 3; i++) {
                const vertexStart = start + i * 12;
                vertices.push(
                    this.readFloat(data, vertexStart),
                    this.readFloat(data, vertexStart + 4),
                    this.readFloat(data, vertexStart + 8)
                );
                normals.push(...normal);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        
        return geometry;
    }

    parseASCII(data) {
        const geometry = new THREE.BufferGeometry();
        const text = new TextDecoder().decode(data);
        const vertices = [];
        const normals = [];
        
        const lines = text.split('\n');
        let normal = [0, 0, 0];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('facet normal')) {
                const parts = trimmed.split(/\s+/);
                normal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
            } else if (trimmed.startsWith('vertex')) {
                const parts = trimmed.split(/\s+/);
                vertices.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]), 
                    parseFloat(parts[3])
                );
                normals.push(...normal);
            }
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        
        return geometry;
    }

    readFloat(data, offset) {
        return new DataView(data).getFloat32(offset, true);
    }
}

class ModelViewerApp {
    constructor() {
        this.currentState = APP_STATES.MAIN;
        this.currentFile = null;
        this.currentFileType = null;
        this.stlScene = null;
        this.stlRenderer = null;
        this.stlCamera = null;
        this.stlMesh = null;
        this.animationId = null;
        this.stlLoader = new SimpleSTLLoader();
        this.init();
    }

    init() {
        // Элементы интерфейса
        this.mainScreen = document.getElementById('main-screen');
        this.viewerScreen = document.getElementById('viewer-screen');
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.open3dBtn = document.getElementById('open-3d-btn');
        this.backBtn = document.getElementById('back-btn');
        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        this.fileName = document.getElementById('file-name');
        this.viewerTitle = document.getElementById('viewer-title');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.viewerCanvas = document.getElementById('viewer-canvas');
        this.previewArea = document.getElementById('preview-area');

        this.bindEvents();
    }

    bindEvents() {
        // Кнопка выбора файла
        this.selectFileBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        // Загрузка файла
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        // Открытие 3D просмотра
        this.open3dBtn.addEventListener('click', () => {
            this.openViewer();
        });

        // Назад к главному экрану
        this.backBtn.addEventListener('click', () => {
            this.showMainScreen();
        });

        // Управление в просмотрщике
        this.autoRotateBtn.addEventListener('click', () => {
            this.toggleAutoRotate();
        });

        this.resetCameraBtn.addEventListener('click', () => {
            this.resetCamera();
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Проверка размера файла (до 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 10MB');
            return;
        }

        const validFormats = ['.gltf', '.glb', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert('Пожалуйста, выберите файл в формате GLTF, GLB, OBJ или STL');
            return;
        }

        this.currentFile = file;
        this.currentFileType = fileExtension;
        this.showPreview(file, fileExtension);
    }

    async showPreview(file, fileType) {
        try {
            this.previewPlaceholder.hidden = true;
            this.open3dBtn.disabled = true;
            this.fileName.textContent = file.name;

            // Показываем индикатор загрузки
            this.previewArea.classList.add('loading');

            if (fileType === '.stl') {
                await this.loadSTLPreview(file);
            } else {
                await this.loadStandardPreview(file);
            }

            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;

        } catch (error) {
            console.error('Ошибка показа превью:', error);
            alert('Ошибка при обработке файла: ' + error.message);
            this.resetPreview();
        } finally {
            this.previewArea.classList.remove('loading');
        }
    }

    async loadStandardPreview(file) {
        const fileURL = URL.createObjectURL(file);
        
        // Скрываем canvas, показываем model-viewer
        this.previewCanvas.hidden = true;
        this.previewModel.hidden = false;
        
        this.previewModel.src = fileURL;

        return new Promise((resolve, reject) => {
            this.previewModel.addEventListener('load', () => resolve());
            this.previewModel.addEventListener('error', (e) => reject(new Error('Не удалось загрузить модель')));
        });
    }

    async loadSTLPreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const geometry = this.stlLoader.parse(event.target.result);
                    
                    // Создаем сцену Three.js
                    const scene = new THREE.Scene();
                    const material = new THREE.MeshPhongMaterial({ 
                        color: 0x007AFF, 
                        specular: 0x111111, 
                        shininess: 200 
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    scene.add(mesh);

                    // Освещение
                    const ambientLight = new THREE.AmbientLight(0x404040);
                    scene.add(ambientLight);
                    
                    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                    directionalLight.position.set(1, 1, 1);
                    scene.add(directionalLight);

                    // Камера
                    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                    
                    // Настраиваем камеру
                    const box = new THREE.Box3().setFromObject(mesh);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = camera.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
                    
                    cameraZ *= 1.5;
                    camera.position.set(center.x, center.y, cameraZ);
                    camera.lookAt(center);

                    // Рендерер
                    const renderer = new THREE.WebGLRenderer({ 
                        antialias: true,
                        alpha: true,
                        canvas: this.previewCanvas
                    });
                    renderer.setSize(200, 200);
                    renderer.setClearColor(0x000000, 0);
                    
                    // Рендерим
                    renderer.render(scene, camera);
                    
                    // Показываем canvas, скрываем model-viewer
                    this.previewModel.hidden = true;
                    this.previewCanvas.hidden = false;
                    
                    resolve();
                    
                } catch (error) {
                    reject(new Error('Ошибка загрузки STL файла: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }

    async openViewer() {
        if (!this.currentFile) return;

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            if (this.currentFileType === '.stl') {
                await this.openSTLViewer(this.currentFile);
            } else {
                await this.openStandardViewer(this.currentFile);
            }

            this.mainScreen.classList.remove('active');
            this.viewerScreen.classList.add('active');
            this.currentState = APP_STATES.VIEWER;

        } catch (error) {
            console.error('Ошибка открытия просмотрщика:', error);
            alert('Ошибка при открытии модели: ' + error.message);
        }
    }

    async openStandardViewer(file) {
        const fileURL = URL.createObjectURL(file);
        
        this.viewerCanvas.hidden = true;
        this.mainModel.hidden = false;
        this.mainModel.src = fileURL;

        // Показываем controls для стандартных моделей
        this.autoRotateBtn.style.display = 'block';
        this.resetCameraBtn.style.display = 'block';

        return new Promise((resolve, reject) => {
            this.mainModel.addEventListener('load', () => resolve());
            this.mainModel.addEventListener('error', () => reject(new Error('Не удалось загрузить модель')));
        });
    }

    async openSTLViewer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const geometry = this.stlLoader.parse(event.target.result);
                    
                    // Создаем сцену
                    this.stlScene = new THREE.Scene();
                    const material = new THREE.MeshPhongMaterial({ 
                        color: 0x007AFF, 
                        specular: 0x111111, 
                        shininess: 200 
                    });
                    
                    this.stlMesh = new THREE.Mesh(geometry, material);
                    this.stlScene.add(this.stlMesh);

                    // Освещение
                    const ambientLight = new THREE.AmbientLight(0x404040);
                    this.stlScene.add(ambientLight);
                    
                    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
                    directionalLight.position.set(1, 1, 1);
                    this.stlScene.add(directionalLight);

                    // Камера
                    this.stlCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                    
                    // Настраиваем камеру
                    const box = new THREE.Box3().setFromObject(this.stlMesh);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    
                    const maxDim = Math.max(size.x, size.y, size.z);
                    const fov = this.stlCamera.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
                    
                    cameraZ *= 1.5;
                    this.stlCamera.position.set(center.x, center.y, cameraZ);
                    this.stlCamera.lookAt(center);

                    // Рендерер
                    this.stlRenderer = new THREE.WebGLRenderer({ 
                        antialias: true,
                        alpha: true,
                        canvas: this.viewerCanvas
                    });
                    this.stlRenderer.setSize(window.innerWidth, window.innerHeight);
                    this.stlRenderer.setClearColor(0x000000, 0);
                    
                    // Скрываем model-viewer, показываем canvas
                    this.mainModel.hidden = true;
                    this.viewerCanvas.hidden = false;

                    // Запускаем анимацию
                    this.animateSTL();

                    // Скрываем controls для STL (пока нет функционала)
                    this.autoRotateBtn.style.display = 'none';
                    this.resetCameraBtn.style.display = 'none';

                    // Добавляем обработчики жестов для STL
                    this.setupSTLControls();

                    resolve();
                    
                } catch (error) {
                    reject(new Error('Ошибка загрузки STL файла: ' + error.message));
                }
            };

            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }

    animateSTL() {
        if (!this.stlScene || !this.stlCamera || !this.stlRenderer) return;

        this.animationId = requestAnimationFrame(() => this.animateSTL());
        
        // Медленное вращение
        if (this.stlMesh) {
            this.stlMesh.rotation.y += 0.01;
        }
        
        this.stlRenderer.render(this.stlScene, this.stlCamera);
    }

    setupSTLControls() {
        let isDragging = false;
        let previousTouch = null;
        let previousPinchDistance = null;

        this.viewerCanvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                previousTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            } else if (e.touches.length === 2) {
                previousPinchDistance = this.getPinchDistance(e.touches);
            }
        });

        this.viewerCanvas.addEventListener('touchmove', (e) => {
            if (!this.stlMesh) return;

            e.preventDefault();

            if (e.touches.length === 1 && isDragging && previousTouch) {
                // Вращение
                const touch = e.touches[0];
                const deltaX = touch.clientX - previousTouch.x;
                const deltaY = touch.clientY - previousTouch.y;

                this.stlMesh.rotation.y += deltaX * 0.01;
                this.stlMesh.rotation.x += deltaY * 0.01;

                previousTouch = { x: touch.clientX, y: touch.clientY };
            } else if (e.touches.length === 2 && previousPinchDistance) {
                // Масштабирование
                const currentDistance = this.getPinchDistance(e.touches);
                const scaleFactor = currentDistance / previousPinchDistance;

                this.stlMesh.scale.multiplyScalar(scaleFactor);
                previousPinchDistance = currentDistance;
            }
        });

        this.viewerCanvas.addEventListener('touchend', () => {
            isDragging = false;
            previousTouch = null;
            previousPinchDistance = null;
        });
    }

    getPinchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    showMainScreen() {
        // Останавливаем анимацию STL
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        // Сбрасываем авто-поворот
        this.mainModel.autoRotate = false;
        this.autoRotateBtn.setAttribute('data-active', 'false');

        // Показываем controls обратно
        this.autoRotateBtn.style.display = 'block';
        this.resetCameraBtn.style.display = 'block';

        this.currentState = APP_STATES.MAIN;
    }

    toggleAutoRotate() {
        const isActive = this.mainModel.autoRotate;
        this.mainModel.autoRotate = !isActive;
        this.autoRotateBtn.setAttribute('data-active', (!isActive).toString());
    }

    resetCamera() {
        this.mainModel.cameraOrbit = '0deg 75deg 105%';
        this.mainModel.resetTurntableRotation();
    }

    resetPreview() {
        this.previewPlaceholder.hidden = false;
        this.previewModel.hidden = true;
        this.previewCanvas.hidden = true;
        this.previewModel.src = '';
        this.open3dBtn.disabled = true;
        this.fileName.textContent = '';
        this.currentFile = null;
        this.currentFileType = null;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});

// Service Worker регистрация
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
