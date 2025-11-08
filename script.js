// ===== CONSTANTS AND CONFIGURATION =====
const APP_STATES = {
    MAIN: 'main',
    PREVIEW: 'preview', 
    VIEWER: 'viewer'
};

const SUPPORTED_FORMATS = {
    '.gltf': 'GL Transmission Format',
    '.glb': 'GL Binary Format', 
    '.obj': 'Wavefront OBJ'
};

const CONFIG = {
    MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
    PREVIEW_TIMEOUT: 3000,
    VIEWER_TIMEOUT: 5000,
    PROGRESS: {
        QUICK_STEP: 10,
        SLOW_STEP: 2,
        QUICK_INTERVAL: 100,
        SLOW_INTERVAL: 200,
        MAX_SIMULATED: 90
    }
};

// ===== UTILITY FUNCTIONS =====
class AppUtils {
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getFileExtension(filename) {
        return '.' + filename.toLowerCase().split('.').pop();
    }

    static isValidFormat(extension) {
        return Object.keys(SUPPORTED_FORMATS).includes(extension);
    }

    static createTimeoutPromise(ms, message) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`⏰ ${message}`);
                resolve();
            }, ms);
        });
    }

    static showError(message, title = '❌ Ошибка') {
        alert(`${title}\n${message}`);
    }

    static showSuccess(message) {
        console.log(`✅ ${message}`);
    }
}

// ===== LOADING INDICATOR MANAGER =====
class LoadingManager {
    constructor(indicatorElement, progressFillElement, progressTextElement) {
        this.indicator = indicatorElement;
        this.progressFill = progressFillElement;
        this.progressText = progressTextElement;
        this.progressIntervals = [];
    }

    show() {
        this.indicator.hidden = false;
        this.startProgressAnimation();
    }

    hide() {
        this.indicator.hidden = true;
        this.resetProgress();
        this.clearIntervals();
    }

    startProgressAnimation() {
        let progress = 0;
        const { QUICK_STEP, SLOW_STEP, QUICK_INTERVAL, SLOW_INTERVAL, MAX_SIMULATED } = CONFIG.PROGRESS;
        
        // Быстрое заполнение до 30%
        const quickInterval = setInterval(() => {
            progress += QUICK_STEP;
            this.updateProgress(progress);
            
            if (progress >= 30) {
                clearInterval(quickInterval);
                // Медленное заполнение до максимума
                const slowInterval = setInterval(() => {
                    progress += SLOW_STEP;
                    this.updateProgress(Math.min(progress, MAX_SIMULATED));
                    
                    if (progress >= MAX_SIMULATED) {
                        clearInterval(slowInterval);
                    }
                }, SLOW_INTERVAL);
                
                this.progressIntervals.push(slowInterval);
            }
        }, QUICK_INTERVAL);
        
        this.progressIntervals.push(quickInterval);
    }

    updateProgress(percent) {
        if (this.progressFill) {
            this.progressFill.style.width = percent + '%';
        }
        if (this.progressText) {
            this.progressText.textContent = Math.round(percent) + '%';
        }
    }

    resetProgress() {
        this.updateProgress(0);
    }

    clearIntervals() {
        this.progressIntervals.forEach(interval => clearInterval(interval));
        this.progressIntervals = [];
    }

    complete() {
        this.updateProgress(100);
        setTimeout(() => this.hide(), 500);
    }
}

// ===== MAIN APPLICATION CLASS =====
class ModelViewerApp {
    constructor() {
        this.currentState = APP_STATES.MAIN;
        this.currentFile = null;
        this.currentFileType = null;
        this.loadingManager = null;
        this.init();
    }

    init() {
        this.initializeElements();
        this.initializeLoadingManager();
        this.bindEvents();
        this.checkLibraries();
        
        console.log('🚀 3D Model Viewer запущен');
    }

    initializeElements() {
        // Основные экраны
        this.mainScreen = document.getElementById('main-screen');
        this.viewerScreen = document.getElementById('viewer-screen');
        
        // Элементы управления
        this.fileInput = document.getElementById('file-input');
        this.selectFileBtn = document.getElementById('select-file-btn');
        this.open3dBtn = document.getElementById('open-3d-btn');
        this.backBtn = document.getElementById('back-btn');
        this.autoRotateBtn = document.getElementById('auto-rotate-btn');
        this.resetCameraBtn = document.getElementById('reset-camera-btn');
        
        // Модели
        this.previewModel = document.getElementById('preview-model');
        this.mainModel = document.getElementById('main-model');
        
        // Информационные элементы
        this.fileName = document.getElementById('file-name');
        this.viewerTitle = document.getElementById('viewer-title');
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.previewArea = document.getElementById('preview-area');
    }

    initializeLoadingManager() {
        const loadingIndicator = document.getElementById('loading-indicator');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        
        this.loadingManager = new LoadingManager(loadingIndicator, progressFill, progressText);
    }

    checkLibraries() {
        const modelViewerAvailable = typeof customElements !== 'undefined' && 
                                   customElements.get('model-viewer') !== undefined;
        
        const threeAvailable = typeof THREE !== 'undefined';
        
        console.log('📚 Model Viewer доступен:', modelViewerAvailable);
        console.log('📚 Three.js доступен:', threeAvailable);
        
        if (!modelViewerAvailable) {
            console.warn('⚠️ Model Viewer не загрузился');
        }
    }

    bindEvents() {
        // Основные взаимодействия
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.open3dBtn.addEventListener('click', () => this.openViewer());
        this.backBtn.addEventListener('click', () => this.showMainScreen());
        
        // Управление просмотрщиком
        this.autoRotateBtn.addEventListener('click', () => this.toggleAutoRotate());
        this.resetCameraBtn.addEventListener('click', () => this.resetCamera());
        
        // Drag and Drop поддержка
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const preventDefault = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Обработчики для drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.previewArea.addEventListener(eventName, preventDefault, false);
        });

        // Визуальная обратная связь
        ['dragenter', 'dragover'].forEach(eventName => {
            this.previewArea.addEventListener(eventName, () => {
                this.previewArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            this.previewArea.addEventListener(eventName, () => {
                this.previewArea.classList.remove('drag-over');
            }, false);
        });

        // Обработка dropped файлов
        this.previewArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleDroppedFile(files[0]);
            }
        }, false);
    }

    handleDroppedFile(file) {
        // Создаем fake event для повторного использования handleFileSelect
        const fakeEvent = {
            target: {
                files: [file]
            }
        };
        this.handleFileSelect(fakeEvent);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Валидация файла
        if (!this.validateFile(file)) {
            return;
        }

        this.currentFile = file;
        this.currentFileType = AppUtils.getFileExtension(file.name);
        this.showPreview(file);
    }

    validateFile(file) {
        // Проверка размера
        if (file.size > CONFIG.MAX_FILE_SIZE) {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
            const maxSizeMB = (CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
            AppUtils.showError(
                `Файл слишком большой\nРазмер: ${fileSizeMB}MB\nМаксимальный размер: ${maxSizeMB}MB`,
                '📁 Слишком большой файл'
            );
            return false;
        }

        // Проверка формата
        const fileExtension = AppUtils.getFileExtension(file.name);
        if (!AppUtils.isValidFormat(fileExtension)) {
            const supportedFormats = Object.keys(SUPPORTED_FORMATS).join(', ');
            AppUtils.showError(
                `Поддерживаемые форматы: ${supportedFormats}`,
                '❌ Неподдерживаемый формат'
            );
            return false;
        }

        return true;
    }

    async showPreview(file) {
        try {
            this.previewPlaceholder.hidden = true;
            this.open3dBtn.disabled = true;
            this.fileName.textContent = file.name;

            // Показываем индикатор загрузки для превью
            this.previewArea.classList.add('loading');

            await this.loadStandardPreview(file);

            this.open3dBtn.disabled = false;
            this.currentState = APP_STATES.PREVIEW;
            
            AppUtils.showSuccess('Превью загружено');

        } catch (error) {
            console.error('Ошибка показа превью:', error);
            AppUtils.showError(error.message, '❌ Ошибка загрузки превью');
            this.resetPreview();
        } finally {
            this.previewArea.classList.remove('loading');
        }
    }

    async loadStandardPreview(file) {
        return new Promise(async (resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            this.previewModel.src = fileURL;

            let resolved = false;

            const cleanup = () => {
                this.previewModel.removeEventListener('load', onLoad);
                this.previewModel.removeEventListener('error', onError);
            };

            const onLoad = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve();
            };

            const onError = (e) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                URL.revokeObjectURL(fileURL);
                reject(new Error('Не удалось загрузить модель для превью'));
            };

            this.previewModel.addEventListener('load', onLoad);
            this.previewModel.addEventListener('error', onError);

            // Таймаут как fallback
            try {
                await Promise.race([
                    new Promise(resolve => this.previewModel.addEventListener('load', resolve, { once: true })),
                    new Promise((_, reject) => this.previewModel.addEventListener('error', reject, { once: true })),
                    AppUtils.createTimeoutPromise(CONFIG.PREVIEW_TIMEOUT, 'Превью загружено (таймаут)')
                ]);
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve();
                }
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(error);
                }
            }
        });
    }

    async openViewer() {
        if (!this.currentFile) {
            console.warn('Нет выбранного файла');
            return;
        }

        console.log('🎮 Открываем просмотрщик для:', this.currentFile.name);

        // Показываем индикатор загрузки
        this.loadingManager.show();

        try {
            this.viewerTitle.textContent = this.currentFile.name;
            await this.openStandardViewer(this.currentFile);

            // Скрываем индикатор и переходим
            this.loadingManager.complete();
            this.switchToViewer();

        } catch (error) {
            // Скрываем индикатор при ошибке
            this.loadingManager.hide();
            console.error('Ошибка открытия просмотрщика:', error);
            AppUtils.showError(error.message, '❌ Ошибка открытия модели');
        }
    }

    async openStandardViewer(file) {
        return new Promise(async (resolve, reject) => {
            const fileURL = URL.createObjectURL(file);
            this.mainModel.src = fileURL;

            // Настраиваем автоповорот
            this.mainModel.autoRotate = true;
            this.updateAutoRotateButton();

            let resolved = false;

            const cleanup = () => {
                this.mainModel.removeEventListener('load', onLoad);
                this.mainModel.removeEventListener('error', onError);
            };

            const onLoad = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                this.loadingManager.complete();
                resolve();
            };

            const onError = (e) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                URL.revokeObjectURL(fileURL);
                reject(new Error('Не удалось загрузить модель в просмотрщик'));
            };

            this.mainModel.addEventListener('load', onLoad);
            this.mainModel.addEventListener('error', onError);

            // Таймаут как fallback
            try {
                await Promise.race([
                    new Promise(resolve => this.mainModel.addEventListener('load', resolve, { once: true })),
                    new Promise((_, reject) => this.mainModel.addEventListener('error', reject, { once: true })),
                    AppUtils.createTimeoutPromise(CONFIG.VIEWER_TIMEOUT, 'Основная модель загружена (таймаут)')
                ]);
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    this.loadingManager.complete();
                    resolve();
                }
            } catch (error) {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    reject(error);
                }
            }
        });
    }

    switchToViewer() {
        this.mainScreen.classList.remove('active');
        this.viewerScreen.classList.add('active');
        this.currentState = APP_STATES.VIEWER;
        
        console.log('✅ Успешно перешли в режим просмотра');
    }

    toggleAutoRotate() {
        this.mainModel.autoRotate = !this.mainModel.autoRotate;
        this.updateAutoRotateButton();
    }

    updateAutoRotateButton() {
        const isActive = this.mainModel.autoRotate;
        this.autoRotateBtn.setAttribute('data-active', isActive.toString());
        this.autoRotateBtn.setAttribute('aria-label', 
            isActive ? 'Остановить автоповорот' : 'Включить автоповорот'
        );
        
        // Обновляем иконку
        this.autoRotateBtn.innerHTML = isActive ? '⏸️' : '▶️';
    }

    resetCamera() {
        if (this.mainModel.resetTurntableRotation) {
            this.mainModel.resetTurntableRotation();
        }
        this.mainModel.cameraOrbit = '0deg 75deg 105%';
    }

    showMainScreen() {
        this.viewerScreen.classList.remove('active');
        this.mainScreen.classList.add('active');
        
        // Сбрасываем состояние просмотрщика
        this.mainModel.autoRotate = false;
        this.updateAutoRotateButton();
        
        this.currentState = APP_STATES.MAIN;
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

    // Очистка ресурсов
    destroy() {
        if (this.loadingManager) {
            this.loadingManager.clearIntervals();
        }
        
        // Освобождаем URL объектов
        if (this.previewModel.src) {
            URL.revokeObjectURL(this.previewModel.src);
        }
        if (this.mainModel.src) {
            URL.revokeObjectURL(this.mainModel.src);
        }
    }
}

// ===== APP INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем поддержку необходимых API
    if (!('customElements' in window)) {
        alert('Ваш браузер не поддерживает необходимые функции. Пожалуйста, обновите браузер.');
        return;
    }

    try {
        window.app = new ModelViewerApp();
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        alert('Не удалось запустить приложение. Пожалуйста, обновите страницу.');
    }
});

// Очистка при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});
