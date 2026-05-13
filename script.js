// Файл: script.js
// Полностью рабочий скрипт для главной страницы 3D Constructor (GitHub Pages)

// --- Основная навигация ---
function navigateTo(section) {
    switch(section) {
        case 'converter':
            // 1. Ваш основной приоритет: открыть РАБОТАЮЩИЙ онлайн-конвертер
            window.location.href = 'https://poserval.github.io/3D-Model-Viewer/converter.html';
            break;
        case 'generator':
            // 2. Заглушка для генератора
            showToast('✨ Генератор 3D будет после настройки бэкенда');
            break;
        case 'catalog':
            // 3. Заглушка для каталога
            showToast('📚 Каталог моделей в разработке');
            break;
        default:
            showToast('❓ Раздел в разработке');
    }
}

// --- Система уведомлений (Toasts) ---
function showToast(message, isError = false) {
    // Ищем элемент уведомлений. На веб-странице он должен присутствовать.
    const toast = document.getElementById('toast-message');
    if (!toast) {
        console.warn('Элемент #toast-message не найден на странице.');
        return;
    }

    // Останавливаем предыдущую анимацию, если она была
    if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
    }
    toast.classList.remove('show');

    // Устанавливаем текст и стиль
    toast.textContent = message;
    toast.style.background = isError ? 'rgba(231, 76, 60, 0.95)' : 'rgba(0, 0, 0, 0.85)';
    
    // Принудительно запускаем reflow, чтобы сбросить анимацию
    void toast.offsetWidth;
    
    // Показываем уведомление
    toast.classList.add('show');

    // Автоматически скрываем через 2.5 секунды
    toast.timeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toast.style.background = 'rgba(0, 0, 0, 0.85)';
    }, 2500);
}

// --- Функция для кнопки 3D Viewer (заглушка) ---
function openViewerApp() {
    showToast('📱 Отдельное приложение 3D Viewer будет доступно позже');
}

// --- Плавная анимация появления кнопок при загрузке страницы ---
function animateButtonsOnLoad() {
    const buttons = document.querySelectorAll('.main-btn');
    if (buttons.length === 0) return;

    buttons.forEach((btn, index) => {
        // Сбрасываем возможные inline-стили от предыдущих запусков
        btn.style.transition = '';
        btn.style.opacity = '0';
        btn.style.transform = 'translateY(20px)';

        // Устанавливаем анимацию с задержкой для каждой кнопки
        setTimeout(() => {
            btn.style.transition = 'all 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
            btn.style.opacity = '1';
            btn.style.transform = 'translateY(0)';
        }, index * 100); // Задержка 100ms между кнопками
    });
}

// --- Инициализация страницы после полной загрузки DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏗️ 3D Constructor: Главная страница загружена и готова к работе.');
    animateButtonsOnLoad(); // Запускаем анимацию кнопок
});

// Делаем функции доступными глобально (для вызова из HTML-атрибутов onclick)
window.navigateTo = navigateTo;
window.showToast = showToast;
window.openViewerApp = openViewerApp;
