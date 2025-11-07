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
        this.autoRotate = true;
        
        this.initializeElements();
        this.attachEventListeners();
        this.registerServiceWorker();
    }

    initializeElements() {
        // Экраны
        this.mainScreen = document.getElementById('main-screen');
        this.viewerScreen = document.getElementById('viewer-screen');
        
        // Главный экран элементы
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.openViewerBtn = document.getElementById('open-viewer-btn');
        this.previewArea = document.getElementById('preview-area');
        this.previewModel = document.getElementById('preview-model');
        this.previewPlaceholder = this.previewArea.querySelector('.preview-placeholder');
        this.fileInfo = document.getElementById('file-info');
        this.fileName = document.getElementById('file-name');
        this.fileSize = document.getElementById('file-size');
        
        // Экран просмотра элементы
        this.backBtn = document.getElementById('back-btn');
        this.viewerTitle = document.getElementById('viewer-title');
        this.viewerModel = document.getElementById('viewer-model');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
    }

    attachEventListeners() {
        // Главный экран события
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.openViewerBtn.addEventListener('click', () => this.openViewer());
        
        // Экран просмотра события
        this.backBtn.addEventListener('click', () => this.closeViewer());
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        
        // Обработка жестов (делегирование Model Viewer)
        this.setupGestureHandling();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Валидация формата
        const validFormats = ['.gltf', '.glb', '.obj', '.stl'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!validFormats.includes(fileExtension)) {
            alert('Пожалуйста, выберите файл в формате GLTF, GLB, OBJ или STL');
            return;
        }

        this.currentFile = file;
        this.showPreview(file);
        this.updateState(APP_STATES.PREVIEW);
    }

    showPreview(file) {
        const fileURL = URL.createObjectURL(file);
        
        // Показываем информацию о файле
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.style.display = 'flex';
        
        // Настраиваем модель для превью
        this.previewModel.src = fileURL;
        this.previewModel.style.display = 'block';
        this.previewPlaceholder.style.display = 'none';
        
        // Обновляем кнопку
        this.openViewerBtn.disabled = false;
        
        // Очищаем URL при размонтировании
        this.previewModel.addEventListener('load', () => {
            URL.revokeObjectURL(fileURL);
        });
    }

    openViewer() {
        if (!this.currentFile) return;
        
        const fileURL = URL.createObjectURL(this.currentFile);
        this.viewerModel.src = fileURL;
        this.viewerTitle.textContent = this.currentFile.name;
        
        // Включаем автоповорот по умолчанию
        this.viewerModel.autoRotate = this.autoRotate;
        this.updateAutoRotateButton();
        
        this.updateState(APP_STATES.VIEWER);
        
        // Очищаем URL когда модель загружена
        this.viewerModel.addEventListener('load', () => {
            URL.revokeObjectURL(fileURL);
        });
    }

    closeViewer() {
        // Останавливаем анимацию при закрытии
        this.viewerModel.autoRotate = false;
        this.updateState(APP_STATES.PREVIEW);
    }

    toggleAutoRotate() {
        this.autoRotate = !this.autoRotate;
        this.viewerModel.autoRotate = this.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        if (this.autoRotate) {
            this.autoRotateBtn.classList.add('active');
        } else {
            this.autoRotateBtn.classList.remove('active');
        }
    }

    resetCamera() {
        this.viewerModel.cameraOrbit = '0deg 75deg 105%';
        this.viewerModel.fieldOfView = '30deg';
    }

    updateState(newState) {
        this.currentState = newState;
        
        // Скрываем все экраны
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.remove('active');
        
        // Показываем нужный экран
        switch (newState) {
            case APP_STATES.MAIN:
            case APP_STATES.PREVIEW:
                this.mainScreen.classList.add('active');
                break;
            case APP_STATES.VIEWER:
                this.viewerScreen.classList.add('active');
                break;
        }
    }

    setupGestureHandling() {
        // Model Viewer автоматически обрабатывает основные жесты
        // Здесь можно добавить кастомную логику жестов при необходимости
        console.log('Gesture handling delegated to Model Viewer');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker зарегистрирован');
            } catch (error) {
                console.log('Ошибка регистрации Service Worker:', error);
            }
        }
    }
}

// Инициализация приложения когда DOM загружен
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewerApp();
});

// Обработка ошибок загрузки моделей
window.addEventListener('load', () => {
    const models = document.querySelectorAll('model-viewer');
    models.forEach(model => {
        model.addEventListener('error', (event) => {
            console.error('Ошибка загрузки модели:', event.detail);
            alert('Ошибка загрузки модели. Пожалуйста, проверьте формат файла.');
        });
    });
});
