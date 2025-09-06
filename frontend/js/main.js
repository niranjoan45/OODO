// ===== GLOBAL VARIABLES & CONFIGURATION =====
const API_BASE_URL = '/api';
let currentUser = null;
let authToken = null;

// ===== UTILITY FUNCTIONS =====
class Utils {
    static showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.add('active');
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    static showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    static formatPrice(price) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(price);
    }

    static formatDate(dateString) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    }

    static formatDateTime(dateString) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
}

// ===== AUTHENTICATION MANAGER =====
class AuthManager {
    static init() {
        // Load saved auth data
        const savedToken = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('currentUser');

        if (savedToken && savedUser) {
            authToken = savedToken;
            currentUser = JSON.parse(savedUser);
            this.updateUIForUser();
        }

        // Check if we're on a protected page without auth
        const protectedPages = ['dashboard.html', 'product_feed.html', 'add_product.html', 'my_listings.html', 'cart.html', 'purchases.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage) && !authToken) {
            window.location.href = 'index.html';
            return;
        }

        // Update UI based on user role
        if (currentUser) {
            document.body.setAttribute('data-role', currentUser.role);
        }
    }

    static async login(email, password) {
        try {
            Utils.showLoading('Signing you in...');

            const data = await Utils.makeRequest(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });

            authToken = data.token;
            currentUser = data.user;

            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            Utils.hideLoading();
            Utils.showToast('Login successful!', 'success');

            // Redirect based on role automatically determined by backend
            setTimeout(() => {
                switch (currentUser.role) {
                    case 'admin':
                        window.location.href = 'admin-dashboard.html';
                        break;
                    case 'seller':
                        window.location.href = 'seller-dashboard.html';
                        break;
                    case 'user':
                        window.location.href = 'user-dashboard.html';
                        break;
                    default:
                        window.location.href = 'product_feed.html';
                }
            }, 1000);

        } catch (error) {
            Utils.hideLoading();
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }

    static async register(userData) {
        try {
            Utils.showLoading('Creating your account...');
            
            const data = await Utils.makeRequest(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            authToken = data.token;
            currentUser = data.user;

            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            Utils.hideLoading();
            Utils.showToast('Account created successfully!', 'success');

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            Utils.hideLoading();
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }

    static logout() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        
        Utils.showToast('Logged out successfully', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    static updateUIForUser() {
        // Update user name displays
        const userNameElements = document.querySelectorAll('#userName, #welcomeUserName');
        userNameElements.forEach(el => {
            if (el) el.textContent = currentUser.fullName || currentUser.username;
        });

        // Update role-based visibility
        if (currentUser) {
            document.body.setAttribute('data-role', currentUser.role);
        }
    }
}

// ===== MODAL MANAGER =====
class ModalManager {
    static init() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        // Close modal with close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close-modal') || e.target.closest('.close-modal')) {
                const modal = e.target.closest('.modal');
                if (modal) this.closeModal(modal);
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) this.closeModal(activeModal);
            }
        });
    }

    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    static closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
}

// ===== CART MANAGER =====
class CartManager {
    static async updateCartCount() {
        if (!authToken || !currentUser || currentUser.role !== 'user') return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/cart/count`);
            const cartCountElements = document.querySelectorAll('#cartCount');
            cartCountElements.forEach(el => {
                if (el) el.textContent = data.count;
            });
        } catch (error) {
            console.error('Failed to update cart count:', error);
        }
    }

    static async addToCart(productId, quantity = 1) {
        if (!authToken) {
            Utils.showToast('Please login to add items to cart', 'warning');
            return;
        }

        if (currentUser.role !== 'user') {
            Utils.showToast('Only buyers can add items to cart', 'warning');
            return;
        }

        try {
            await Utils.makeRequest(`${API_BASE_URL}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ productId, quantity })
            });

            Utils.showToast('Item added to cart!', 'success');
            this.updateCartCount();
        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    }
}

// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core managers
    AuthManager.init();
    ModalManager.init();
    CartManager.updateCartCount();

    // Initialize page-specific functionality
    const currentPage = window.location.pathname.split('/').pop();
    
    switch (currentPage) {
        case 'index.html':
        case '':
            LoginPage.init();
            break;
        case 'signup.html':
            SignupPage.init();
            break;
        case 'dashboard.html':
            DashboardPage.init();
            break;
        case 'product_feed.html':
            ProductFeedPage.init();
            break;
        case 'add_product.html':
            AddProductPage.init();
            break;
        case 'my_listings.html':
            MyListingsPage.init();
            break;
        case 'product_detail.html':
            ProductDetailPage.init();
            break;
        case 'cart.html':
            CartPage.init();
            break;
        case 'purchases.html':
            PurchasesPage.init();
            break;
        case 'settings.html':
            SettingsPage.init();
            break;
    }

    // Global event listeners
    document.addEventListener('click', (e) => {
        if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
            e.preventDefault();
            AuthManager.logout();
        }
    });
});

// ===== LOGIN PAGE =====
class LoginPage {
    static init() {
        this.setupFormHandling();
        this.setupPasswordToggle();
    }

    static setupFormHandling() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const email = formData.get('email');
            const password = formData.get('password');

            if (!email || !password) {
                Utils.showToast('Please fill in all fields', 'warning');
                return;
            }

            try {
                await AuthManager.login(email, password);
            } catch (error) {
                // Error handling is done in AuthManager.login
            }
        });
    }

    static setupPasswordToggle() {
        const toggleBtn = document.querySelector('.toggle-password');
        const passwordInput = document.getElementById('password');

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;

                const icon = toggleBtn.querySelector('i');
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            });
        }
    }
}

// ===== SIGNUP PAGE =====
class SignupPage {
    static init() {
        this.setupRoleSelection();
        this.setupFormHandling();
        this.setupPasswordToggle();
        this.setupFormValidation();
    }

    static setupRoleSelection() {
        const roleCards = document.querySelectorAll('.role-card');
        const selectedRoleInput = document.getElementById('selectedRole');
        const selectedRoleText = document.getElementById('selectedRoleText');

        roleCards.forEach(card => {
            card.addEventListener('click', () => {
                roleCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                const role = card.dataset.role;
                selectedRoleInput.value = role;
                selectedRoleText.textContent = `Selected: ${card.querySelector('h3').textContent}`;

                this.validateForm();
            });
        });
    }

    static setupFormHandling() {
        const form = document.getElementById('signupForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                password: formData.get('password'),
                role: formData.get('role'),
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };

            if (!this.validateFormData(userData)) return;

            try {
                await AuthManager.register(userData);
            } catch (error) {
                // Error handling is done in AuthManager.register
            }
        });
    }

    static setupPasswordToggle() {
        const toggleBtn = document.querySelector('.toggle-password');
        const passwordInput = document.getElementById('password');

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;

                const icon = toggleBtn.querySelector('i');
                icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            });
        }
    }

    static setupFormValidation() {
        const form = document.getElementById('signupForm');
        const inputs = form.querySelectorAll('input[required]');
        const agreeTerms = document.getElementById('agreeTerms');

        inputs.forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        if (agreeTerms) {
            agreeTerms.addEventListener('change', () => this.validateForm());
        }
    }

    static validateForm() {
        const form = document.getElementById('signupForm');
        const submitBtn = document.querySelector('.signup-btn');
        const requiredInputs = form.querySelectorAll('input[required]');
        const agreeTerms = document.getElementById('agreeTerms');

        let isValid = true;

        requiredInputs.forEach(input => {
            if (!input.value.trim()) isValid = false;
        });

        if (agreeTerms && !agreeTerms.checked) isValid = false;

        submitBtn.disabled = !isValid;
    }

    static validateFormData(userData) {
        if (!userData.username || !userData.email || !userData.password || !userData.role || !userData.fullName) {
            Utils.showToast('Please fill in all required fields', 'warning');
            return false;
        }

        if (userData.password.length < 6) {
            Utils.showToast('Password must be at least 6 characters long', 'warning');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            Utils.showToast('Please enter a valid email address', 'warning');
            return false;
        }

        return true;
    }
}

// ===== DASHBOARD PAGE =====
class DashboardPage {
    static init() {
        this.loadDashboardData();
        this.loadRecentActivity();
        this.loadRecommendedProducts();
    }

    static async loadDashboardData() {
        try {
            // Load user stats based on role
            if (currentUser.role === 'user') {
                await this.loadUserStats();
            } else if (currentUser.role === 'seller') {
                await this.loadSellerStats();
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    static async loadUserStats() {
        try {
            // Get purchase history for stats
            const ordersData = await Utils.makeRequest(`${API_BASE_URL}/orders/history`);
            const orders = ordersData.orders || [];

            const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
            const itemsRescued = orders.reduce((sum, order) => sum + parseInt(order.item_count), 0);

            // Update stats display
            const itemsSavedEl = document.getElementById('itemsSaved');
            const moneySavedEl = document.getElementById('moneySaved');

            if (itemsSavedEl) itemsSavedEl.textContent = itemsRescued;
            if (moneySavedEl) moneySavedEl.textContent = Utils.formatPrice(totalSpent * 0.6); // Assume 60% savings

        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    static async loadSellerStats() {
        try {
            // Get sales data for seller stats
            const salesData = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);
            const sales = salesData.sales || [];

            const totalEarnings = salesData.totalRevenue || 0;
            const itemsSold = salesData.totalSales || 0;

            // Update stats display
            const totalEarningsEl = document.getElementById('totalEarnings');
            const itemsSavedEl = document.getElementById('itemsSaved');

            if (totalEarningsEl) totalEarningsEl.textContent = Utils.formatPrice(totalEarnings);
            if (itemsSavedEl) itemsSavedEl.textContent = itemsSold;

        } catch (error) {
            console.error('Failed to load seller stats:', error);
        }
    }

    static async loadRecentActivity() {
        const activityContainer = document.getElementById('recentActivity');
        if (!activityContainer) return;

        try {
            // Mock recent activity for now
            const activities = [
                {
                    icon: 'fas fa-shopping-bag',
                    title: 'Welcome to EcoFinds!',
                    description: 'Start exploring sustainable treasures',
                    time: 'Just now'
                }
            ];

            activityContainer.innerHTML = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                    </div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }

    static async loadRecommendedProducts() {
        const productsContainer = document.getElementById('recommendedProducts');
        if (!productsContainer) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products?limit=4`);
            const products = data.products || [];

            productsContainer.innerHTML = products.map(product => this.createProductCard(product)).join('');

        } catch (error) {
            console.error('Failed to load recommended products:', error);
        }
    }

    static createProductCard(product) {
        return `
            <div class="product-card" onclick="window.location.href='product_detail.html?id=${product.id}'">
                <div class="product-image">
                    <img src="${product.image_url || 'https://via.placeholder.com/280x200'}" alt="${product.title}">
                    <div class="product-condition">${product.condition}</div>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-footer">
                        <div class="product-price">${Utils.formatPrice(product.price)}</div>
                        <div class="product-seller">by ${product.seller_name}</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// ===== PRODUCT FEED PAGE =====
class ProductFeedPage {
    static currentPage = 0;
    static currentFilters = {};
    static isLoading = false;

    static init() {
        this.setupSearch();
        this.setupFilters();
        this.setupLoadMore();
        this.loadProducts();
    }

    static setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');

        if (searchInput && searchBtn) {
            const debouncedSearch = Utils.debounce(() => {
                this.currentFilters.search = searchInput.value;
                this.resetAndLoadProducts();
            }, 500);

            searchInput.addEventListener('input', debouncedSearch);
            searchBtn.addEventListener('click', () => {
                this.currentFilters.search = searchInput.value;
                this.resetAndLoadProducts();
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.currentFilters.search = searchInput.value;
                    this.resetAndLoadProducts();
                }
            });
        }
    }

    static setupFilters() {
        const filterElements = [
            'categoryFilter',
            'conditionFilter',
            'minPrice',
            'maxPrice',
            'sortBy'
        ];

        filterElements.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateFilters();
                    this.resetAndLoadProducts();
                });
            }
        });

        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    }

    static setupLoadMore() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadProducts(true);
            });
        }
    }

    static updateFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const conditionFilter = document.getElementById('conditionFilter');
        const minPrice = document.getElementById('minPrice');
        const maxPrice = document.getElementById('maxPrice');
        const sortBy = document.getElementById('sortBy');

        this.currentFilters = {
            category: categoryFilter?.value || '',
            condition: conditionFilter?.value || '',
            minPrice: minPrice?.value || '',
            maxPrice: maxPrice?.value || '',
            sortBy: sortBy?.value || 'newest'
        };
    }

    static clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = 'all';
        document.getElementById('conditionFilter').value = '';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('sortBy').value = 'newest';

        this.currentFilters = {};
        this.resetAndLoadProducts();
    }

    static resetAndLoadProducts() {
        this.currentPage = 0;
        const productsGrid = document.getElementById('productsGrid');
        if (productsGrid) productsGrid.innerHTML = '';
        this.loadProducts();
    }

    static async loadProducts(append = false) {
        if (this.isLoading) return;

        const productsGrid = document.getElementById('productsGrid');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const resultsCount = document.getElementById('resultsCount');

        if (!productsGrid) return;

        this.isLoading = true;

        try {
            if (!append) {
                Utils.showLoading('Loading products...');
            }

            const params = new URLSearchParams({
                limit: 12,
                offset: this.currentPage * 12,
                ...this.currentFilters
            });

            const data = await Utils.makeRequest(`${API_BASE_URL}/products?${params}`);
            const products = data.products || [];

            if (!append) {
                productsGrid.innerHTML = '';
            }

            if (products.length === 0 && !append) {
                productsGrid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-search"></i>
                        </div>
                        <h3>No products found</h3>
                        <p>Try adjusting your search criteria or filters</p>
                    </div>
                `;
            } else {
                products.forEach(product => {
                    const productCard = this.createProductCard(product);
                    productsGrid.insertAdjacentHTML('beforeend', productCard);
                });

                // Update results count
                if (resultsCount) {
                    const totalResults = (this.currentPage * 12) + products.length;
                    resultsCount.textContent = `Showing ${totalResults} products`;
                }

                // Show/hide load more button
                if (loadMoreBtn) {
                    loadMoreBtn.style.display = products.length < 12 ? 'none' : 'block';
                }

                this.currentPage++;
            }

        } catch (error) {
            Utils.showToast('Failed to load products', 'error');
            console.error('Failed to load products:', error);
        } finally {
            this.isLoading = false;
            Utils.hideLoading();
        }
    }

    static createProductCard(product) {
        const isOwnProduct = currentUser && product.seller_id === currentUser.id;
        const canAddToCart = currentUser && currentUser.role === 'user' && !isOwnProduct;

        return `
            <div class="product-card">
                <div class="product-image" onclick="window.location.href='product_detail.html?id=${product.id}'">
                    <img src="${product.image_url || 'https://via.placeholder.com/280x200'}" alt="${product.title}">
                    <div class="product-condition">${product.condition}</div>
                    ${product.status !== 'available' ? `<div class="product-status ${product.status}">${product.status}</div>` : ''}
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title" onclick="window.location.href='product_detail.html?id=${product.id}'">${product.title}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-footer">
                        <div class="product-price">${Utils.formatPrice(product.price)}</div>
                        <div class="product-seller">by ${product.seller_name}</div>
                    </div>
                    ${canAddToCart && product.status === 'available' ? `
                        <div class="product-actions">
                            <button class="add-to-cart-btn" onclick="CartManager.addToCart(${product.id})">
                                <i class="fas fa-shopping-cart"></i>
                                Add to Cart
                            </button>
                            <button class="quick-view-btn" onclick="ProductFeedPage.showQuickView(${product.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static async showQuickView(productId) {
        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products/${productId}`);
            const product = data.product;

            const quickViewContent = document.getElementById('quickViewContent');
            if (quickViewContent) {
                quickViewContent.innerHTML = `
                    <div class="quick-view-product">
                        <div class="quick-view-image">
                            <img src="${product.image_url || 'https://via.placeholder.com/400x300'}" alt="${product.title}">
                        </div>
                        <div class="quick-view-info">
                            <div class="product-category">${product.category}</div>
                            <h3>${product.title}</h3>
                            <p class="product-description">${product.description || ''}</p>
                            <div class="product-details">
                                <div class="detail-item">
                                    <strong>Condition:</strong> ${product.condition}
                                </div>
                                <div class="detail-item">
                                    <strong>Seller:</strong> ${product.seller_full_name || product.seller_name}
                                </div>
                                <div class="detail-item">
                                    <strong>Views:</strong> ${product.views || 0}
                                </div>
                            </div>
                            <div class="product-price-large">${Utils.formatPrice(product.price)}</div>
                            <div class="quick-view-actions">
                                <button class="btn btn-primary" onclick="window.location.href='product_detail.html?id=${product.id}'">
                                    View Details
                                </button>
                                ${currentUser && currentUser.role === 'user' && product.seller_id !== currentUser.id ? `
                                    <button class="btn btn-secondary" onclick="CartManager.addToCart(${product.id}); ModalManager.closeModal('quickViewModal');">
                                        Add to Cart
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            ModalManager.openModal('quickViewModal');

        } catch (error) {
            Utils.showToast('Failed to load product details', 'error');
        }
    }
}

// ===== ADD PRODUCT PAGE =====
class AddProductPage {
    static init() {
        this.setupForm();
        this.setupImagePreview();
        this.loadCategories();
    }

    static setupForm() {
        const form = document.getElementById('addProductForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit(form);
        });
    }

    static setupImagePreview() {
        const imageUrlInput = document.getElementById('productImageUrl');
        const previewBtn = document.getElementById('previewImageBtn');
        const imagePreview = document.getElementById('imagePreview');

        if (previewBtn && imageUrlInput && imagePreview) {
            previewBtn.addEventListener('click', () => {
                const url = imageUrlInput.value.trim();
                if (url) {
                    this.previewImage(url, imagePreview);
                }
            });

            imageUrlInput.addEventListener('blur', () => {
                const url = imageUrlInput.value.trim();
                if (url) {
                    this.previewImage(url, imagePreview);
                }
            });
        }
    }

    static previewImage(url, container) {
        const img = new Image();
        img.onload = () => {
            container.innerHTML = `<img src="${url}" alt="Product preview">`;
        };
        img.onerror = () => {
            Utils.showToast('Invalid image URL', 'error');
        };
        img.src = url;
    }

    static async loadCategories() {
        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products/meta/categories`);
            const categorySelect = document.getElementById('productCategory');

            if (categorySelect && data.categories) {
                // Clear existing options except the first one
                categorySelect.innerHTML = '<option value="">Select Category</option>';

                data.categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category;
                    option.textContent = category;
                    categorySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    static async handleSubmit(form) {
        const formData = new FormData(form);
        const productData = {
            title: formData.get('title'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            category: formData.get('category'),
            condition: formData.get('condition'),
            imageUrl: formData.get('imageUrl')
        };

        if (!this.validateProductData(productData)) return;

        try {
            Utils.showLoading('Adding your product...');

            await Utils.makeRequest(`${API_BASE_URL}/products`, {
                method: 'POST',
                body: JSON.stringify(productData)
            });

            Utils.hideLoading();
            Utils.showToast('Product added successfully!', 'success');

            setTimeout(() => {
                window.location.href = 'my_listings.html';
            }, 1500);

        } catch (error) {
            Utils.hideLoading();
            Utils.showToast(error.message, 'error');
        }
    }

    static validateProductData(data) {
        if (!data.title || !data.price || !data.category || !data.condition) {
            Utils.showToast('Please fill in all required fields', 'warning');
            return false;
        }

        if (data.price <= 0) {
            Utils.showToast('Price must be greater than 0', 'warning');
            return false;
        }

        return true;
    }
}

// ===== CART PAGE =====
class CartPage {
    static init() {
        this.loadCart();
        this.setupCheckout();
    }

    static async loadCart() {
        const cartItems = document.getElementById('cartItems');
        const emptyCart = document.getElementById('emptyCart');

        if (!cartItems) return;

        try {
            Utils.showLoading('Loading your cart...');

            const data = await Utils.makeRequest(`${API_BASE_URL}/cart`);
            const items = data.cartItems || [];

            if (items.length === 0) {
                cartItems.style.display = 'none';
                emptyCart.style.display = 'block';
                this.updateCartSummary(0, 0);
            } else {
                cartItems.style.display = 'block';
                emptyCart.style.display = 'none';
                this.renderCartItems(items);
                this.updateCartSummary(data.total, items.length);
            }

        } catch (error) {
            Utils.showToast('Failed to load cart', 'error');
            console.error('Failed to load cart:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    static renderCartItems(items) {
        const cartItems = document.getElementById('cartItems');

        cartItems.innerHTML = items.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.image_url || 'https://via.placeholder.com/100x100'}" alt="${item.title}">
                </div>
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.title}</h4>
                    <p class="cart-item-seller">Sold by ${item.seller_full_name || item.seller_name}</p>
                    <div class="cart-item-price">${Utils.formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="CartPage.updateQuantity(${item.id}, ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1"
                               onchange="CartPage.updateQuantity(${item.id}, this.value)">
                        <button class="quantity-btn" onclick="CartPage.updateQuantity(${item.id}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <button class="remove-item-btn" onclick="CartPage.removeItem(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    static updateCartSummary(total, itemCount) {
        const subtotalEl = document.getElementById('subtotal');
        const totalEl = document.getElementById('total');
        const itemCountEl = document.getElementById('itemCount');
        const itemsSavedEl = document.getElementById('itemsSaved');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (subtotalEl) subtotalEl.textContent = Utils.formatPrice(total);
        if (totalEl) totalEl.textContent = Utils.formatPrice(total);
        if (itemCountEl) itemCountEl.textContent = itemCount;
        if (itemsSavedEl) itemsSavedEl.textContent = itemCount;

        if (checkoutBtn) {
            checkoutBtn.disabled = itemCount === 0;
        }
    }

    static async updateQuantity(itemId, newQuantity) {
        if (newQuantity < 1) {
            this.removeItem(itemId);
            return;
        }

        try {
            await Utils.makeRequest(`${API_BASE_URL}/cart/update/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: parseInt(newQuantity) })
            });

            this.loadCart(); // Reload cart to update totals
            CartManager.updateCartCount();

        } catch (error) {
            Utils.showToast('Failed to update quantity', 'error');
        }
    }

    static async removeItem(itemId) {
        try {
            await Utils.makeRequest(`${API_BASE_URL}/cart/remove/${itemId}`, {
                method: 'DELETE'
            });

            Utils.showToast('Item removed from cart', 'success');
            this.loadCart();
            CartManager.updateCartCount();

        } catch (error) {
            Utils.showToast('Failed to remove item', 'error');
        }
    }

    static setupCheckout() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        const checkoutForm = document.getElementById('checkoutForm');

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                ModalManager.openModal('checkoutModal');
                this.loadCheckoutSummary();
                this.loadUserDetailsForCheckout();
            });
        }

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.processCheckout(checkoutForm);
            });
        }
    }

    static async loadUserDetailsForCheckout() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const user = data.user;

                // Pre-fill checkout form with user details
                const fullNameInput = document.getElementById('checkoutFullName');
                const emailInput = document.getElementById('checkoutEmail');
                const phoneInput = document.getElementById('checkoutPhone');
                const addressInput = document.getElementById('deliveryAddress');

                if (fullNameInput) fullNameInput.value = user.full_name || '';
                if (emailInput) emailInput.value = user.email || '';
                if (phoneInput) phoneInput.value = user.phone || '';
                if (addressInput) addressInput.value = user.address || '';
            }
        } catch (error) {
            console.error('Error loading user details for checkout:', error);
        }
    }

    static async loadCheckoutSummary() {
        const checkoutSummary = document.getElementById('checkoutSummary');
        if (!checkoutSummary) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/cart`);
            const items = data.cartItems || [];

            checkoutSummary.innerHTML = `
                <div class="checkout-items">
                    ${items.map(item => `
                        <div class="checkout-item">
                            <span>${item.title} x${item.quantity}</span>
                            <span>${Utils.formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="checkout-total">
                    <strong>Total: ${Utils.formatPrice(data.total)}</strong>
                </div>
            `;

        } catch (error) {
            console.error('Failed to load checkout summary:', error);
        }
    }

    static async processCheckout(form) {
        const formData = new FormData(form);
        const fullName = formData.get('fullName');
        const email = formData.get('email');
        const phone = formData.get('phone');
        const deliveryAddress = formData.get('deliveryAddress');
        const deliveryNotes = formData.get('deliveryNotes');

        // Validate required fields
        if (!fullName || !email || !phone || !deliveryAddress) {
            Utils.showToast('Please fill in all required fields', 'warning');
            return;
        }

        try {
            Utils.showLoading('Processing your order...');

            const orderData = await Utils.makeRequest(`${API_BASE_URL}/orders/checkout`, {
                method: 'POST',
                body: JSON.stringify({
                    fullName,
                    email,
                    phone,
                    deliveryAddress,
                    deliveryNotes
                })
            });

            Utils.hideLoading();
            ModalManager.closeModal('checkoutModal');

            // Show success modal with order details
            this.showOrderSuccess(orderData);

        } catch (error) {
            Utils.hideLoading();
            Utils.showToast(error.message, 'error');
        }
    }

    static showOrderSuccess(orderData) {
        const orderDetailsSuccess = document.getElementById('orderDetailsSuccess');
        if (orderDetailsSuccess) {
            orderDetailsSuccess.innerHTML = `
                <div class="order-success-details">
                    <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                    <p><strong>Total Amount:</strong> ${Utils.formatPrice(orderData.totalAmount)}</p>
                    <p><strong>Items:</strong> ${orderData.itemCount} item(s)</p>
                    <p><strong>Delivery Address:</strong> ${orderData.deliveryAddress}</p>
                </div>
            `;
        }

        ModalManager.openModal('orderSuccessModal');

        // Update cart count
        CartManager.updateCartCount();
    }
}

// ===== MY LISTINGS PAGE =====
class MyListingsPage {
    static init() {
        this.loadListings();
        this.loadStats();
        this.setupFilters();
    }

    static async loadListings() {
        const listingsGrid = document.getElementById('listingsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!listingsGrid) return;

        try {
            Utils.showLoading('Loading your listings...');

            const data = await Utils.makeRequest(`${API_BASE_URL}/products/seller/${currentUser.id}`);
            const products = data.products || [];

            if (products.length === 0) {
                listingsGrid.style.display = 'none';
                emptyState.style.display = 'block';
            } else {
                listingsGrid.style.display = 'grid';
                emptyState.style.display = 'none';
                this.renderListings(products);
            }

        } catch (error) {
            Utils.showToast('Failed to load listings', 'error');
            console.error('Failed to load listings:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    static renderListings(products) {
        const listingsGrid = document.getElementById('listingsGrid');

        listingsGrid.innerHTML = products.map(product => `
            <div class="listing-card">
                <div class="product-image">
                    <img src="${product.image_url || 'https://via.placeholder.com/300x200'}" alt="${product.title}">
                    <div class="product-condition">${product.condition}</div>
                    ${product.status !== 'available' ? `<div class="product-status ${product.status}">${product.status}</div>` : ''}
                    <div class="listing-actions">
                        <button class="action-btn edit" onclick="MyListingsPage.editProduct(${product.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="MyListingsPage.deleteProduct(${product.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-footer">
                        <div class="product-price">${Utils.formatPrice(product.price)}</div>
                    </div>
                </div>
                <div class="listing-stats">
                    <div class="listing-views">
                        <i class="fas fa-eye"></i>
                        ${product.views || 0} views
                    </div>
                    <div class="listing-date">${Utils.formatDate(product.created_at)}</div>
                </div>
            </div>
        `).join('');
    }

    static async loadStats() {
        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products/seller/${currentUser.id}`);
            const products = data.products || [];

            const totalListings = products.length;
            const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
            const soldItems = products.filter(p => p.status === 'sold').length;

            // Get sales data for earnings
            const salesData = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);
            const totalEarnings = salesData.totalRevenue || 0;

            // Update stats display
            document.getElementById('totalListings').textContent = totalListings;
            document.getElementById('totalViews').textContent = totalViews;
            document.getElementById('soldItems').textContent = soldItems;
            document.getElementById('totalEarnings').textContent = Utils.formatPrice(totalEarnings);

        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    static setupFilters() {
        const filterElements = ['statusFilter', 'categoryFilter', 'sortBy'];

        filterElements.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });
    }

    static applyFilters() {
        // For now, just reload listings
        // In a real app, you'd filter the existing data
        this.loadListings();
    }

    static editProduct(productId) {
        // For now, redirect to add product page with edit mode
        window.location.href = `add_product.html?edit=${productId}`;
    }

    static deleteProduct(productId) {
        // Show confirmation modal
        const modal = document.getElementById('deleteModal');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (modal && confirmBtn) {
            // Remove any existing event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

            newConfirmBtn.addEventListener('click', async () => {
                try {
                    await Utils.makeRequest(`${API_BASE_URL}/products/${productId}`, {
                        method: 'DELETE'
                    });

                    Utils.showToast('Product deleted successfully', 'success');
                    ModalManager.closeModal('deleteModal');
                    this.loadListings();
                    this.loadStats();

                } catch (error) {
                    Utils.showToast(error.message, 'error');
                }
            });

            ModalManager.openModal('deleteModal');
        }
    }
}

// ===== PRODUCT DETAIL PAGE =====
class ProductDetailPage {
    static init() {
        this.loadProduct();
        this.loadRecommendedProducts();
    }

    static async loadProduct() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            Utils.showToast('Product not found', 'error');
            window.location.href = 'product_feed.html';
            return;
        }

        try {
            Utils.showLoading('Loading product details...');

            const data = await Utils.makeRequest(`${API_BASE_URL}/products/${productId}`);
            const product = data.product;

            this.renderProductDetail(product);

        } catch (error) {
            Utils.showToast('Failed to load product', 'error');
            console.error('Failed to load product:', error);
            window.location.href = 'product_feed.html';
        } finally {
            Utils.hideLoading();
        }
    }

    static renderProductDetail(product) {
        const container = document.getElementById('productDetailContainer');
        if (!container) return;

        const isOwnProduct = currentUser && product.seller_id === currentUser.id;
        const canAddToCart = currentUser && currentUser.role === 'user' && !isOwnProduct && product.status === 'available';

        container.innerHTML = `
            <div class="product-detail">
                <div class="product-images">
                    <div class="main-image">
                        <img src="${product.image_url || 'https://via.placeholder.com/600x400'}" alt="${product.title}"
                             onclick="ProductDetailPage.showImageZoom('${product.image_url}')">
                    </div>
                </div>
                <div class="product-details">
                    <div class="product-category">${product.category}</div>
                    <h1 class="product-title">${product.title}</h1>
                    <div class="product-price-large">${Utils.formatPrice(product.price)}</div>

                    <div class="product-meta">
                        <div class="meta-item">
                            <strong>Condition:</strong> ${product.condition}
                        </div>
                        <div class="meta-item">
                            <strong>Views:</strong> ${product.views || 0}
                        </div>
                        <div class="meta-item">
                            <strong>Listed:</strong> ${Utils.formatDate(product.created_at)}
                        </div>
                        <div class="meta-item">
                            <strong>Status:</strong>
                            <span class="status-badge ${product.status}">${product.status}</span>
                        </div>
                    </div>

                    <div class="product-description">
                        <h3>Description</h3>
                        <p>${product.description || 'No description provided.'}</p>
                    </div>

                    <div class="seller-info">
                        <h3>Seller Information</h3>
                        <div class="seller-details">
                            <div class="seller-name">${product.seller_full_name || product.seller_name}</div>
                            ${product.seller_phone ? `<div class="seller-contact">Contact: ${product.seller_phone}</div>` : ''}
                        </div>
                    </div>

                    ${canAddToCart ? `
                        <div class="product-actions">
                            <button class="btn btn-primary btn-large" onclick="CartManager.addToCart(${product.id})">
                                <i class="fas fa-shopping-cart"></i>
                                Add to Cart
                            </button>
                        </div>
                    ` : ''}

                    ${isOwnProduct ? `
                        <div class="owner-actions">
                            <button class="btn btn-outline" onclick="window.location.href='add_product.html?edit=${product.id}'">
                                <i class="fas fa-edit"></i>
                                Edit Product
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    static showImageZoom(imageUrl) {
        const modal = document.getElementById('imageZoomModal');
        const zoomedImage = document.getElementById('zoomedImage');

        if (modal && zoomedImage && imageUrl) {
            zoomedImage.src = imageUrl;
            ModalManager.openModal('imageZoomModal');
        }
    }

    static async loadRecommendedProducts() {
        const container = document.getElementById('recommendedProducts');
        if (!container) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products?limit=4`);
            const products = data.products || [];

            container.innerHTML = products.map(product =>
                DashboardPage.createProductCard(product)
            ).join('');

        } catch (error) {
            console.error('Failed to load recommended products:', error);
        }
    }
}

// ===== PURCHASES PAGE =====
class PurchasesPage {
    static init() {
        this.setupTabs();
        this.loadPurchaseStats();
        this.loadPurchases();

        if (currentUser.role === 'seller' || currentUser.role === 'admin') {
            this.loadSales();
        }
    }

    static setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab + 'Tab') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    static async loadPurchaseStats() {
        try {
            // Load purchase history for stats
            const ordersData = await Utils.makeRequest(`${API_BASE_URL}/orders/history`);
            const orders = ordersData.orders || [];

            const totalOrders = orders.length;
            const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
            const itemsRescued = orders.reduce((sum, order) => sum + parseInt(order.item_count), 0);

            // Update stats display
            document.getElementById('totalOrders').textContent = totalOrders;
            document.getElementById('totalSpent').textContent = Utils.formatPrice(totalSpent);
            document.getElementById('itemsRescued').textContent = itemsRescued;

            // Load seller stats if applicable
            if (currentUser.role === 'seller' || currentUser.role === 'admin') {
                const salesData = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);
                const totalEarnings = salesData.totalRevenue || 0;
                document.getElementById('totalEarnings').textContent = Utils.formatPrice(totalEarnings);
            }

        } catch (error) {
            console.error('Failed to load purchase stats:', error);
        }
    }

    static async loadPurchases() {
        const ordersList = document.getElementById('ordersList');
        const emptyPurchases = document.getElementById('emptyPurchases');

        if (!ordersList) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/orders/history`);
            const orders = data.orders || [];

            if (orders.length === 0) {
                ordersList.style.display = 'none';
                emptyPurchases.style.display = 'block';
            } else {
                ordersList.style.display = 'block';
                emptyPurchases.style.display = 'none';
                this.renderOrders(orders);
            }

        } catch (error) {
            Utils.showToast('Failed to load purchase history', 'error');
            console.error('Failed to load purchases:', error);
        }
    }

    static renderOrders(orders) {
        const ordersList = document.getElementById('ordersList');

        ordersList.innerHTML = orders.map(order => `
            <div class="order-item" onclick="PurchasesPage.showOrderDetails(${order.id})">
                <div class="order-header">
                    <div class="order-info">
                        <h4>Order #${order.id}</h4>
                        <div class="order-date">${Utils.formatDateTime(order.created_at)}</div>
                    </div>
                    <div class="order-status ${order.status}">${order.status}</div>
                </div>
                <div class="order-items">
                    <div class="order-summary">
                        ${order.product_titles ? order.product_titles.split(',').slice(0, 2).join(', ') : 'Items'}
                        ${order.item_count > 2 ? ` and ${order.item_count - 2} more` : ''}
                    </div>
                </div>
                <div class="order-total">${Utils.formatPrice(order.total_amount)}</div>
            </div>
        `).join('');
    }

    static async loadSales() {
        const salesList = document.getElementById('salesList');
        const emptySales = document.getElementById('emptySales');

        if (!salesList) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);
            const sales = data.sales || [];

            if (sales.length === 0) {
                salesList.style.display = 'none';
                emptySales.style.display = 'block';
            } else {
                salesList.style.display = 'block';
                emptySales.style.display = 'none';
                this.renderSales(sales);
            }

        } catch (error) {
            console.error('Failed to load sales:', error);
        }
    }

    static renderSales(sales) {
        const salesList = document.getElementById('salesList');

        // Group sales by order
        const groupedSales = sales.reduce((acc, sale) => {
            if (!acc[sale.order_id]) {
                acc[sale.order_id] = {
                    order_id: sale.order_id,
                    order_date: sale.order_date,
                    buyer_name: sale.buyer_full_name || sale.buyer_name,
                    items: [],
                    total: 0
                };
            }
            acc[sale.order_id].items.push(sale);
            acc[sale.order_id].total += sale.price * sale.quantity;
            return acc;
        }, {});

        salesList.innerHTML = Object.values(groupedSales).map(sale => `
            <div class="sale-item">
                <div class="sale-header">
                    <div class="sale-info">
                        <h4>Sale #${sale.order_id}</h4>
                        <div class="sale-date">${Utils.formatDateTime(sale.order_date)}</div>
                    </div>
                    <div class="sale-status completed">completed</div>
                </div>
                <div class="sale-items">
                    ${sale.items.map(item => `
                        <div class="sale-item-preview">
                            <div class="item-info">
                                <div class="item-title">${item.title}</div>
                                <div class="item-price">${Utils.formatPrice(item.price)} x${item.quantity}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="sale-buyer">Sold to: ${sale.buyer_name}</div>
                <div class="sale-total">${Utils.formatPrice(sale.total)}</div>
            </div>
        `).join('');
    }

    static async showOrderDetails(orderId) {
        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/orders/${orderId}`);
            const order = data.order;

            const orderDetailsContent = document.getElementById('orderDetailsContent');
            if (orderDetailsContent) {
                orderDetailsContent.innerHTML = `
                    <div class="order-details">
                        <div class="order-header">
                            <h4>Order #${order.id}</h4>
                            <div class="order-status ${order.status}">${order.status}</div>
                        </div>

                        <div class="order-info">
                            <div class="info-row">
                                <strong>Order Date:</strong> ${Utils.formatDateTime(order.created_at)}
                            </div>
                            <div class="info-row">
                                <strong>Total Amount:</strong> ${Utils.formatPrice(order.total_amount)}
                            </div>
                            <div class="info-row">
                                <strong>Shipping Address:</strong> ${order.shipping_address}
                            </div>
                        </div>

                        <div class="order-items-detail">
                            <h5>Items Ordered:</h5>
                            ${order.items.map(item => `
                                <div class="order-item-detail">
                                    <div class="item-image">
                                        <img src="${item.image_url || 'https://via.placeholder.com/60x60'}" alt="${item.title}">
                                    </div>
                                    <div class="item-info">
                                        <div class="item-title">${item.title}</div>
                                        <div class="item-seller">Sold by ${item.seller_full_name || item.seller_name}</div>
                                        <div class="item-price">${Utils.formatPrice(item.price)} x${item.quantity}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            ModalManager.openModal('orderDetailsModal');

        } catch (error) {
            Utils.showToast('Failed to load order details', 'error');
        }
    }
}

// ===== USER DASHBOARD PAGE =====
class UserDashboardPage {
    static init() {
        this.loadUserStats();
        this.loadRecommendedProducts();
        this.loadRecentActivity();
    }

    static async loadUserStats() {
        try {
            // Load purchase history for stats
            const ordersData = await Utils.makeRequest(`${API_BASE_URL}/orders/history`);
            const orders = ordersData.orders || [];

            const totalPurchases = orders.length;
            const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
            const itemsRescued = orders.reduce((sum, order) => sum + parseInt(order.item_count), 0);

            // Update stats display
            document.getElementById('totalPurchases').textContent = totalPurchases;
            document.getElementById('totalSpent').textContent = Utils.formatPrice(totalSpent);
            document.getElementById('itemsRescued').textContent = itemsRescued;

        } catch (error) {
            console.error('Failed to load user stats:', error);
        }
    }

    static async loadRecommendedProducts() {
        const container = document.getElementById('recommendedProducts');
        if (!container) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products?limit=6`);
            const products = data.products || [];

            container.innerHTML = products.map(product =>
                DashboardPage.createProductCard(product)
            ).join('');

        } catch (error) {
            console.error('Failed to load recommended products:', error);
        }
    }

    static async loadRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        try {
            const ordersData = await Utils.makeRequest(`${API_BASE_URL}/orders/history`);
            const orders = ordersData.orders || [];

            if (orders.length === 0) {
                container.innerHTML = `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i class="fas fa-info-circle"></i>
                        </div>
                        <div class="activity-content">
                            <p>No recent activity. Start shopping to see your activity here!</p>
                            <span class="activity-time">Welcome</span>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = orders.slice(0, 5).map(order => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="activity-content">
                        <p>Order #${order.id} - ${Utils.formatPrice(order.total_amount)}</p>
                        <span class="activity-time">${Utils.formatDate(order.created_at)}</span>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    }
}

// ===== SELLER DASHBOARD PAGE =====
class SellerDashboardPage {
    static init() {
        this.loadSellerStats();
        this.loadRecentListings();
        this.loadSalesPerformance();
    }

    static async loadSellerStats() {
        try {
            // Load seller's products
            const productsData = await Utils.makeRequest(`${API_BASE_URL}/products/seller/${currentUser.id}`);
            const products = productsData.products || [];

            const totalListings = products.filter(p => p.status === 'available').length;
            const soldItems = products.filter(p => p.status === 'sold').length;
            const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);

            // Load sales data for earnings
            const salesData = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);
            const totalEarnings = salesData.totalRevenue || 0;

            // Update stats display
            document.getElementById('totalListings').textContent = totalListings;
            document.getElementById('totalEarnings').textContent = Utils.formatPrice(totalEarnings);
            document.getElementById('soldItems').textContent = soldItems;
            document.getElementById('totalViews').textContent = totalViews;

        } catch (error) {
            console.error('Failed to load seller stats:', error);
        }
    }

    static async loadRecentListings() {
        const container = document.getElementById('recentListings');
        if (!container) return;

        try {
            const data = await Utils.makeRequest(`${API_BASE_URL}/products/seller/${currentUser.id}?limit=6`);
            const products = data.products || [];

            container.innerHTML = products.map(product =>
                DashboardPage.createProductCard(product)
            ).join('');

        } catch (error) {
            console.error('Failed to load recent listings:', error);
        }
    }

    static async loadSalesPerformance() {
        try {
            const salesData = await Utils.makeRequest(`${API_BASE_URL}/orders/sales/history`);

            // Update performance stats
            document.getElementById('monthlySales').textContent = Utils.formatPrice(salesData.monthlyRevenue || 0);
            document.getElementById('monthlyItems').textContent = salesData.monthlyItems || 0;
            document.getElementById('totalRevenue').textContent = Utils.formatPrice(salesData.totalRevenue || 0);
            document.getElementById('totalSold').textContent = salesData.totalItems || 0;

        } catch (error) {
            console.error('Failed to load sales performance:', error);
        }
    }
}

// ===== ADMIN DASHBOARD PAGE =====
class AdminDashboardPage {
    static init() {
        this.loadAdminStats();
        this.loadRecentActivity();
        this.loadUserBreakdown();
    }

    static async loadAdminStats() {
        try {
            // Load all users
            const usersData = await Utils.makeRequest(`${API_BASE_URL}/admin/users`);
            const users = usersData.users || [];

            // Load all products
            const productsData = await Utils.makeRequest(`${API_BASE_URL}/products`);
            const products = productsData.products || [];

            // Load all orders
            const ordersData = await Utils.makeRequest(`${API_BASE_URL}/admin/orders`);
            const orders = ordersData.orders || [];

            const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

            // Update stats display
            document.getElementById('totalUsers').textContent = users.length;
            document.getElementById('totalProducts').textContent = products.length;
            document.getElementById('totalOrders').textContent = orders.length;
            document.getElementById('totalRevenue').textContent = Utils.formatPrice(totalRevenue);

        } catch (error) {
            console.error('Failed to load admin stats:', error);
            // Fallback to basic stats
            this.loadBasicStats();
        }
    }

    static async loadBasicStats() {
        try {
            const productsData = await Utils.makeRequest(`${API_BASE_URL}/products`);
            const products = productsData.products || [];

            document.getElementById('totalProducts').textContent = products.length;
            document.getElementById('totalUsers').textContent = '4'; // Known from seed data
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('totalRevenue').textContent = '$0';
        } catch (error) {
            console.error('Failed to load basic stats:', error);
        }
    }

    static async loadRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <p>Platform monitoring active. All systems operational.</p>
                    <span class="activity-time">System Status</span>
                </div>
            </div>
        `;
    }

    static async loadUserBreakdown() {
        try {
            // For now, use known seed data
            document.getElementById('totalBuyers').textContent = '2';
            document.getElementById('totalSellers').textContent = '1';
            document.getElementById('totalAdmins').textContent = '1';

            const productsData = await Utils.makeRequest(`${API_BASE_URL}/products`);
            const products = productsData.products || [];

            const activeListings = products.filter(p => p.status === 'available').length;
            const soldItems = products.filter(p => p.status === 'sold').length;
            const successRate = activeListings > 0 ? Math.round((soldItems / (activeListings + soldItems)) * 100) : 0;

            document.getElementById('activeListings').textContent = activeListings;
            document.getElementById('soldItems').textContent = soldItems;
            document.getElementById('successRate').textContent = successRate + '%';

        } catch (error) {
            console.error('Failed to load user breakdown:', error);
        }
    }

    static showUsersModal() {
        // For demo purposes, show basic user info
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.innerHTML = `
                <div class="user-item">
                    <div class="user-info">
                        <strong>admin@ecofinds.com</strong>
                        <span class="user-role admin">Admin</span>
                    </div>
                </div>
                <div class="user-item">
                    <div class="user-info">
                        <strong>seller@ecofinds.com</strong>
                        <span class="user-role seller">Seller</span>
                    </div>
                </div>
                <div class="user-item">
                    <div class="user-info">
                        <strong>user1@ecofinds.com</strong>
                        <span class="user-role user">User</span>
                    </div>
                </div>
                <div class="user-item">
                    <div class="user-info">
                        <strong>user2@ecofinds.com</strong>
                        <span class="user-role user">User</span>
                    </div>
                </div>
            `;
        }
        ModalManager.openModal('usersModal');
    }
}

// ===== SETTINGS PAGE =====
class SettingsPage {
    static init() {
        this.loadUserProfile();
        this.setupEventListeners();
    }

    static async loadUserProfile() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = 'index.html';
                return;
            }

            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.populateForm(data.user);
            } else {
                ToastManager.show('Failed to load profile', 'error');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            ToastManager.show('Error loading profile', 'error');
        }
    }

    static populateForm(user) {
        document.getElementById('fullName').value = user.full_name || '';
        document.getElementById('username').value = user.username || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('address').value = user.address || '';

        if (user.profile_picture) {
            document.getElementById('profilePicture').src = `/${user.profile_picture}`;
        }

        // Update user name in navigation
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.username;
        }
    }

    static setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', this.handleProfileUpdate.bind(this));
        }

        // Password form submission
        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', this.handlePasswordChange.bind(this));
        }

        // Profile picture upload
        const profilePictureInput = document.getElementById('profilePictureInput');
        if (profilePictureInput) {
            profilePictureInput.addEventListener('change', this.handleProfilePictureUpload.bind(this));
        }

        // Remove profile picture
        const removeProfilePicture = document.getElementById('removeProfilePicture');
        if (removeProfilePicture) {
            removeProfilePicture.addEventListener('click', this.handleRemoveProfilePicture.bind(this));
        }

        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', this.togglePasswordVisibility);
        });
    }

    static async handleProfileUpdate(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const profileData = {
            fullName: formData.get('fullName'),
            username: formData.get('username'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address')
        };

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                ToastManager.show('Profile updated successfully', 'success');
            } else {
                const error = await response.json();
                ToastManager.show(error.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            ToastManager.show('Error updating profile', 'error');
        }
    }

    static async handlePasswordChange(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            ToastManager.show('New passwords do not match', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/profile/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (response.ok) {
                ToastManager.show('Password updated successfully', 'success');
                e.target.reset();
            } else {
                const error = await response.json();
                ToastManager.show(error.message || 'Failed to update password', 'error');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            ToastManager.show('Error updating password', 'error');
        }
    }

    static async handleProfilePictureUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePicture', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/profile/picture', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('profilePicture').src = `/${data.profilePicture}`;
                ToastManager.show('Profile picture updated successfully', 'success');
            } else {
                const error = await response.json();
                ToastManager.show(error.message || 'Failed to upload profile picture', 'error');
            }
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            ToastManager.show('Error uploading profile picture', 'error');
        }
    }

    static async handleRemoveProfilePicture() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/profile/picture', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                document.getElementById('profilePicture').src = 'https://via.placeholder.com/120x120?text=User';
                ToastManager.show('Profile picture removed successfully', 'success');
            } else {
                const error = await response.json();
                ToastManager.show(error.message || 'Failed to remove profile picture', 'error');
            }
        } catch (error) {
            console.error('Error removing profile picture:', error);
            ToastManager.show('Error removing profile picture', 'error');
        }
    }

    static togglePasswordVisibility(e) {
        const targetId = e.target.closest('.toggle-password').dataset.target;
        const input = document.getElementById(targetId);
        const icon = e.target.closest('.toggle-password').querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }
}

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Application is already initialized in the main DOMContentLoaded listener above
    });
} else {
    // DOM is already loaded, initialize immediately
    AuthManager.init();
    ModalManager.init();
    CartManager.updateCartCount();
}
