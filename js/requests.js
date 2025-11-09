// Управление заявками
class RequestManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadMaterials();
        this.setupDataListeners();
    }

    // Настройка слушателей событий для обновления таблиц
    setupDataListeners() {
        // Обновление таблиц при изменении заявок
        if (dataManager) {
            dataManager.on('requestAdded', () => {
                this.refreshAllTables();
            });
            dataManager.on('requestUpdated', () => {
                this.refreshAllTables();
            });
            dataManager.on('requestDeleted', () => {
                this.refreshAllTables();
            });
            dataManager.on('requestsChanged', () => {
                this.refreshAllTables();
            });
            dataManager.on('dataReloaded', () => {
                this.refreshAllTables();
            });
            
            // Обновление списка материалов при изменении материалов
            dataManager.on('materialAdded', () => {
                this.loadMaterials();
            });
            dataManager.on('materialUpdated', () => {
                this.loadMaterials();
            });
            dataManager.on('materialDeleted', () => {
                this.loadMaterials();
            });
            dataManager.on('materialsChanged', () => {
                this.loadMaterials();
            });
        }
    }

    setupEventListeners() {
        // Форма создания заявки
        const createRequestForm = document.getElementById('createRequestForm');
        if (createRequestForm) {
            createRequestForm.addEventListener('submit', (e) => this.handleCreateRequest(e));
        }

        // Счетчик символов для обоснования
        const justificationField = document.getElementById('justification');
        if (justificationField) {
            justificationField.addEventListener('input', () => this.updateCharCount());
        }

        // Выбор материала из каталога
        const materialSelect = document.getElementById('materialSelect');
        if (materialSelect) {
            materialSelect.addEventListener('change', () => this.handleMaterialSelect());
        }
    }

    async loadMaterials() {
        const materialSelect = document.getElementById('materialSelect');
        if (!materialSelect) return;

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
        materialSelect.innerHTML = '<option value="">Выберите материал</option>';
        
        if (materials.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Каталог материалов пуст';
            option.disabled = true;
            materialSelect.appendChild(option);
        } else {
            materials.forEach(material => {
                const option = document.createElement('option');
                option.value = material.id;
                option.textContent = material.name + (material.specifications ? ` (${material.specifications})` : '');
                materialSelect.appendChild(option);
            });
        }
    }

    handleMaterialSelect() {
        const materialSelect = document.getElementById('materialSelect');
        const unitField = document.getElementById('unit');
        
        if (materialSelect.value) {
            // Получаем выбранный материал
            const material = dataManager.getMaterialById(parseInt(materialSelect.value));
            if (material && unitField) {
                // Автоматически устанавливаем единицу измерения из материала
                unitField.value = material.unit || '';
            }
        }
    }

    updateCharCount() {
        const justificationField = document.getElementById('justification');
        const charCountElement = document.getElementById('charCount');
        
        if (justificationField && charCountElement) {
            const count = justificationField.value.length;
            charCountElement.textContent = count;
            
            if (count > 250) {
                charCountElement.style.color = '#f44336';
            } else if (count > 200) {
                charCountElement.style.color = '#ff9800';
            } else {
                charCountElement.style.color = '#757575';
            }
        }
    }

    async handleCreateRequest(e) {
        e.preventDefault();
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) {
            this.showErrorMessage('Необходимо войти в систему');
            window.location.href = 'login.html';
            return;
        }

        const formData = new FormData(e.target);
        const materialSelect = document.getElementById('materialSelect');
        
        // Валидация
        if (!this.validateRequestForm()) {
            return;
        }

        try {
            // Получаем выбранный материал
            if (!materialSelect.value) {
                this.showErrorMessage('Выберите материал из каталога');
                return;
            }

            const material = dataManager.getMaterialById(parseInt(materialSelect.value));
            if (!material) {
                this.showErrorMessage('Выбранный материал не найден');
                return;
            }

            const requestData = {
                userId: currentUser.id,
                materialName: material.name,
                quantity: parseInt(formData.get('quantity')),
                unit: formData.get('unit') || material.unit,
                requiredDate: formData.get('requiredDate'),
                justification: formData.get('justification')
            };

            const newRequest = await dataManager.addRequest(requestData);
            
            // Очистка формы
            e.target.reset();
            this.updateCharCount();
            
            // Перезагружаем список материалов на случай, если были изменения
            await this.loadMaterials();
            
            // Показ уведомления об успехе
            this.showSuccessMessage('Заявка успешно создана и отправлена на согласование');
            
            // Обновление таблиц заявок (события уже обработаются автоматически)
            
        } catch (error) {
            console.error('Ошибка создания заявки:', error);
            this.showErrorMessage('Произошла ошибка при создании заявки');
        }
    }

    validateRequestForm() {
        const materialSelect = document.getElementById('materialSelect');
        const quantityField = document.getElementById('quantity');
        const unitField = document.getElementById('unit');
        const requiredDateField = document.getElementById('requiredDate');
        const justificationField = document.getElementById('justification');

        // Проверка материала
        if (!materialSelect.value) {
            this.showFieldError('materialSelect', 'Выберите материал из каталога');
            return false;
        }

        // Проверка количества
        if (!quantityField.value || parseInt(quantityField.value) <= 0) {
            this.showFieldError('quantity', 'Введите корректное количество');
            return false;
        }

        // Проверка единицы измерения
        if (!unitField.value) {
            this.showFieldError('unit', 'Выберите единицу измерения');
            return false;
        }

        // Проверка даты
        if (!requiredDateField.value) {
            this.showFieldError('requiredDate', 'Выберите дату, к которой нужен материал');
            return false;
        }

        // Проверка обоснования
        if (!justificationField.value.trim()) {
            this.showFieldError('justification', 'Введите обоснование необходимости');
            return false;
        }

        if (justificationField.value.trim().length < 10) {
            this.showFieldError('justification', 'Обоснование должно содержать минимум 10 символов');
            return false;
        }

        if (justificationField.value.trim().length > 250) {
            this.showFieldError('justification', 'Обоснование не должно превышать 250 символов');
            return false;
        }

        return true;
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Удаление предыдущих ошибок
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Добавление новой ошибки
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: #f44336;
            font-size: 0.9rem;
            margin-top: 0.25rem;
        `;
        errorElement.textContent = message;
        field.parentNode.appendChild(errorElement);

        // Подсветка поля
        field.style.borderColor = '#f44336';
        field.focus();

        // Удаление ошибки при изменении поля
        field.addEventListener('input', () => {
            errorElement.remove();
            field.style.borderColor = '';
        }, { once: true });
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

    // Отображение заявок на главной странице
    displayHomeRequests(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._homePageInitialized) {
            this.currentPage = 1;
            this._homePageInitialized = true;
        }
        this.currentFilters = filters;
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        // Ждем загрузки данных, если они еще не загружены
        if (!dataManager.dataLoaded) {
            setTimeout(() => this.displayHomeRequests(filters), 100);
            return;
        }

        let requests;
        let showActions = false;
        
        if (currentUser.role === 'purchasing' || currentUser.role === 'admin') {
            requests = dataManager.getAllRequests();
            showActions = true;
        } else if (currentUser.role === 'manager') {
            // Для руководителей показываем только pending заявки их отдела
            requests = dataManager.getAllRequests().filter(r => {
                if (r.status !== 'pending') return false;
                const requestUser = dataManager.getUserById(r.userId);
                return requestUser && requestUser.department === currentUser.department;
            });
            showActions = true; // Руководители могут утверждать/отклонять заявки
        } else {
            requests = dataManager.getUserRequests(currentUser.id);
            showActions = false; // Обычные сотрудники не могут выполнять действия
        }

        this.displayRequestsTable('requestsTableBody', requests, filters, showActions);
    }

    // Отображение заявок в личном кабинете
    displayProfileRequests(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._profilePageInitialized) {
            this.currentPage = 1;
            this._profilePageInitialized = true;
        }
        this.currentFilters = filters;
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        // Ждем загрузки данных, если они еще не загружены
        if (!dataManager.dataLoaded) {
            setTimeout(() => this.displayProfileRequests(filters), 100);
            return;
        }

        const requests = dataManager.getUserRequests(currentUser.id);
        this.displayRequestsTable('profileRequestsTableBody', requests, filters);
    }

    // Отображение заявок в панели управления
    displayAdminRequests(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._adminPageInitialized) {
            this.currentPage = 1;
            this._adminPageInitialized = true;
        }
        this.currentFilters = filters;
        
        const currentUser = authManager.getCurrentUser();
        if (!currentUser) return;

        // Ждем загрузки данных, если они еще не загружены
        if (!dataManager.dataLoaded) {
            setTimeout(() => this.displayAdminRequests(filters), 100);
            return;
        }

        let requests;
        if (currentUser.role === 'purchasing') {
            // Для отдела закупок показываем только approved и confirmed заявки
            requests = dataManager.getAllRequests().filter(r => 
                r.status === 'approved' || r.status === 'confirmed'
            );
            // Сортируем: approved сверху, затем confirmed
            requests.sort((a, b) => {
                if (a.status === 'approved' && b.status === 'confirmed') return -1;
                if (a.status === 'confirmed' && b.status === 'approved') return 1;
                return 0;
            });
        } else if (currentUser.role === 'admin') {
            // Для админа показываем все заявки
            requests = dataManager.getAllRequests();
        } else {
            requests = [];
        }

        this.displayRequestsTable('adminRequestsTableBody', requests, filters, true);
    }

    displayRequestsTable(tableBodyId, requests, filters = {}, showActions = false) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        // Фильтрация заявок
        let filteredRequests = requests;
        
        // Применяем фильтры
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredRequests = filteredRequests.filter(r => 
                r.materialName.toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.status) {
            filteredRequests = filteredRequests.filter(r => r.status === filters.status);
        }
        
        if (filters.date) {
            const filterDate = new Date(filters.date).toDateString();
            filteredRequests = filteredRequests.filter(r => 
                new Date(r.createdAt).toDateString() === filterDate
            );
        }

        // Для панели управления отдела закупок - сортировка: approved сверху
        if (tableBodyId === 'adminRequestsTableBody') {
            const currentUser = authManager.getCurrentUser();
            if (currentUser && currentUser.role === 'purchasing') {
                filteredRequests.sort((a, b) => {
                    if (a.status === 'approved' && b.status === 'confirmed') return -1;
                    if (a.status === 'confirmed' && b.status === 'approved') return 1;
                    // Если одинаковый статус, сортируем по дате (новые сверху)
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            }
        }

        // Проверяем, что текущая страница не превышает количество страниц
        const totalPages = Math.ceil(filteredRequests.length / this.itemsPerPage) || 1;
        // Принудительно устанавливаем страницу на 1, если она больше доступных страниц или меньше 1
        if (this.currentPage > totalPages || this.currentPage < 1) {
            this.currentPage = 1;
        }
        // Если данных нет, но страница не 1, сбрасываем на 1
        if (filteredRequests.length === 0 && this.currentPage !== 1) {
            this.currentPage = 1;
        }

        // Пагинация
        const paginatedData = dataManager.paginate(filteredRequests, this.currentPage, this.itemsPerPage);
        
        // Очистка таблицы
        tableBody.innerHTML = '';

        // Показываем/скрываем колонку "Действия" для главной страницы
        if (tableBodyId === 'requestsTableBody') {
            const actionsHeader = document.getElementById('actionsHeader');
            if (actionsHeader) {
                actionsHeader.style.display = showActions ? 'table-cell' : 'none';
            }
        }

        // Заполнение таблицы
        if (paginatedData.data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="${showActions ? '4' : '3'}" style="text-align: center; padding: 20px; color: #666;">Нет данных для отображения</td>`;
            tableBody.appendChild(row);
        } else {
            paginatedData.data.forEach(request => {
                const row = this.createRequestRow(request, showActions);
                tableBody.appendChild(row);
            });
        }

        // Обновление информации о пагинации
        this.updatePaginationInfo(tableBodyId.replace('TableBody', ''), paginatedData);
    }

    createRequestRow(request, showActions = false) {
        const row = document.createElement('tr');
        
        // Получение пользователя заявки
        const user = dataManager.getUserById(request.userId);
        const userName = user ? user.fullName : 'Неизвестный пользователь';

        row.innerHTML = `
            <td>${request.materialName}</td>
            <td><span class="status status-${request.status}">${this.getStatusDisplayName(request.status)}</span></td>
            <td>${this.formatDate(request.createdAt)}</td>
            ${showActions ? `<td>${this.createActionButtons(request)}</td>` : ''}
        `;

        return row;
    }

    getStatusDisplayName(status) {
        const statusNames = {
            'pending': 'В обработке',
            'approved': 'Согласована',
            'rejected': 'Отклонена',
            'confirmed': 'Подтверждена'
        };
        return statusNames[status] || status;
    }

    createActionButtons(request) {
        let buttons = '';
        const currentUser = authManager.getCurrentUser();
        
        if (!currentUser) return '';
        
        // Для руководителей - только утверждение/отклонение pending заявок
        if (currentUser.role === 'manager' && request.status === 'pending') {
            // Проверяем, что заявка от сотрудника того же отдела
            const requestUser = dataManager.getUserById(request.userId);
            if (requestUser && requestUser.department === currentUser.department) {
                buttons += `
                    <button class="action-btn edit" onclick="requestManager.approveRequest(${request.id})">Утвердить</button>
                    <button class="action-btn delete" onclick="requestManager.rejectRequest(${request.id})">Отклонить</button>
                `;
            }
        }
        
        // Для админов - все действия
        if (currentUser.role === 'admin') {
            if (request.status === 'pending') {
                buttons += `
                    <button class="action-btn edit" onclick="requestManager.approveRequest(${request.id})">Утвердить</button>
                    <button class="action-btn delete" onclick="requestManager.rejectRequest(${request.id})">Отклонить</button>
                `;
            } else if (request.status === 'approved') {
                buttons += `<button class="action-btn confirm" onclick="requestManager.confirmRequest(${request.id})">Подтвердить</button>`;
            }
        }
        
        // Для отдела закупок - только подтверждение approved заявок
        if (currentUser.role === 'purchasing' && request.status === 'approved') {
            buttons += `<button class="action-btn confirm" onclick="requestManager.confirmRequest(${request.id})">Подтвердить</button>`;
        }
        
        return buttons || '-';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updatePaginationInfo(prefix, paginatedData) {
        const pageInfo = document.getElementById(`${prefix}PageInfo`);
        const prevButton = document.getElementById(`${prefix}PrevPage`);
        const nextButton = document.getElementById(`${prefix}NextPage`);

        if (pageInfo) {
            const totalPages = paginatedData.totalPages || 1;
            pageInfo.textContent = `Страница ${paginatedData.currentPage} из ${totalPages}`;
        }

        if (prevButton) {
            // Блокируем кнопку "Предыдущая" если мы на первой странице или нет данных
            prevButton.disabled = paginatedData.currentPage <= 1 || paginatedData.totalItems === 0;
        }

        if (nextButton) {
            // Блокируем кнопку "Следующая" если мы на последней странице или нет данных
            nextButton.disabled = paginatedData.currentPage >= (paginatedData.totalPages || 1) || paginatedData.totalItems === 0;
        }
    }

    // Подтверждение заявки
    async confirmRequest(requestId) {
        if (confirm('Подтвердить заявку?')) {
            const updatedRequest = await dataManager.updateRequest(requestId, { status: 'confirmed' });
            if (updatedRequest) {
                this.showSuccessMessage('Заявка подтверждена');
                // Таблица обновится автоматически через события
            } else {
                this.showErrorMessage('Ошибка при подтверждении заявки');
            }
        }
    }

    // Утверждение заявки
    async approveRequest(requestId) {
        if (confirm('Утвердить заявку?')) {
            const updatedRequest = await dataManager.updateRequest(requestId, { status: 'approved' });
            if (updatedRequest) {
                this.showSuccessMessage('Заявка утверждена');
                // Таблица обновится автоматически через события
            } else {
                this.showErrorMessage('Ошибка при утверждении заявки');
            }
        }
    }

    // Отклонение заявки
    async rejectRequest(requestId) {
        const comment = prompt('Укажите причину отклонения:');
        if (comment !== null && comment.trim()) {
            const updatedRequest = await dataManager.updateRequest(requestId, { 
                status: 'rejected',
                rejectionComment: comment.trim()
            });
            if (updatedRequest) {
                this.showSuccessMessage('Заявка отклонена');
                // Таблица обновится автоматически через события
            } else {
                this.showErrorMessage('Ошибка при отклонении заявки');
            }
        }
    }

    // Обновление всех таблиц
    refreshAllTables() {
        this.displayHomeRequests(this.currentFilters);
        this.displayProfileRequests(this.currentFilters);
        this.displayAdminRequests(this.currentFilters);
    }

    // Изменение страницы
    changePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.refreshAllTables();
    }

    changeProfilePage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.displayProfileRequests(this.currentFilters);
    }

    changeAdminPage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        this.displayAdminRequests(this.currentFilters);
    }

    // Применение фильтров
    applyFilters() {
        const filters = {
            search: document.getElementById('searchInput')?.value || '',
            status: document.getElementById('statusFilter')?.value || '',
            date: document.getElementById('dateFilter')?.value || ''
        };
        this.currentPage = 1;
        this.displayHomeRequests(filters);
    }

    applyProfileFilters() {
        const filters = {
            search: document.getElementById('profileSearchInput')?.value || '',
            status: document.getElementById('profileStatusFilter')?.value || '',
            date: document.getElementById('profileDateFilter')?.value || ''
        };
        this.currentPage = 1;
        this.displayProfileRequests(filters);
    }

    applyAdminFilters() {
        const filters = {
            search: document.getElementById('adminSearchInput')?.value || '',
            status: document.getElementById('adminStatusFilter')?.value || '',
            date: document.getElementById('adminDateFilter')?.value || ''
        };
        this.currentPage = 1;
        this.displayAdminRequests(filters);
    }
}

// Создание глобального экземпляра
window.requestManager = new RequestManager();
