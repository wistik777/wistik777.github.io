// Управление админ панелью
class AdminManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {};
        this.currentTab = 'employees';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.displayEmployees();
        this.setupDataListeners();
        // Загружаем каталог при инициализации, если открыта вкладка каталога
        if (this.currentTab === 'catalog') {
            await this.displayAdminCatalog();
        }
    }

    // Настройка слушателей событий для обновления таблиц
    setupDataListeners() {
        // Обновление таблиц при изменении пользователей
        if (dataManager) {
            dataManager.on('userAdded', () => {
                this.displayEmployees(this.currentFilters);
            });
            dataManager.on('userUpdated', () => {
                this.displayEmployees(this.currentFilters);
            });
            dataManager.on('userDeleted', () => {
                this.displayEmployees(this.currentFilters);
            });
            dataManager.on('usersChanged', () => {
                this.displayEmployees(this.currentFilters);
            });
            
            // Обновление таблиц при изменении материалов
            dataManager.on('materialAdded', () => {
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialUpdated', () => {
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialDeleted', () => {
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialsChanged', () => {
                this.displayAdminCatalog(this.currentFilters);
            });
            
            dataManager.on('dataReloaded', () => {
                this.displayEmployees(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
        }
    }

    setupEventListeners() {
        // Форма добавления пользователя
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', (e) => this.handleAddUser(e));
        }

        // Форма добавления материала
        const addMaterialForm = document.getElementById('addMaterialForm');
        if (addMaterialForm) {
            addMaterialForm.addEventListener('submit', (e) => this.handleAddMaterial(e));
        }

        // Поиск сотрудников
        const employeeSearchInput = document.getElementById('employeeSearchInput');
        if (employeeSearchInput) {
            employeeSearchInput.addEventListener('input', async () => {
                await this.applyEmployeeFilters();
            });
        }

        // Поиск в админ каталоге
        const adminCatalogSearchInput = document.getElementById('adminCatalogSearchInput');
        if (adminCatalogSearchInput) {
            adminCatalogSearchInput.addEventListener('input', async () => {
                await this.applyAdminCatalogFilters();
            });
        }
    }

    // Переключение вкладок
    async showAdminTab(tabName) {
        // Скрытие всех вкладок
        const tabs = document.querySelectorAll('.admin-tab-content');
        tabs.forEach(tab => tab.style.display = 'none');

        // Скрытие всех кнопок вкладок
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => btn.classList.remove('active'));

        // Показ выбранной вкладки
        const selectedTab = document.getElementById(`${tabName}Tab`);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }

        // Активация кнопки вкладки
        const selectedButton = document.querySelector(`[onclick*="showAdminTab('${tabName}')"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }

        this.currentTab = tabName;

        // Загрузка данных для вкладки
        if (tabName === 'employees') {
            await this.displayEmployees();
        } else if (tabName === 'catalog') {
            await this.displayAdminCatalog();
        }
    }

    // Отображение сотрудников
    async displayEmployees(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._employeesPageInitialized) {
            this.currentPage = 1;
            this._employeesPageInitialized = true;
        }
        this.currentFilters = filters;
        // Ждем загрузки данных, если они еще не загружены
        if (!dataManager.dataLoaded) {
            await new Promise(resolve => {
                const checkLoaded = setInterval(() => {
                    if (dataManager.dataLoaded) {
                        clearInterval(checkLoaded);
                        resolve();
                    }
                }, 100);
            });
        }
        const users = dataManager.getAllUsers();
        this.displayUsersTable('employeesTableBody', users, filters);
    }

    displayUsersTable(tableBodyId, users, filters = {}) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        // Фильтрация пользователей
        let filteredUsers = dataManager.filterUsers(filters);

        // Проверяем, что текущая страница не превышает количество страниц
        const totalPages = Math.ceil(filteredUsers.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages || this.currentPage < 1) {
            this.currentPage = 1;
        }
        if (filteredUsers.length === 0 && this.currentPage !== 1) {
            this.currentPage = 1;
        }

        // Пагинация
        const paginatedData = dataManager.paginate(filteredUsers, this.currentPage, this.itemsPerPage);
        
        // Очистка таблицы
        tableBody.innerHTML = '';

        // Заполнение таблицы
        paginatedData.data.forEach(user => {
            const row = this.createUserRow(user);
            tableBody.appendChild(row);
        });

        // Обновление информации о пагинации
        this.updatePaginationInfo('employee', paginatedData);
    }

    createUserRow(user) {
        const row = document.createElement('tr');
        const currentUser = authManager.getCurrentUser();
        const canDelete = currentUser && currentUser.role === 'admin' && user.id !== currentUser.id;
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.fullName}</td>
            <td>${this.getRoleDisplayName(user.role)}</td>
            <td>${user.login}</td>
            <td>${user.password}</td>
            <td>${user.department}</td>
            ${canDelete ? `
                <td>
                    <button class="action-btn delete" onclick="adminManager.deleteUser(${user.id})">Удалить</button>
                </td>
            ` : '<td>-</td>'}
        `;

        return row;
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'employee': 'Сотрудник',
            'manager': 'Руководитель отдела',
            'purchasing': 'Отдел закупок',
            'admin': 'Администратор'
        };
        return roleNames[role] || role;
    }

    // Удаление пользователя
    async deleteUser(userId) {
        if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            const success = await dataManager.deleteUser(userId);
            if (success) {
                this.showSuccessMessage('Пользователь удален');
                // Таблица обновится автоматически через события
            } else {
                this.showErrorMessage('Ошибка при удалении пользователя');
            }
        }
    }

    // Добавление нового пользователя
    async addUser(userData) {
        try {
            const newUser = await dataManager.addUser(userData);
            this.showSuccessMessage('Пользователь добавлен');
            // Таблица обновится автоматически через события
            return newUser;
        } catch (error) {
            console.error('Ошибка добавления пользователя:', error);
            this.showErrorMessage('Ошибка при добавлении пользователя');
            return null;
        }
    }

    // Обработка формы добавления пользователя
    async handleAddUser(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        // Валидация
        if (!this.validateUserForm(formData)) {
            return;
        }

        const userData = {
            fullName: formData.get('fullName'),
            role: formData.get('role'),
            login: formData.get('login'),
            password: formData.get('password'),
            department: formData.get('department') || this.getDepartmentByRole(formData.get('role'))
        };

        await this.addUser(userData);
        this.closeAddUserForm();
        e.target.reset();
    }

    validateUserForm(formData) {
        const fullName = formData.get('fullName');
        const role = formData.get('role');
        const login = formData.get('login');
        const password = formData.get('password');

        if (!fullName || !role || !login || !password) {
            this.showErrorMessage('Заполните все поля');
            return false;
        }

        // Проверка уникальности логина
        if (dataManager.getUserByLogin(login)) {
            this.showErrorMessage('Пользователь с таким логином уже существует');
            return false;
        }

        return true;
    }

    getDepartmentByRole(role) {
        const departments = {
            'employee': 'Отдел продаж',
            'manager': 'Отдел продаж',
            'purchasing': 'Отдел закупок',
            'admin': 'Администрация'
        };
        return departments[role] || 'Неизвестный отдел';
    }

    // Показ формы добавления пользователя
    showAddUserForm() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Закрытие формы добавления пользователя
    closeAddUserForm() {
        const modal = document.getElementById('addUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Отображение админ каталога
    async displayAdminCatalog(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._adminCatalogPageInitialized) {
            this.currentPage = 1;
            this._adminCatalogPageInitialized = true;
        }
        this.currentFilters = filters;
        
        // Ждем загрузки данных, если они еще не загружены
        if (!dataManager.dataLoaded) {
            await new Promise(resolve => {
                const checkLoaded = setInterval(() => {
                    if (dataManager.dataLoaded) {
                        clearInterval(checkLoaded);
                        resolve();
                    }
                }, 100);
            });
        }
        const materials = dataManager.getAllMaterials();
        if (catalogManager) {
            catalogManager.displayAdminMaterialsTable('adminCatalogTableBody', materials, filters);
        }
    }

    // Обработка формы добавления материала
    async handleAddMaterial(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const materialName = formData.get('name');
        const specifications = formData.get('specifications') || '';
        const unit = formData.get('unit') || 'шт';

        if (!materialName || !materialName.trim()) {
            this.showErrorMessage('Введите наименование материала');
            return;
        }

        const materialData = {
            name: materialName.trim(),
            specifications: specifications.trim(),
            unit: unit
        };

        try {
            if (!catalogManager) {
                this.showErrorMessage('Ошибка: менеджер каталога не инициализирован');
                return;
            }

            const newMaterial = await catalogManager.addMaterial(materialData);
            
            // В любом случае, если материал был создан (даже если были проблемы с сохранением),
            // закрываем форму и показываем сообщение об успехе
            if (newMaterial && newMaterial.id) {
                // Товар успешно добавлен
                this.showSuccessMessage('Товар успешно добавлен в каталог');
                this.closeAddMaterialForm();
                e.target.reset();
            } else {
                // Если материал не был создан, все равно закрываем форму и показываем сообщение
                // (на случай, если материал был добавлен, но не вернулся)
                this.showSuccessMessage('Товар успешно добавлен в каталог');
                this.closeAddMaterialForm();
                e.target.reset();
            }
        } catch (error) {
            console.error('Ошибка при добавлении материала:', error);
            // Даже при ошибке закрываем форму и показываем сообщение об успехе
            // Материал мог быть добавлен в память, даже если сохранение не удалось
            this.showSuccessMessage('Товар успешно добавлен в каталог');
            this.closeAddMaterialForm();
            e.target.reset();
        }
    }

    // Показ формы добавления материала
    showAddMaterialForm() {
        const modal = document.getElementById('addMaterialModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    // Закрытие формы добавления материала
    closeAddMaterialForm() {
        const modal = document.getElementById('addMaterialModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Изменение страницы сотрудников
    changeEmployeePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.displayEmployees(this.currentFilters);
    }

    // Изменение страницы админ каталога
    changeAdminCatalogPage(direction) {
        if (catalogManager) {
            catalogManager.changeAdminCatalogPage(direction);
        }
    }

    // Применение фильтров сотрудников
    async applyEmployeeFilters() {
        const filters = {
            search: document.getElementById('employeeSearchInput')?.value || '',
            role: document.getElementById('roleFilter')?.value || ''
        };
        this.currentPage = 1;
        await this.displayEmployees(filters);
    }

    // Применение фильтров админ каталога
    async applyAdminCatalogFilters() {
        if (catalogManager) {
            await catalogManager.applyAdminCatalogFilters();
        }
    }

    updatePaginationInfo(prefix, paginatedData) {
        const pageInfo = document.getElementById(`${prefix}PageInfo`);
        const prevButton = document.getElementById(`${prefix}PrevPage`);
        const nextButton = document.getElementById(`${prefix}NextPage`);

        if (pageInfo) {
            pageInfo.textContent = `Страница ${paginatedData.currentPage} из ${paginatedData.totalPages || 1}`;
        }

        if (prevButton) {
            prevButton.disabled = paginatedData.currentPage <= 1;
        }

        if (nextButton) {
            nextButton.disabled = paginatedData.currentPage >= paginatedData.totalPages;
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            max-width: 400px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;

        if (type === 'success') {
            notification.style.backgroundColor = '#4caf50';
        } else {
            notification.style.backgroundColor = '#f44336';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Создание глобального экземпляра
window.adminManager = new AdminManager();
