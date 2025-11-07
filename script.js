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

        // Проверка формата
        const validFormats = ['.gltf', '.glb', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert('Пожалуйста, выберите файл в формате GLTF, GLB, OBJ или STL');
            return;
        }

        this.currentFile = file;
        this.showPreview(file);
    }

    showPreview(file) {
        const fileURL = URL.createObjectURL(file);
        
        // Показываем превью
        this.previewPlaceholder.hidden = true;
        this.previewModel.hidden = false;
        this.previewModel.src = fileURL;

        // Активируем кнопку открытия
        this.open3dBtn.disabled = false;
        this.fileName.textContent = file.name;

        this.currentState = APP_STATES.PREVIEW;
    }

    openViewer() {
        if (!this.currentFile) return;

        const fileURL = URL.createObjectURL(this.currentFile);
        
        // Загружаем модель в основной просмотрщик
        this.mainModel.src = fileURL;
        this.viewerTitle.textContent = this.currentFile.name;

        // Переключаем экран
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');

        this.currentState = APP_STATES.VIEWER;
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        // Сбрасываем авто-поворот
        this.mainModel.autoRotate = false;
        this.autoRotateBtn.setAttribute('data-active', 'false');

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
