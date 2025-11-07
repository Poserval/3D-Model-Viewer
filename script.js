// Состояния приложения
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

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
        this.isSTLAutoRotate = true;
        this.stlLoaderAvailable = false;
        this.MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 МБ вместо 10 МБ
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

        // Проверяем доступность STLLoader
        this.checkSTLLoader();
        this.bindEvents();
    }

    checkSTLLoader() {
        // Ждем загрузки Three.js и STLLoader
        setTimeout(() => {
            if (typeof THREE !== 'undefined' && typeof STLLoader !== 'undefined') {
                this.stlLoaderAvailable = true;
                console.log('STLLoader доступен');
            } else {
                this.stlLoaderAvailable = false;
                console.warn('STLLoader недоступен. STL файлы не будут работать.');
            }
        }, 1000);
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

        // Проверка размера файла (до 20MB)
        if (file.size > this.MAX_FILE_SIZE) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const maxSizeMB = (this.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
            alert(`Файл слишком большой. Размер: ${fileSizeMB}MB. Максимальный размер: ${maxSizeMB}MB`);
            return;
        }

        const validFormats = ['.gltf', '.glb', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert('Пожалуйста, выберите файл в формате GLTF, GLB, OBJ или STL');
            return;
        }

        // Проверка для STL файлов
        if (fileExtension === '.stl' && !this.stlLoaderAvailable) {
            alert('STL загрузчик недоступен. Пожалуйста, используйте GLTF или GLB форматы.');
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
            if (!this.stlLoaderAvailable) {
                reject(new Error('STL загрузчик недоступен'));
                return;
            }

            const loader = new STLLoader();
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const geometry = loader.parse(event.target.result);
                    
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
                    reject(error);
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

            // Сбрасываем состояние автоповорота
            this.isSTLAutoRotate = true;
            this.updateAutoRotateButton();

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

        // Включаем автоповорот для стандартных моделей
        this.mainModel.autoRotate = true;
        
        // Показываем controls для стандартных моделей
        this.autoRotateBtn.style.display = 'block';
        this.resetCameraBtn.style.display = 'block';

        // Обновляем кнопку автоповорота
        this.autoRotateBtn.setAttribute('data-active', 'true');
        this.autoRotateBtn.innerHTML = '⏸️';

        return new Promise((resolve, reject) => {
            this.mainModel.addEventListener('load', () => resolve());
            this.mainModel.addEventListener('error', () => reject(new Error('Не удалось загрузить модель')));
        });
    }

    async openSTLViewer(file) {
        return new Promise((resolve, reject) => {
            if (!this.stlLoaderAvailable) {
                reject(new Error('STL загрузчик недоступен'));
                return;
            }

            const loader = new STLLoader();
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const geometry = loader.parse(event.target.result);
                    
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

                    // Показываем controls для STL
                    this.autoRotateBtn.style.display = 'block';
                    this.resetCameraBtn.style.display = 'block';

                    // Добавляем обработчики жестов для STL
                    this.setupSTLControls();

                    resolve();
                    
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsArrayBuffer(file);
        });
    }

    animateSTL() {
        if (!this.stlScene || !this.stlCamera || !this.stlRenderer) return;

        this.animationId = requestAnimationFrame(() => this.animateSTL());
        
        // Вращение только если автоповорот включен
        if (this.stlMesh && this.isSTLAutoRotate) {
            this.stlMesh.rotation.y += 0.01;
        }
        
        this.stlRenderer.render(this.stlScene, this.stlCamera);
    }

    toggleAutoRotate() {
        if (this.currentFileType === '.stl') {
            // Для STL моделей
            this.isSTLAutoRotate = !this.isSTLAutoRotate;
        } else {
            // Для стандартных моделей (GLTF/GLB/OBJ)
            this.mainModel.autoRotate = !this.mainModel.autoRotate;
        }
        
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        let isActive;
        
        if (this.currentFileType === '.stl') {
            isActive = this.isSTLAutoRotate;
        } else {
            isActive = this.mainModel.autoRotate;
        }

        this.autoRotateBtn.setAttribute('data-active', isActive.toString());
        
        // Меняем иконку в зависимости от состояния
        if (isActive) {
            this.autoRotateBtn.innerHTML = '⏸️'; // Пауза
        } else {
            this.autoRotateBtn.innerHTML = '▶️'; // Воспроизведение
        }
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
        
        // Сбрасываем авто-поворот для стандартных моделей
        this.mainModel.autoRotate = false;

        this.currentState = APP_STATES.MAIN;
    }

    resetCamera() {
        if (this.currentFileType === '.stl') {
            // Сброс камеры для STL
            if (this.stlMesh && this.stlCamera) {
                const box = new THREE.Box3().setFromObject(this.stlMesh);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = this.stlCamera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
                
                cameraZ *= 1.5;
                this.stlCamera.position.set(center.x, center.y, cameraZ);
                this.stlCamera.lookAt(center);
                
                // Сброс вращения и масштаба
                this.stlMesh.rotation.set(0, 0, 0);
                this.stlMesh.scale.set(1, 1, 1);
            }
        } else {
            // Сброс камеры для стандартных моделей
            this.mainModel.cameraOrbit = '0deg 75deg 105%';
            this.mainModel.resetTurntableRotation();
        }
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
