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
        this.MAX_FILE_SIZE = 20 * 1024 * 1024;
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
        this.previewArea = document.getElementById('preview-area');

        this.bindEvents();
        this.checkLibraries();
        this.registerServiceWorker();
    }

    checkLibraries() {
        // Правильная проверка Model Viewer (он загружается как модуль)
        const modelViewerAvailable = typeof customElements !== 'undefined' && 
                                   customElements.get('model-viewer') !== undefined;
        
        console.log('Model Viewer доступен:', modelViewerAvailable);
        
        // Three.js может быть внутри Model Viewer
        const threeAvailable = typeof THREE !== 'undefined';
        console.log('Three.js доступен:', threeAvailable);
        
        if (!modelViewerAvailable) {
            console.warn('Model Viewer не загрузился. Проверьте подключение.');
        }
    }

    registerServiceWorker() {
        // Регистрируем Service Worker только если он доступен
        if ('serviceWorker' in navigator) {
            // Пробуем разные возможные пути
            const possiblePaths = [
                '/sw.js',
                '/3d-model-viewer/sw.js',
                'sw.js',
                './sw.js'
            ];
            
            const tryRegister = (index) => {
                if (index >= possiblePaths.length) {
                    console.log('❌ Все пути к Service Worker не сработали');
                    console.log('ℹ️ PWA будет работать без оффлайн-режима');
                    return;
                }
                
                const path = possiblePaths[index];
                console.log(`🔄 Пробуем путь: ${path}`);
                
                navigator.serviceWorker.register(path)
                    .then((registration) => {
                        console.log(`✅ Service Worker зарегистрирован по пути: ${path}`, registration);
                    })
                    .catch((error) => {
                        console.log(`❌ Путь ${path} не сработал:`, error.message);
                        // Пробуем следующий путь
                        tryRegister(index + 1);
                    });
            };
            
            // Начинаем с первого пути
            tryRegister(0);
        } else {
            console.log('❌ Service Worker не поддерживается браузером');
        }
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

        const validFormats = ['.gltf', '.glb', '.obj'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert('Пожалуйста, выберите файл в формате GLTF, GLB или OBJ');
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

            await this.loadStandardPreview(file);

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
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            this.previewModel.src = fileURL;

            // Ждем полной загрузки модели в превью
            const onLoad = () => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.log('Превью модели загружено успешно');
                resolve();
            };

            const onError = (e) => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.error('Ошибка загрузки превью:', e);
                reject(new Error('Не удалось загрузить модель для превью'));
            };

            this.previewModel.addEventListener('load', onLoad);
            this.previewModel.addEventListener('error', onError);

            // Таймаут на случай если события не сработают
            setTimeout(() => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
                console.log('Превью загружено (таймаут)');
                resolve();
            }, 3000);
        });
    }

    async openViewer() {
        if (!this.currentFile) {
            console.log('Нет выбранного файла');
            return;
        }

        console.log('Открываем просмотрщик для:', this.currentFile.name);

        try {
            this.viewerTitle.textContent = this.currentFile.name;

            await this.openStandardViewer(this.currentFile);

            // Переключаем экраны
            this.mainScreen.classList.remove('active');
            this.viewerScreen.classList.add('active');
            this.currentState = APP_STATES.VIEWER;

            console.log('Успешно перешли в режим просмотра');

        } catch (error) {
            console.error('Ошибка открытия просмотрщика:', error);
            alert('Ошибка при открытии модели: ' + error.message);
        }
    }

    async openStandardViewer(file) {
        return new Promise((resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            
            console.log('Загружаем модель в основной просмотрщик:', file.name);
            
            this.mainModel.src = fileURL;

            // Включаем автоповорот для стандартных моделей
            this.mainModel.autoRotate = true;

            // Обновляем кнопку автоповорота
            this.autoRotateBtn.setAttribute('data-active', 'true');
            this.autoRotateBtn.innerHTML = '⏸️';

            // Ждем загрузки модели в основном просмотрщике
            const onLoad = () => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
                console.log('Основная модель загружена успешно');
                resolve();
            };

            const onError = (e) => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
                console.error('Ошибка загрузки основной модели:', e);
                reject(new Error('Не удалось загрузить модель в просмотрщик'));
            };

            this.mainModel.addEventListener('load', onLoad);
            this.mainModel.addEventListener('error', onError);

            // Таймаут на случай если события не сработают
            setTimeout(() => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
                console.log('Основная модель загружена (таймаут)');
                resolve();
            }, 5000);
        });
    }

    toggleAutoRotate() {
        this.mainModel.autoRotate = !this.mainModel.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        const isActive = this.mainModel.autoRotate;
        this.autoRotateBtn.setAttribute('data-active', isActive.toString());
        
        // Меняем иконку в зависимости от состояния
        if (isActive) {
            this.autoRotateBtn.innerHTML = '⏸️'; // Пауза
        } else {
            this.autoRotateBtn.innerHTML = '▶️'; // Воспроизведение
        }
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        // Сбрасываем авто-поворот
        this.mainModel.autoRotate = false;

        this.currentState = APP_STATES.MAIN;
    }

    resetCamera() {
        this.mainModel.cameraOrbit = '0deg 75deg 105%';
        this.mainModel.resetTurntableRotation();
    }

    resetPreview() {
        this.previewPlaceholder.hidden = false;
        this.previewModel.hidden = false;
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
