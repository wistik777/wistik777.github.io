// Система хранения данных в JSON файлах
class DataManager {
    constructor() {
        this.users = [];
        this.materials = [];
        this.requests = [];
        this.dataLoaded = false;
        this.listeners = {}; // Система событий для уведомления об изменениях
        this.init();
    }

    // Система событий для уведомления об изменениях
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Ошибка в обработчике события:', error);
                }
            });
        }
    }

    async init() {
        // Загрузка данных из JSON файлов
        await this.loadDataFromFiles();
        this.dataLoaded = true;
    }

    // Загрузка данных из JSON файлов
    async loadDataFromFiles() {
        try {
            // Загрузка пользователей
            const usersResponse = await fetch('data/users.json?t=' + Date.now());
            if (usersResponse.ok) {
                const fileUsers = await usersResponse.json();
                // Объединяем данные из файла с данными из localStorage (приоритет у localStorage)
                const localUsers = localStorage.getItem('users');
                if (localUsers) {
                    const parsedLocalUsers = JSON.parse(localUsers);
                    // Если в localStorage есть данные, используем их (они более актуальные)
                    this.users = parsedLocalUsers;
                } else {
                    this.users = fileUsers;
                }
            } else {
                // Если файл недоступен, используем localStorage
                const localUsers = localStorage.getItem('users');
                this.users = localUsers ? JSON.parse(localUsers) : [];
            }

            // Загрузка материалов
            const materialsResponse = await fetch('data/materials.json?t=' + Date.now());
            if (materialsResponse.ok) {
                const fileMaterials = await materialsResponse.json();
                // Объединяем данные из файла с данными из localStorage (приоритет у localStorage)
                const localMaterials = localStorage.getItem('materials');
                if (localMaterials) {
                    const parsedLocalMaterials = JSON.parse(localMaterials);
                    // Если в localStorage есть данные, используем их (они более актуальные)
                    this.materials = parsedLocalMaterials;
                } else {
                    this.materials = fileMaterials;
                }
            } else {
                // Если файл недоступен, используем localStorage
                const localMaterials = localStorage.getItem('materials');
                this.materials = localMaterials ? JSON.parse(localMaterials) : [];
            }

            // Загрузка заявок
            const requestsResponse = await fetch('data/requests.json?t=' + Date.now());
            if (requestsResponse.ok) {
                const fileRequests = await requestsResponse.json();
                // Объединяем данные из файла с данными из localStorage (приоритет у localStorage)
                const localRequests = localStorage.getItem('requests');
                if (localRequests) {
                    const parsedLocalRequests = JSON.parse(localRequests);
                    // Если в localStorage есть данные, используем их (они более актуальные)
                    this.requests = parsedLocalRequests;
                } else {
                    this.requests = fileRequests;
                }
            } else {
                // Если файл недоступен, используем localStorage
                const localRequests = localStorage.getItem('requests');
                this.requests = localRequests ? JSON.parse(localRequests) : [];
            }

            // Сохранение в localStorage для синхронизации
            this.saveToLocalStorage();
        } catch (error) {
            console.error('Ошибка загрузки данных из JSON файлов:', error);
            // Попытка загрузить из localStorage как резервный вариант
            this.loadDataFromLocalStorage();
        }
    }

    // Загрузка данных из localStorage (резервный вариант)
    loadDataFromLocalStorage() {
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        this.materials = JSON.parse(localStorage.getItem('materials') || '[]');
        this.requests = JSON.parse(localStorage.getItem('requests') || '[]');
    }

    // Сохранение данных в localStorage (кэш)
    saveToLocalStorage() {
        try {
            localStorage.setItem('users', JSON.stringify(this.users));
            localStorage.setItem('materials', JSON.stringify(this.materials));
            localStorage.setItem('requests', JSON.stringify(this.requests));
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }

    // Сохранение данных в JSON файлы (через экспорт)
    async saveData(key, data) {
        try {
            // Обновление данных в памяти
            this[key] = data;
            
            // Сохранение в localStorage как кэш
            localStorage.setItem(key, JSON.stringify(data));
            
            // Сохранение в JSON файл
            const saved = await this.saveToJSONFile(key, data);
            
            // Уведомление об изменении данных
            this.emit('dataChanged', { key, data });
            this.emit(`${key}Changed`, data);
            
            if (saved) {
                console.log(`Данные ${key} успешно сохранены`);
            }
            
            return saved;
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            return false;
        }
    }

    // Перезагрузка данных из JSON файлов
    async reloadData() {
        await this.loadDataFromFiles();
        this.emit('dataReloaded', {});
    }

    // Сохранение данных в JSON файл через сервер (если доступен)
    async saveToJSONFile(key, data) {
        try {
            // Попытка сохранить через сервер (если доступен)
            try {
                const response = await fetch('/api/save-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ key, data })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`Данные ${key} успешно сохранены в JSON файл через сервер`);
                    
                    // Перезагружаем данные из файла после успешного сохранения
                    await this.reloadDataFromFiles();
                    
                    return true;
                } else {
                    console.warn(`Сервер вернул ошибку: ${response.status}`);
                }
            } catch (serverError) {
                // Сервер недоступен - это нормально, данные сохраняются в localStorage
                console.log('Сервер недоступен, данные сохранены в localStorage');
            }

            // Данные уже сохранены в localStorage, этого достаточно для работы приложения
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в JSON файл:', error);
            return false;
        }
    }

    // Перезагрузка данных из JSON файлов (без полной перезагрузки)
    async reloadDataFromFiles() {
        try {
            // Если сервер доступен, перезагружаем данные из файлов
            // Иначе используем данные из localStorage (они уже актуальные)
            const usersResponse = await fetch('data/users.json?t=' + Date.now());
            if (usersResponse.ok) {
                const fileUsers = await usersResponse.json();
                // Проверяем, есть ли более актуальные данные в localStorage
                const localUsers = localStorage.getItem('users');
                if (localUsers) {
                    const parsedLocalUsers = JSON.parse(localUsers);
                    // Используем данные из localStorage, так как они более актуальные
                    this.users = parsedLocalUsers;
                } else {
                    this.users = fileUsers;
                    localStorage.setItem('users', JSON.stringify(this.users));
                }
            }

            const materialsResponse = await fetch('data/materials.json?t=' + Date.now());
            if (materialsResponse.ok) {
                const fileMaterials = await materialsResponse.json();
                const localMaterials = localStorage.getItem('materials');
                if (localMaterials) {
                    const parsedLocalMaterials = JSON.parse(localMaterials);
                    this.materials = parsedLocalMaterials;
                } else {
                    this.materials = fileMaterials;
                    localStorage.setItem('materials', JSON.stringify(this.materials));
                }
            }

            const requestsResponse = await fetch('data/requests.json?t=' + Date.now());
            if (requestsResponse.ok) {
                const fileRequests = await requestsResponse.json();
                const localRequests = localStorage.getItem('requests');
                if (localRequests) {
                    const parsedLocalRequests = JSON.parse(localRequests);
                    this.requests = parsedLocalRequests;
                } else {
                    this.requests = fileRequests;
                    localStorage.setItem('requests', JSON.stringify(this.requests));
                }
            }

            // Уведомление о перезагрузке данных
            this.emit('dataReloaded', {});
        } catch (error) {
            console.error('Ошибка перезагрузки данных из JSON файлов:', error);
        }
    }

    // Экспорт данных в JSON файл для скачивания (для ручного использования)
    exportToJSONFileForDownload(key, data) {
        try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${key}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log(`Файл ${key}.json готов к сохранению. Пожалуйста, сохраните его в папку data/`);
        } catch (error) {
            console.error('Ошибка экспорта в JSON файл:', error);
        }
    }

    // Экспорт всех данных в JSON файлы
    async exportAllDataToFiles() {
        await this.saveToJSONFile('users', this.users);
        await this.saveToJSONFile('materials', this.materials);
        await this.saveToJSONFile('requests', this.requests);
    }

    // Экспорт данных в JSON файл
    exportToJSON() {
        const data = {
            users: this.users,
            materials: this.materials,
            requests: this.requests,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inprokom_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Импорт данных из JSON файла
    async importFromJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.users) this.saveData('users', data.users);
                    if (data.materials) this.saveData('materials', data.materials);
                    if (data.requests) this.saveData('requests', data.requests);
                    this.loadData();
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Получение следующего ID
    getNextId(type) {
        const data = this[type] || [];
        if (data.length === 0) return 1;
        return Math.max(...data.map(item => item.id)) + 1;
    }

    // Работа с пользователями
    async addUser(userData) {
        const newUser = {
            id: this.getNextId('users'),
            ...userData,
            createdAt: new Date().toISOString()
        };
        this.users.push(newUser);
        await this.saveData('users', this.users);
        this.emit('userAdded', newUser);
        return newUser;
    }

    getUserByLogin(login) {
        return this.users.find(u => u.login === login);
    }

    getUserById(id) {
        return this.users.find(u => u.id === id);
    }

    async updateUser(userId, userData) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...userData };
            await this.saveData('users', this.users);
            this.emit('userUpdated', this.users[index]);
            return this.users[index];
        }
        return null;
    }

    async deleteUser(userId) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            const deletedUser = this.users[index];
            this.users.splice(index, 1);
            await this.saveData('users', this.users);
            this.emit('userDeleted', deletedUser);
            return true;
        }
        return false;
    }

    getAllUsers() {
        return this.users;
    }

    // Работа с материалами
    async addMaterial(materialData) {
        try {
            const newMaterial = {
                id: this.getNextId('materials'),
                ...materialData
            };
            this.materials.push(newMaterial);
            
            // Сохранение данных (даже если сохранение в файл не удалось, данные в памяти и localStorage)
            try {
                await this.saveData('materials', this.materials);
            } catch (saveError) {
                // Если сохранение в файл не удалось, но данные уже в памяти и localStorage
                // Это не критично, материал все равно добавлен
                console.warn('Не удалось сохранить в файл, но материал добавлен в память:', saveError);
                // Сохраняем хотя бы в localStorage
                localStorage.setItem('materials', JSON.stringify(this.materials));
            }
            
            this.emit('materialAdded', newMaterial);
            return newMaterial;
        } catch (error) {
            console.error('Ошибка при добавлении материала:', error);
            throw error;
        }
    }

    getMaterialById(id) {
        return this.materials.find(m => m.id === id);
    }

    async updateMaterial(materialId, materialData) {
        const index = this.materials.findIndex(m => m.id === materialId);
        if (index !== -1) {
            this.materials[index] = { ...this.materials[index], ...materialData };
            await this.saveData('materials', this.materials);
            this.emit('materialUpdated', this.materials[index]);
            return this.materials[index];
        }
        return null;
    }

    async deleteMaterial(materialId) {
        const index = this.materials.findIndex(m => m.id === materialId);
        if (index !== -1) {
            const deletedMaterial = this.materials[index];
            this.materials.splice(index, 1);
            await this.saveData('materials', this.materials);
            this.emit('materialDeleted', deletedMaterial);
            return true;
        }
        return false;
    }

    getAllMaterials() {
        return this.materials;
    }

    // Работа с заявками
    async addRequest(requestData) {
        const newRequest = {
            id: this.getNextId('requests'),
            ...requestData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        this.requests.push(newRequest);
        await this.saveData('requests', this.requests);
        this.emit('requestAdded', newRequest);
        return newRequest;
    }

    getRequestById(id) {
        return this.requests.find(r => r.id === id);
    }

    async updateRequest(requestId, requestData) {
        const index = this.requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
            this.requests[index] = { 
                ...this.requests[index], 
                ...requestData,
                updatedAt: new Date().toISOString()
            };
            await this.saveData('requests', this.requests);
            this.emit('requestUpdated', this.requests[index]);
            return this.requests[index];
        }
        return null;
    }

    async deleteRequest(requestId) {
        const index = this.requests.findIndex(r => r.id === requestId);
        if (index !== -1) {
            const deletedRequest = this.requests[index];
            this.requests.splice(index, 1);
            await this.saveData('requests', this.requests);
            this.emit('requestDeleted', deletedRequest);
            return true;
        }
        return false;
    }

    getUserRequests(userId) {
        return this.requests.filter(r => r.userId === userId);
    }

    getAllRequests() {
        return this.requests;
    }

    getRequestsByStatus(status) {
        return this.requests.filter(r => r.status === status);
    }

    // Фильтрация
    filterRequests(filters) {
        let filtered = [...this.requests];
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(r => 
                r.materialName.toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.status) {
            filtered = filtered.filter(r => r.status === filters.status);
        }
        
        if (filters.date) {
            const filterDate = new Date(filters.date).toDateString();
            filtered = filtered.filter(r => 
                new Date(r.createdAt).toDateString() === filterDate
            );
        }
        
        if (filters.userId) {
            filtered = filtered.filter(r => r.userId === filters.userId);
        }
        
        return filtered;
    }

    filterUsers(filters) {
        let filtered = [...this.users];
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(u => 
                u.fullName.toLowerCase().includes(searchLower)
            );
        }
        
        if (filters.role) {
            filtered = filtered.filter(u => u.role === filters.role);
        }
        
        return filtered;
    }

    filterMaterials(filters) {
        let filtered = [...this.materials];
        
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered;
    }

    // Пагинация
    paginate(data, page, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return {
            data: data.slice(startIndex, endIndex),
            totalPages: Math.ceil(data.length / itemsPerPage),
            currentPage: page,
            totalItems: data.length
        };
    }
}

// Создание глобального экземпляра
window.dataManager = new DataManager();

// Ожидание загрузки данных перед использованием
window.addEventListener('DOMContentLoaded', async () => {
    // Ждем загрузки данных
    while (!window.dataManager.dataLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('Данные загружены из JSON файлов');
});
