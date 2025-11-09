// Управление каталогом материалов
class CatalogManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {};
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.displayCatalog();
        this.setupDataListeners();
    }

    // Настройка слушателей событий для обновления таблиц
    setupDataListeners() {
        // Обновление таблиц при изменении материалов
        if (dataManager) {
            dataManager.on('materialAdded', () => {
                this.displayCatalog(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialUpdated', () => {
                this.displayCatalog(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialDeleted', () => {
                this.displayCatalog(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('materialsChanged', () => {
                this.displayCatalog(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
            dataManager.on('dataReloaded', () => {
                this.displayCatalog(this.currentFilters);
                this.displayAdminCatalog(this.currentFilters);
            });
        }
    }

    setupEventListeners() {
        // Поиск в каталоге
        const catalogSearchInput = document.getElementById('catalogSearchInput');
        if (catalogSearchInput) {
            catalogSearchInput.addEventListener('input', async () => {
                await this.applyCatalogFilters();
            });
        }
    }

    // Отображение каталога материалов
    async displayCatalog(filters = {}) {
        // Сбрасываем страницу на 1 при изменении фильтров или первой загрузке
        const filtersChanged = JSON.stringify(filters) !== JSON.stringify(this.currentFilters);
        if (filtersChanged || !this._catalogPageInitialized) {
            this.currentPage = 1;
            this._catalogPageInitialized = true;
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
        this.displayMaterialsTable('catalogTableBody', materials, filters);
    }

    displayMaterialsTable(tableBodyId, materials, filters = {}) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        // Фильтрация материалов
        let filteredMaterials = dataManager.filterMaterials(filters);

        // Проверяем, что текущая страница не превышает количество страниц
        const totalPages = Math.ceil(filteredMaterials.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages || this.currentPage < 1) {
            this.currentPage = 1;
        }
        if (filteredMaterials.length === 0 && this.currentPage !== 1) {
            this.currentPage = 1;
        }

        // Пагинация
        const paginatedData = dataManager.paginate(filteredMaterials, this.currentPage, this.itemsPerPage);
        
        // Очистка таблицы
        tableBody.innerHTML = '';

        // Заполнение таблицы
        paginatedData.data.forEach(material => {
            const row = this.createMaterialRow(material);
            tableBody.appendChild(row);
        });

        // Обновление информации о пагинации
        this.updatePaginationInfo('catalog', paginatedData);
    }

    createMaterialRow(material) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${material.id}</td>
            <td>${material.name}</td>
            <td>${material.specifications || '-'}</td>
            <td>${material.unit || '-'}</td>
        `;

        return row;
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

    // Изменение страницы каталога
    async changeCatalogPage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        await this.displayCatalog(this.currentFilters);
    }

    // Применение фильтров каталога
    async applyCatalogFilters() {
        const filters = {
            search: document.getElementById('catalogSearchInput')?.value || ''
        };
        this.currentPage = 1;
        await this.displayCatalog(filters);
    }

    // Отображение каталога в админ панели
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
        this.displayAdminMaterialsTable('adminCatalogTableBody', materials, filters);
    }

    displayAdminMaterialsTable(tableBodyId, materials, filters = {}) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        // Фильтрация материалов
        let filteredMaterials = dataManager.filterMaterials(filters);

        // Проверяем, что текущая страница не превышает количество страниц
        const totalPages = Math.ceil(filteredMaterials.length / this.itemsPerPage) || 1;
        if (this.currentPage > totalPages || this.currentPage < 1) {
            this.currentPage = 1;
        }
        if (filteredMaterials.length === 0 && this.currentPage !== 1) {
            this.currentPage = 1;
        }

        // Пагинация
        const paginatedData = dataManager.paginate(filteredMaterials, this.currentPage, this.itemsPerPage);
        
        // Очистка таблицы
        tableBody.innerHTML = '';

        // Заполнение таблицы
        paginatedData.data.forEach(material => {
            const row = this.createAdminMaterialRow(material);
            tableBody.appendChild(row);
        });

        // Обновление информации о пагинации
        this.updatePaginationInfo('adminCatalog', paginatedData);
    }

    createAdminMaterialRow(material) {
        const row = document.createElement('tr');
        const currentUser = authManager.getCurrentUser();
        const canEdit = currentUser && (currentUser.role === 'purchasing' || currentUser.role === 'admin');
        
        row.innerHTML = `
            <td>${material.id}</td>
            <td>${material.name}</td>
            <td>${material.specifications || '-'}</td>
            <td>${material.unit || '-'}</td>
            ${canEdit ? `
                <td>
                    <button class="action-btn delete" onclick="catalogManager.deleteMaterial(${material.id})">Удалить</button>
                </td>
            ` : '<td>-</td>'}
        `;

        return row;
    }

    // Удаление материала
    async deleteMaterial(materialId) {
        if (confirm('Вы уверены, что хотите удалить этот материал?')) {
            const success = await dataManager.deleteMaterial(materialId);
            if (success) {
                this.showSuccessMessage('Материал удален');
                // Таблица обновится автоматически через события
                // Обновление списка материалов в форме создания заявки
                if (requestManager) {
                    requestManager.loadMaterials();
                }
            } else {
                this.showErrorMessage('Ошибка при удалении материала');
            }
        }
    }

    // Добавление нового материала
    async addMaterial(materialData) {
        try {
            const newMaterial = await dataManager.addMaterial(materialData);
            // Сообщение об успехе показывается в вызывающем методе (handleAddMaterial)
            // Таблица обновится автоматически через события
            // Обновление списка материалов в форме создания заявки
            if (requestManager) {
                requestManager.loadMaterials();
            }
            return newMaterial;
        } catch (error) {
            console.error('Ошибка добавления материала:', error);
            throw error; // Пробрасываем ошибку для обработки в вызывающем методе
        }
    }

    // Изменение страницы админ каталога
    async changeAdminCatalogPage(direction) {
        this.currentPage += direction;
        if (this.currentPage < 1) this.currentPage = 1;
        await this.displayAdminCatalog(this.currentFilters);
    }

    // Применение фильтров админ каталога
    async applyAdminCatalogFilters() {
        const filters = {
            search: document.getElementById('adminCatalogSearchInput')?.value || ''
        };
        this.currentPage = 1;
        await this.displayAdminCatalog(filters);
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
window.catalogManager = new CatalogManager();
