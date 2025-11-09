// Система авторизации
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.loadCurrentUser();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Форма авторизации
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Ссылка "Забыли пароль"
        const forgotPasswordLink = document.getElementById('forgotPassword');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }

        // Закрытие модального окна "Забыли пароль"
        const closeForgotPassword = document.getElementById('closeForgotPassword');
        if (closeForgotPassword) {
            closeForgotPassword.addEventListener('click', () => this.hideForgotPassword());
        }
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('currentUser');
        }
    }

    checkAuthStatus() {
        if (this.currentUser) {
            this.showMainContent();
            this.updateUserInterface();
        } else {
            this.showAuthModal();
        }
    }

    showAuthModal() {
        const authModal = document.getElementById('authModal');
        const mainContent = document.getElementById('mainContent');
        if (authModal) authModal.style.display = 'flex';
        if (mainContent) mainContent.style.display = 'none';
    }

    hideAuthModal() {
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.style.display = 'none';
    }

    showMainContent() {
        const authModal = document.getElementById('authModal');
        const mainContent = document.getElementById('mainContent');
        if (authModal) authModal.style.display = 'none';
        if (mainContent) mainContent.style.display = 'block';
    }

    showForgotPassword() {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) modal.style.display = 'flex';
    }

    hideForgotPassword() {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) modal.style.display = 'none';
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const login = document.getElementById('login').value.trim();
        const password = document.getElementById('password').value;

        if (!login || !password) {
            this.showError('Пожалуйста, заполните все поля');
            return;
        }

        const user = dataManager.getUserByLogin(login);
        
        if (user && user.password === password) {
            this.currentUser = user;
            this.saveCurrentUser();
            this.hideAuthModal();
            this.showMainContent();
            this.updateUserInterface();
            this.clearForm('authForm');
            window.location.href = 'index.html';
        } else {
            this.showError('Неверный логин или пароль');
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        // Обновление имени пользователя в навигации
        const userNameElements = document.querySelectorAll('.profile-name, #userName');
        userNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.fullName;
        });

        // Обновление информации в личном кабинете
        const userFullNameElement = document.getElementById('userFullName');
        const userRoleElement = document.getElementById('userRole');
        const userDepartmentElement = document.getElementById('userDepartment');

        if (userFullNameElement) {
            userFullNameElement.textContent = this.currentUser.fullName;
        }
        if (userRoleElement) {
            userRoleElement.textContent = this.getRoleDisplayName(this.currentUser.role);
        }
        if (userDepartmentElement) {
            userDepartmentElement.textContent = this.currentUser.department;
        }

        // Показ/скрытие элементов в зависимости от роли
        this.updateRoleBasedElements();
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

    updateRoleBasedElements() {
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const purchasingPanelBtn = document.getElementById('purchasingPanelBtn');
        
        if (adminPanelBtn) {
            adminPanelBtn.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
        }
        
        if (purchasingPanelBtn) {
            purchasingPanelBtn.style.display = 
                (this.currentUser.role === 'purchasing' || this.currentUser.role === 'admin') 
                    ? 'block' : 'none';
        }
        
        // Обновление на всех страницах
        document.querySelectorAll('#adminPanelBtn, #purchasingPanelBtn').forEach(el => {
            if (el.id === 'adminPanelBtn') {
                el.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
            } else if (el.id === 'purchasingPanelBtn') {
                el.style.display = 
                    (this.currentUser.role === 'purchasing' || this.currentUser.role === 'admin') 
                        ? 'block' : 'none';
            }
        });
    }

    logout() {
        this.currentUser = null;
        this.saveCurrentUser();
        this.showAuthModal();
        this.clearForm('authForm');
        this.resetInterface();
        window.location.href = 'login.html';
    }

    resetInterface() {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.style.display = 'none');
    }

    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        // Удаление предыдущих сообщений
        const existingMessages = document.querySelectorAll('.auth-message');
        existingMessages.forEach(msg => msg.remove());

        const messageElement = document.createElement('div');
        messageElement.className = `auth-message auth-message-${type}`;
        messageElement.style.cssText = `
            padding: 0.75rem;
            border-radius: 4px;
            margin-top: 1rem;
            font-size: 0.9rem;
            text-align: center;
        `;

        if (type === 'success') {
            messageElement.style.backgroundColor = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.border = '1px solid #c3e6cb';
        } else {
            messageElement.style.backgroundColor = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.border = '1px solid #f5c6cb';
        }

        messageElement.textContent = message;
        
        const authModal = document.querySelector('.auth-modal');
        if (authModal) {
            authModal.appendChild(messageElement);
        }

        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;

        const permissions = {
            'employee': ['view_own_requests', 'create_requests'],
            'manager': ['view_own_requests', 'create_requests', 'approve_requests', 'view_department_requests'],
            'purchasing': ['view_all_requests', 'confirm_requests', 'manage_materials'],
            'admin': ['manage_users', 'manage_materials', 'view_all_requests', 'confirm_requests', 'approve_requests']
        };

        return permissions[this.currentUser.role]?.includes(permission) || false;
    }
}

// Создание глобального экземпляра
window.authManager = new AuthManager();
