// Основной файл приложения
class App {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthAndLoadPage();
    }

    setupEventListeners() {
        // Обработка нажатий клавиш
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Обработка кликов вне модальных окон
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    checkAuthAndLoadPage() {
        // Определение текущей страницы
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        // Если это страница входа, не проверяем авторизацию
        if (page === 'login.html') {
            return;
        }

        const currentUser = authManager.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Проверка доступа к панели управления
        if (page === 'admin-panel.html') {
            if (currentUser.role !== 'purchasing' && currentUser.role !== 'admin') {
                window.location.href = 'index.html';
                return;
            }
        }

        this.loadPageData(page);
    }

    // Показ страницы
    showPage(pageName) {
        // Скрытие всех страниц
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.style.display = 'none');

        // Показ выбранной страницы
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        this.currentPage = pageName;

        // Загрузка данных для страницы
        this.loadPageData(pageName);
    }

    // Загрузка данных для страницы
    async loadPageData(pageName) {
        // Проверка авторизации
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // Обновление интерфейса
        authManager.updateUserInterface();

        // Загрузка данных в зависимости от страницы
        const page = pageName.toLowerCase();
        
        if (page.includes('index') || page === 'home') {
            if (requestManager) {
                requestManager.displayHomeRequests();
            }
        } else if (page.includes('create-request') || page === 'createrequest') {
            if (requestManager) {
                await requestManager.loadMaterials();
            }
        } else if (page.includes('profile')) {
            if (requestManager) {
                requestManager.displayProfileRequests();
            }
        } else if (page.includes('admin-panel')) {
            // Проверка доступа к панели управления
            if (currentUser.role === 'purchasing' || currentUser.role === 'admin') {
                if (requestManager) {
                    requestManager.displayAdminRequests();
                }
            } else {
                window.location.href = 'index.html';
            }
        } else if (page.includes('admin.html')) {
            if (adminManager) {
                adminManager.showAdminTab('employees');
            }
        } else if (page.includes('catalog')) {
            if (catalogManager) {
                catalogManager.displayCatalog();
            }
        }
    }

    // Закрытие всех модальных окон
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.id !== 'authModal') {
                modal.style.display = 'none';
            }
        });
    }

    // Выход из системы
    logout() {
        authManager.logout();
    }

    // Применение фильтров
    applyFilters() {
        if (requestManager) requestManager.applyFilters();
    }

    applyProfileFilters() {
        if (requestManager) requestManager.applyProfileFilters();
    }

    applyAdminFilters() {
        if (requestManager) requestManager.applyAdminFilters();
    }

    applyCatalogFilters() {
        if (catalogManager) catalogManager.applyCatalogFilters();
    }

    applyAdminCatalogFilters() {
        if (catalogManager) catalogManager.applyAdminCatalogFilters();
    }

    applyEmployeeFilters() {
        if (adminManager) adminManager.applyEmployeeFilters();
    }

    // Изменение страниц
    changePage(direction) {
        if (requestManager) requestManager.changePage(direction);
    }

    changeProfilePage(direction) {
        if (requestManager) requestManager.changeProfilePage(direction);
    }

    changeAdminPage(direction) {
        if (requestManager) requestManager.changeAdminPage(direction);
    }

    changeCatalogPage(direction) {
        if (catalogManager) catalogManager.changeCatalogPage(direction);
    }

    changeAdminCatalogPage(direction) {
        if (catalogManager) catalogManager.changeAdminCatalogPage(direction);
    }

    changeEmployeePage(direction) {
        if (adminManager) adminManager.changeEmployeePage(direction);
    }

    // Показ админ панели
    showAdminPanel() {
        this.showPage('adminPanel');
    }

    // Показ вкладки админ панели
    showAdminTab(tabName) {
        if (adminManager) adminManager.showAdminTab(tabName);
    }

    // Показ форм
    showAddUserForm() {
        if (adminManager) adminManager.showAddUserForm();
    }

    closeAddUserForm() {
        if (adminManager) adminManager.closeAddUserForm();
    }

    showAddMaterialForm() {
        if (adminManager) adminManager.showAddMaterialForm();
    }

    closeAddMaterialForm() {
        if (adminManager) adminManager.closeAddMaterialForm();
    }
}

// Создание глобального экземпляра приложения
window.app = new App();

// Глобальные функции для HTML
window.showPage = (pageName) => {
    if (app) app.showPage(pageName);
};

window.logout = () => {
    if (app) app.logout();
};

window.applyFilters = () => {
    if (app) app.applyFilters();
};

window.applyProfileFilters = () => {
    if (app) app.applyProfileFilters();
};

window.applyAdminFilters = () => {
    if (app) app.applyAdminFilters();
};

window.applyCatalogFilters = () => {
    if (app) app.applyCatalogFilters();
};

window.applyAdminCatalogFilters = () => {
    if (app) app.applyAdminCatalogFilters();
};

window.applyEmployeeFilters = () => {
    if (app) app.applyEmployeeFilters();
};

window.changePage = (direction) => {
    if (app) app.changePage(direction);
};

window.changeProfilePage = (direction) => {
    if (app) app.changeProfilePage(direction);
};

window.changeAdminPage = (direction) => {
    if (app) app.changeAdminPage(direction);
};

window.changeCatalogPage = (direction) => {
    if (app) app.changeCatalogPage(direction);
};

window.changeAdminCatalogPage = (direction) => {
    if (app) app.changeAdminCatalogPage(direction);
};

window.changeEmployeePage = (direction) => {
    if (app) app.changeEmployeePage(direction);
};

window.showAdminTab = (tabName) => {
    if (app) app.showAdminTab(tabName);
};

window.showAddUserForm = () => {
    if (app) app.showAddUserForm();
};

window.closeAddUserForm = () => {
    if (app) app.closeAddUserForm();
};

window.showAddMaterialForm = () => {
    if (app) app.showAddMaterialForm();
};

window.closeAddMaterialForm = () => {
    if (app) app.closeAddMaterialForm();
};

// Добавление CSS анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
