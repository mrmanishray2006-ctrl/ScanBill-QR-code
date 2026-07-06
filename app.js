/**
 * Smart QR Billing & Store Management Application Logic
 * Implements client-side database, routing, QR generator, barcode scanner, PDF creator, and sales charts.
 */

// Global Application Instance
const app = {
  // Database Schema & Persistence Utility (localStorage wrapper)
  db: {
    init() {
      // Check if data is already seeded
      if (!localStorage.getItem('qr_store_users')) {
        this.seedMockDatabase();
      }
    },
    
    get(key) {
      try {
        return JSON.parse(localStorage.getItem('qr_store_' + key)) || [];
      } catch (e) {
        console.error("Database read error for key: " + key, e);
        return [];
      }
    },
    
    set(key, data) {
      try {
        localStorage.setItem('qr_store_' + key, JSON.stringify(data));
      } catch (e) {
        console.error("Database write error for key: " + key, e);
        app.toast.error("Failed to write to database storage.");
      }
    },
    
    seedMockDatabase() {
      // 1. Initial Mock Users
      const users = [
        {
          id: "usr_owner_1",
          name: "Rajesh Kumar",
          email: "owner@store.com",
          password: "password",
          role: "owner",
          storeId: "str_1"
        },
        {
          id: "usr_customer_1",
          name: "Amit Sharma",
          email: "customer@email.com",
          password: "password",
          role: "customer"
        }
      ];
      this.set('users', users);

      // 2. Initial Mock Store Config
      const store = {
        id: "str_1",
        ownerId: "usr_owner_1",
        name: "Kumar Digital Mart",
        address: "12, MG Road, Block C, Bengaluru, KA 560001",
        logoUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80",
        paymentUpiId: "kumar.mart@okicici",
        merchantName: "KUMAR DIGITAL MART",
        razorpayKeyId: "rzp_test_5M89HqKwsPL2",
        subscriptionStatus: "active", // active, expired
        createdAt: new Date().toISOString()
      };
      // For simple single store setup, store as single object inside array
      this.set('stores', [store]);

      // 3. Initial Catalog Products
      const products = [
        {
          id: "prod_1",
          storeId: "str_1",
          name: "Wireless Gaming Mouse",
          sku: "MOUSE-WL-101",
          category: "Electronics",
          description: "Ergonomic 2.4GHz wireless gaming mouse with 3200 DPI sensor and RGB lights.",
          price: 1499.00,
          stockQty: 45,
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_2",
          storeId: "str_1",
          name: "Mechanical Keyboard",
          sku: "KEY-MECH-202",
          category: "Electronics",
          description: "Tenkeyless mechanical keyboard with clicky blue switch keys and custom backlighting.",
          price: 2999.00,
          stockQty: 8, // Low Stock Alert Trigger!
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_3",
          storeId: "str_1",
          name: "Noise Cancelling Headphones",
          sku: "HEAD-NC-303",
          category: "Electronics",
          description: "Over-ear active noise cancelling Bluetooth headphones with 30-hour battery life.",
          price: 4999.00,
          stockQty: 25,
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_4",
          storeId: "str_1",
          name: "Stainless Steel Coffee Mug",
          sku: "MUG-SS-404",
          category: "Kitchenware",
          description: "Double-walled vacuum insulated travel mug, keeps beverages hot for 12 hours.",
          price: 899.00,
          stockQty: 30,
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_5",
          storeId: "str_1",
          name: "RFID Blocking Leather Wallet",
          sku: "WAL-LTHR-505",
          category: "Accessories",
          description: "Genuine leather bi-fold wallet with security RFID blocking slots and card compartments.",
          price: 1299.00,
          stockQty: 4, // Low Stock Alert Trigger!
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1627124486290-08c8799b75ee?w=300",
          createdAt: new Date().toISOString()
        },
        {
          id: "prod_6",
          storeId: "str_1",
          name: "Eco Organic Cotton Tote Bag",
          sku: "BAG-TOTE-606",
          category: "Accessories",
          description: "Reusable heavy-duty organic cotton tote bag, washable and durable.",
          price: 249.00,
          stockQty: 120,
          isActive: true,
          imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300",
          createdAt: new Date().toISOString()
        }
      ];
      this.set('products', products);

      // 4. Initial Orders & Payment Ledger
      const orders = [
        {
          id: "ord_1",
          customerId: "usr_customer_1",
          customerName: "Amit Sharma",
          customerEmail: "customer@email.com",
          storeId: "str_1",
          invoiceNumber: "INV-109021",
          items: [
            { productId: "prod_1", name: "Wireless Gaming Mouse", price: 1499.00, quantity: 1 },
            { productId: "prod_4", name: "Stainless Steel Coffee Mug", price: 899.00, quantity: 2 }
          ],
          subtotal: 3297.00,
          tax: 593.46,
          discount: 329.70,
          total: 3560.76,
          paymentStatus: "paid",
          txRef: "UPI9031892019A",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
        },
        {
          id: "ord_2",
          customerId: "usr_customer_1",
          customerName: "Amit Sharma",
          customerEmail: "customer@email.com",
          storeId: "str_1",
          invoiceNumber: "INV-109022",
          items: [
            { productId: "prod_3", name: "Noise Cancelling Headphones", price: 4999.00, quantity: 1 }
          ],
          subtotal: 4999.00,
          tax: 899.82,
          discount: 499.90,
          total: 5398.92,
          paymentStatus: "paid",
          txRef: "UPI9041289031B",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        }
      ];
      this.set('orders', orders);

      // 5. Initial Subscriptions Log
      const subscriptions = [
        {
          id: "sub_1",
          ownerId: "usr_owner_1",
          planName: "pro",
          amount: 2499.00,
          startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        }
      ];
      this.set('subscriptions', subscriptions);
    }
  },

  // Authentication & Session management
  auth: {
    currentUser: null,
    
    init() {
      // Restore session from sessionStorage or localStorage
      const savedUser = sessionStorage.getItem('logged_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.updateHeaderUI();
      }
    },
    
    handleLogin(e, role) {
      e.preventDefault();
      const email = document.getElementById(role + '-login-email').value.trim();
      const password = document.getElementById(role + '-login-password').value;
      
      const users = app.db.get('users');
      const user = users.find(u => u.email === email && u.password === password && u.role === role);
      
      if (user) {
        this.currentUser = user;
        sessionStorage.setItem('logged_user', JSON.stringify(user));
        this.updateHeaderUI();
        app.toast.success("Successfully logged in as " + user.name);
        
        if (role === 'owner') {
          app.router.navigate('#owner-dashboard');
        } else {
          app.router.navigate('#customer-home');
        }
      } else {
        app.toast.error("Invalid credentials or role mismatch.");
      }
    },
    
    handleSignup(e, role) {
      e.preventDefault();
      const name = document.getElementById(role + '-signup-name').value.trim();
      const email = document.getElementById(role + '-signup-email').value.trim();
      const password = document.getElementById(role + '-signup-password').value;
      
      const users = app.db.get('users');
      
      // Check duplicate email
      if (users.some(u => u.email === email)) {
        app.toast.error("An account with this email already exists.");
        return;
      }
      
      const newUserId = "usr_" + Date.now();
      const newUser = { id: newUserId, name, email, password, role };
      
      if (role === 'owner') {
        const storeName = document.getElementById('owner-signup-store-name').value.trim();
        const upiId = document.getElementById('owner-signup-upi').value.trim();
        const storeId = "str_" + Date.now();
        
        // Add store ID to user reference
        newUser.storeId = storeId;
        
        // Save store details
        const stores = app.db.get('stores');
        stores.push({
          id: storeId,
          ownerId: newUserId,
          name: storeName,
          address: "Store Address to be set in settings...",
          logoUrl: "",
          paymentUpiId: upiId,
          merchantName: storeName.toUpperCase(),
          razorpayKeyId: "",
          subscriptionStatus: "active",
          createdAt: new Date().toISOString()
        });
        app.db.set('stores', stores);
        
        // Setup initial subscription
        const subs = app.db.get('subscriptions');
        subs.push({
          id: "sub_" + Date.now(),
          ownerId: newUserId,
          planName: "pro",
          amount: 2499.00,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        });
        app.db.set('subscriptions', subs);
      }
      
      users.push(newUser);
      app.db.set('users', users);
      
      // Auto login
      this.currentUser = newUser;
      sessionStorage.setItem('logged_user', JSON.stringify(newUser));
      this.updateHeaderUI();
      app.toast.success("Registration successful! Welcome " + name);
      
      if (role === 'owner') {
        app.router.navigate('#owner-dashboard');
      } else {
        app.router.navigate('#customer-home');
      }
    },
    
    logout() {
      this.currentUser = null;
      sessionStorage.removeItem('logged_user');
      this.updateHeaderUI();
      app.toast.info("Logged out successfully.");
      app.router.navigate('#home');
    },
    
    updateHeaderUI() {
      const nameTag = document.getElementById('user-display-name');
      const logoutBtn = document.getElementById('logout-btn');
      const portalBtn = document.getElementById('login-portal-btn');
      const navOwner = document.getElementById('nav-owner-links');
      const navCustomer = document.getElementById('nav-customer-links');
      const mobileNav = document.getElementById('mobile-nav-bar');
      const mobOwner = document.getElementById('mobile-owner-nav');
      const mobCustomer = document.getElementById('mobile-customer-nav');
      
      if (this.currentUser) {
        nameTag.innerText = this.currentUser.name + " (" + this.currentUser.role.toUpperCase() + ")";
        nameTag.style.display = "block";
        logoutBtn.style.display = "flex";
        portalBtn.style.display = "none";
        mobileNav.style.display = "block";
        
        if (this.currentUser.role === 'owner') {
          navOwner.style.display = "flex";
          navCustomer.style.display = "none";
          mobOwner.style.display = "flex";
          mobCustomer.style.display = "none";
        } else {
          navOwner.style.display = "none";
          navCustomer.style.display = "flex";
          mobOwner.style.display = "none";
          mobCustomer.style.display = "flex";
          app.cart.updateCartBadge();
        }
      } else {
        nameTag.style.display = "none";
        logoutBtn.style.display = "none";
        portalBtn.style.display = "flex";
        navOwner.style.display = "none";
        navCustomer.style.display = "none";
        mobileNav.style.display = "none";
        mobOwner.style.display = "none";
        mobCustomer.style.display = "none";
      }
      lucide.createIcons();
    }
  },

  // Router for managing hash routes
  router: {
    routes: {},
    
    init() {
      window.addEventListener('hashchange', () => this.handleRouting());
      window.addEventListener('load', () => this.handleRouting());
    },
    
    navigate(hash) {
      window.location.hash = hash;
    },
    
    handleRouting() {
      const hash = window.location.hash || '#home';
      const sections = document.querySelectorAll('.view-section');
      
      // Close any active scanner if leaving scanner page
      if (hash !== '#customer-scanner') {
        app.scanner.stopScanner();
      }
      
      // Route Protection & Role check
      const user = app.auth.currentUser;
      const isOwnerRoute = (hash.startsWith('#owner-') && hash !== '#owner-login' && hash !== '#owner-signup') || ['#product-list', '#inventory', '#qr-gallery', '#reports', '#subscription', '#store-settings'].includes(hash);
      const isCustomerRoute = (hash.startsWith('#customer-') && hash !== '#customer-login' && hash !== '#customer-signup') || ['#checkout', '#upi-payment', '#view-receipt'].includes(hash);
      
      if (isOwnerRoute && (!user || user.role !== 'owner')) {
        app.toast.error("Access denied. Please login as Owner.");
        this.navigate('#owner-login');
        return;
      }
      
      if (isCustomerRoute && (!user || user.role !== 'customer')) {
        app.toast.error("Access denied. Please login as Customer.");
        this.navigate('#customer-login');
        return;
      }
      
      // Hide all views, display the current matching one
      let matched = false;
      sections.forEach(sec => {
        const routeId = sec.id.replace('view-', '#');
        if (routeId === hash) {
          sec.classList.add('active');
          matched = true;
          this.triggerViewController(hash);
        } else {
          sec.classList.remove('active');
        }
      });
      
      if (!matched && hash === '#home') {
        document.getElementById('view-home').classList.add('active');
      }
      
      // Update Navbar selection indicator
      document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(el => {
        if (el.getAttribute('href') === hash) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      });
      
      window.scrollTo(0, 0);
    },
    
    triggerViewController(hash) {
      // Dynamic page refresh scripts
      switch (hash) {
        case '#owner-dashboard':
          app.dashboard.loadOverview();
          break;
        case '#product-list':
          app.products.loadDirectory();
          break;
        case '#qr-gallery':
          app.qr.loadGallery();
          break;
        case '#inventory':
          app.inventory.loadStockLevels();
          break;
        case '#reports':
          app.reports.loadLedger();
          break;
        case '#subscription':
          app.subscription.loadBilling();
          break;
        case '#store-settings':
          app.settings.loadForm();
          break;
        case '#customer-home':
          app.customerHome.loadData();
          break;
        case '#customer-scanner':
          app.scanner.startScanner();
          break;
        case '#customer-cart':
          app.cart.loadCartItems();
          break;
        case '#checkout':
          app.checkout.loadCheckoutInvoice();
          break;
        case '#upi-payment':
          app.checkout.loadUPIPaymentGateway();
          break;
        case '#view-receipt':
          app.receipt.loadReceiptPage();
          break;
        case '#customer-orders':
          app.receipt.loadCustomerOrdersHistory();
          break;
      }
      lucide.createIcons();
    }
  },

  // Owner Dashboard logic
  dashboard: {
    salesChart: null,
    
    loadOverview() {
      const owner = app.auth.currentUser;
      const stores = app.db.get('stores');
      const store = stores.find(s => s.ownerId === owner.id);
      
      if (!store) return;
      
      document.getElementById('dashboard-store-name').innerText = store.name;
      
      // Calc metrics
      const products = app.db.get('products').filter(p => p.storeId === store.id);
      const orders = app.db.get('orders').filter(o => o.storeId === store.id && o.paymentStatus === 'paid');
      
      const totalProducts = products.length;
      const disabledProducts = products.filter(p => !p.isActive).length;
      
      // Stock Alerts
      const lowStockProducts = products.filter(p => p.stockQty < 10);
      const lowStockCount = lowStockProducts.length;
      
      // Today's Sales
      const todayStr = new Date().toDateString();
      const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
      const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
      
      // UI Update
      document.getElementById('stat-today-sales').innerText = "₹" + todaySales.toFixed(2);
      document.getElementById('stat-sales-count').innerText = todayOrders.length + " transactions today";
      
      document.getElementById('stat-total-products').innerText = totalProducts;
      document.getElementById('stat-disabled-count').innerText = disabledProducts + " items disabled";
      
      document.getElementById('stat-low-stock').innerText = lowStockCount;
      document.getElementById('stat-low-stock-desc').innerText = lowStockCount + " items require restocking";
      
      const subBadge = document.getElementById('stat-sub-tier');
      const subExpiry = document.getElementById('stat-sub-expiry');
      
      if (store.subscriptionStatus === 'active') {
        subBadge.innerText = "Pro Tier";
        subBadge.className = "stat-card-value text-indigo";
        subExpiry.innerText = "Premium Active";
        subExpiry.className = "stat-card-desc text-green";
        document.getElementById('low-stock-alert-header').style.display = lowStockCount > 0 ? "block" : "none";
      } else {
        subBadge.innerText = "Expired";
        subBadge.className = "stat-card-value text-red";
        subExpiry.innerText = "Upgrade required!";
        subExpiry.className = "stat-card-desc text-red";
        document.getElementById('low-stock-alert-header').style.display = "block";
        document.getElementById('low-stock-alert-header').innerHTML = `<span class="badge badge-danger pulse"><i data-lucide="alert-octagon"></i> Plan Expired</span>`;
      }
      
      // Render Low Stock list
      const lowStockList = document.getElementById('dashboard-low-stock-list');
      lowStockList.innerHTML = "";
      if (lowStockProducts.length > 0) {
        lowStockProducts.forEach(p => {
          lowStockList.innerHTML += `
            <div class="alert-item">
              <div class="alert-info">
                <h4>${p.name}</h4>
                <p>SKU: ${p.sku} | Price: ₹${p.price.toFixed(2)}</p>
              </div>
              <div class="alert-action">
                <span class="alert-qty-badge">${p.stockQty} left</span>
                <button class="restock-btn" onclick="app.dashboard.quickRestock('${p.id}')" title="Quick add 50 stock">
                  <i data-lucide="plus"></i>
                </button>
              </div>
            </div>
          `;
        });
      } else {
        lowStockList.innerHTML = `<p class="empty-text">No low stock items. Excellent!</p>`;
      }
      
      // Render recent transactions list
      const ordersList = document.getElementById('dashboard-orders-list');
      ordersList.innerHTML = "";
      const recentOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
      
      if (recentOrders.length > 0) {
        recentOrders.forEach(o => {
          const dt = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          ordersList.innerHTML += `
            <div class="recent-order-item">
              <div class="order-info">
                <h4>${o.invoiceNumber}</h4>
                <p>${o.customerName} | ${dt}</p>
              </div>
              <span class="order-amount text-green">₹${o.total.toFixed(2)}</span>
            </div>
          `;
        });
      } else {
        ordersList.innerHTML = `<p class="empty-text">No transactions logged today.</p>`;
      }
      
      this.renderCharts(orders);
    },
    
    quickRestock(prodId) {
      const products = app.db.get('products');
      const product = products.find(p => p.id === prodId);
      if (product) {
        product.stockQty += 50;
        app.db.set('products', products);
        app.toast.success("Restocked 50 units for " + product.name);
        this.loadOverview();
      }
    },
    
    renderCharts(orders) {
      // Destory old chart if exists
      if (this.salesChart) {
        this.salesChart.destroy();
      }
      
      // Generate daily sales for the past 7 days
      const days = [];
      const revenue = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toLocaleDateString([], { weekday: 'short' }));
        
        // Sum revenue for that day
        const dayStr = d.toDateString();
        const dayRevenue = orders
          .filter(o => new Date(o.createdAt).toDateString() === dayStr)
          .reduce((sum, o) => sum + o.total, 0);
        revenue.push(dayRevenue);
      }
      
      const ctx = document.getElementById('salesSummaryChart').getContext('2d');
      this.salesChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{
            label: 'Sales Revenue (INR)',
            data: revenue,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            },
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }
  },

  // Product Directory CRUD controls
  products: {
    categoryList: [],
    
    loadDirectory() {
      const owner = app.auth.currentUser;
      const stores = app.db.get('stores');
      const store = stores.find(s => s.ownerId === owner.id);
      if (!store) return;
      
      this.filterProducts();
    },
    
    filterProducts() {
      const owner = app.auth.currentUser;
      const products = app.db.get('products').filter(p => p.storeId === owner.storeId);
      
      const searchVal = document.getElementById('product-search-input').value.toLowerCase();
      const catVal = document.getElementById('product-filter-category').value;
      const statusVal = document.getElementById('product-filter-status').value;
      
      // Update category selector options
      const categories = [...new Set(products.map(p => p.category))];
      const catSelector = document.getElementById('product-filter-category');
      const activeCat = catSelector.value;
      
      catSelector.innerHTML = '<option value="all">All Categories</option>';
      categories.forEach(cat => {
        catSelector.innerHTML += `<option value="${cat}" ${activeCat === cat ? 'selected' : ''}>${cat}</option>`;
      });
      
      let filtered = products;
      
      // 1. Search Query
      if (searchVal) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchVal) || 
          p.sku.toLowerCase().includes(searchVal) ||
          p.category.toLowerCase().includes(searchVal)
        );
      }
      
      // 2. Category Filter
      if (catVal !== 'all') {
        filtered = filtered.filter(p => p.category === catVal);
      }
      
      // 3. Status Filter
      if (statusVal !== 'all') {
        const activeOnly = statusVal === 'active';
        filtered = filtered.filter(p => p.isActive === activeOnly);
      }
      
      this.renderProductGrid(filtered);
    },
    
    renderProductGrid(products) {
      const grid = document.getElementById('products-catalog-container');
      grid.innerHTML = "";
      
      if (products.length > 0) {
        products.forEach(p => {
          const lowStockClass = p.stockQty < 10 ? 'badge-danger pulse' : 'badge-success';
          const statusBadge = p.isActive 
            ? `<span class="badge badge-info product-card-badge">Enabled</span>`
            : `<span class="badge badge-danger product-card-badge">Disabled</span>`;
            
          grid.innerHTML += `
            <div class="product-card ${!p.isActive ? 'product-card-disabled' : ''}">
              ${statusBadge}
              <div class="product-card-image">
                ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}">` : `<i data-lucide="image"></i>`}
              </div>
              <div class="product-card-details">
                <span class="product-card-category">${p.category}</span>
                <h3 class="product-card-title">${p.name}</h3>
                <span class="product-card-sku">SKU: ${p.sku}</span>
                
                <div class="product-card-price-stock">
                  <span class="product-card-price">₹${p.price.toFixed(2)}</span>
                  <span class="badge ${lowStockClass}">Stock: ${p.stockQty}</span>
                </div>
                
                <div class="product-card-actions">
                  <button class="btn btn-outline btn-sm" style="flex: 1;" onclick="app.products.openProductModal('${p.id}')">
                    <i data-lucide="edit"></i> Edit
                  </button>
                  <button class="btn btn-primary btn-sm" onclick="app.qr.previewQR('${p.id}')" title="View Product QR">
                    <i data-lucide="qr-code"></i> QR
                  </button>
                  <button class="btn ${p.isActive ? 'btn-outline' : 'btn-accent'} btn-sm" onclick="app.products.toggleProductStatus('${p.id}')" title="${p.isActive ? 'Disable product' : 'Enable product'}">
                    <i data-lucide="${p.isActive ? 'eye-off' : 'eye'}"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        });
      } else {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No products match the selected criteria.</div>`;
      }
      lucide.createIcons();
    },
    
    openProductModal(prodId = '') {
      // Access Control: Check if subscription is expired
      const owner = app.auth.currentUser;
      const store = app.db.get('stores').find(s => s.ownerId === owner.id);
      if (store && store.subscriptionStatus !== 'active') {
        app.toast.error("Subscription expired. Please renew your plan to manage catalog products.");
        app.router.navigate('#subscription');
        return;
      }
      
      const form = document.getElementById('product-form');
      form.reset();
      
      if (prodId) {
        document.getElementById('product-modal-title').innerText = "Edit Catalog Product";
        document.getElementById('product-modal-submit-btn').innerText = "Save Changes";
        
        const products = app.db.get('products');
        const p = products.find(prod => prod.id === prodId);
        
        if (p) {
          document.getElementById('product-form-id').value = p.id;
          document.getElementById('product-name').value = p.name;
          document.getElementById('product-sku').value = p.sku;
          document.getElementById('product-price').value = p.price;
          document.getElementById('product-stock').value = p.stockQty;
          document.getElementById('product-category').value = p.category;
          document.getElementById('product-image-url').value = p.imageUrl;
          document.getElementById('product-description').value = p.description || '';
          document.getElementById('product-status-active').checked = p.isActive;
        }
      } else {
        document.getElementById('product-modal-title').innerText = "Add New Product";
        document.getElementById('product-modal-submit-btn').innerText = "Add Product";
        document.getElementById('product-form-id').value = "";
        document.getElementById('product-status-active').checked = true;
      }
      
      document.getElementById('product-modal').classList.add('active');
      lucide.createIcons();
    },
    
    closeProductModal() {
      document.getElementById('product-modal').classList.remove('active');
    },
    
    saveProduct(e) {
      e.preventDefault();
      const owner = app.auth.currentUser;
      const products = app.db.get('products');
      
      const id = document.getElementById('product-form-id').value;
      const name = document.getElementById('product-name').value.trim();
      const sku = document.getElementById('product-sku').value.trim().toUpperCase();
      const price = parseFloat(document.getElementById('product-price').value);
      const stockQty = parseInt(document.getElementById('product-stock').value);
      const category = document.getElementById('product-category').value.trim();
      const imageUrl = document.getElementById('product-image-url').value.trim();
      const description = document.getElementById('product-description').value.trim();
      const isActive = document.getElementById('product-status-active').checked;
      
      // SKU uniqueness validation
      const existingSku = products.find(p => p.sku === sku && p.id !== id && p.storeId === owner.storeId);
      if (existingSku) {
        app.toast.error("A product with this SKU ID already exists.");
        return;
      }
      
      if (id) {
        // Edit Mode
        const pIndex = products.findIndex(p => p.id === id);
        if (pIndex !== -1) {
          products[pIndex] = {
            ...products[pIndex],
            name, sku, price, stockQty, category, imageUrl, description, isActive,
            updatedAt: new Date().toISOString()
          };
          app.toast.success("Product updated successfully.");
        }
      } else {
        // Add Mode
        const newProduct = {
          id: "prod_" + Date.now(),
          storeId: owner.storeId,
          name, sku, price, stockQty, category, imageUrl, description, isActive,
          createdAt: new Date().toISOString()
        };
        products.push(newProduct);
        app.toast.success("Product created. Unique QR code generated automatically.");
      }
      
      app.db.set('products', products);
      this.closeProductModal();
      this.loadDirectory();
    },
    
    toggleProductStatus(prodId) {
      const products = app.db.get('products');
      const pIndex = products.findIndex(p => p.id === prodId);
      if (pIndex !== -1) {
        products[pIndex].isActive = !products[pIndex].isActive;
        app.db.set('products', products);
        app.toast.info(`Product is now ${products[pIndex].isActive ? 'enabled' : 'disabled'}.`);
        this.loadDirectory();
      }
    }
  },

  // QR Code generator and exporter
  qr: {
    previewQR(prodId) {
      const products = app.db.get('products');
      const p = products.find(prod => prod.id === prodId);
      if (!p) return;
      
      document.getElementById('qr-detail-title').innerText = p.name;
      document.getElementById('qr-detail-sku').innerText = "SKU: " + p.sku;
      document.getElementById('qr-detail-price').innerText = "Price: ₹" + p.price.toFixed(2);
      
      const holder = document.getElementById('qr-canvas-holder');
      holder.innerHTML = "";
      
      // Generate QR Code payload format
      const qrPayload = JSON.stringify({
        v: 1,
        sid: p.storeId,
        pid: p.id,
        sku: p.sku
      });
      
      // Render QRCode using davidshimjs library
      new QRCode(holder, {
        text: qrPayload,
        width: 180,
        height: 180,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
      
      // Setup print callback
      document.getElementById('qr-detail-pdf-btn').onclick = () => {
        this.downloadSinglePDF(p, qrPayload);
      };
      
      document.getElementById('qr-detail-modal').classList.add('active');
      lucide.createIcons();
    },
    
    closeDetailModal() {
      document.getElementById('qr-detail-modal').classList.remove('active');
    },
    
    loadGallery() {
      const owner = app.auth.currentUser;
      const products = app.db.get('products').filter(p => p.storeId === owner.storeId);
      
      const container = document.getElementById('qr-codes-container');
      container.innerHTML = "";
      
      if (products.length > 0) {
        products.forEach(p => {
          container.innerHTML += `
            <div class="qr-card">
              <div class="qr-checkbox-wrapper">
                <input type="checkbox" class="qr-bulk-select-checkbox" value="${p.id}" checked>
              </div>
              <div class="qr-card-img-placeholder" onclick="app.qr.previewQR('${p.id}')" style="cursor: pointer;" id="gallery-qr-render-${p.id}">
                <!-- QR will render here -->
              </div>
              <h4 class="qr-card-title">${p.name}</h4>
              <p class="qr-card-sku">SKU: ${p.sku}</p>
              <div class="qr-card-actions">
                <button class="btn btn-outline btn-sm btn-block" onclick="app.qr.previewQR('${p.id}')">
                  <i data-lucide="eye"></i> View QR
                </button>
              </div>
            </div>
          `;
          
          // Delayed QR injection
          setTimeout(() => {
            const el = document.getElementById(`gallery-qr-render-${p.id}`);
            if (el) {
              el.innerHTML = "";
              const payload = JSON.stringify({ v: 1, sid: p.storeId, pid: p.id, sku: p.sku });
              new QRCode(el, {
                text: payload,
                width: 120,
                height: 120,
                colorDark : "#0f172a",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
              });
            }
          }, 50);
        });
      } else {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No products registered yet to generate QR codes.</div>`;
      }
      lucide.createIcons();
    },
    
    downloadSinglePDF(product, qrPayload) {
      // Access Control: Subscription check
      const owner = app.auth.currentUser;
      const store = app.db.get('stores').find(s => s.ownerId === owner.id);
      if (store && store.subscriptionStatus !== 'active') {
        app.toast.error("Plan expired. Upgrade to print PDF barcodes.");
        return;
      }
      
      app.toast.info("Generating PDF page...");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a6" // Small pocket page size for tags
      });
      
      // Get QR Code Image Data URL from DOM canvas
      const qrCanvas = document.querySelector('#qr-canvas-holder canvas');
      if (!qrCanvas) {
        app.toast.error("Error creating PDF: QR canvas not loaded.");
        return;
      }
      
      const imgData = qrCanvas.toDataURL("image/png");
      
      // Draw border
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(1);
      doc.rect(5, 5, 95, 138); // Border margin
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(" Kumar Digital Mart ", 52.5, 20, { align: "center" });
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 26, 90, 26);
      
      // Image QR
      doc.addImage(imgData, 'PNG', 20, 32, 65, 65);
      
      // Details
      doc.setFontSize(12);
      doc.text(product.name, 52.5, 108, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("SKU: " + product.sku, 52.5, 116, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text("Price: Rs. " + product.price.toFixed(2), 52.5, 128, { align: "center" });
      
      doc.save(`QR_${product.sku}.pdf`);
      app.toast.success("Downloaded PDF tag successfully.");
    },
    
    exportSelectedPDFs() {
      const checkboxes = document.querySelectorAll('.qr-bulk-select-checkbox:checked');
      if (checkboxes.length === 0) {
        app.toast.error("Please select at least one QR code to export.");
        return;
      }
      
      const selectedIds = Array.from(checkboxes).map(cb => cb.value);
      const products = app.db.get('products').filter(p => selectedIds.includes(p.id));
      
      this.generateBulkPDF(products);
    },
    
    exportAllQRToPDF() {
      const owner = app.auth.currentUser;
      const products = app.db.get('products').filter(p => p.storeId === owner.storeId);
      
      if (products.length === 0) {
        app.toast.error("No products available to export.");
        return;
      }
      this.generateBulkPDF(products);
    },
    
    generateBulkPDF(products) {
      // Subscription Check
      const owner = app.auth.currentUser;
      const store = app.db.get('stores').find(s => s.ownerId === owner.id);
      if (store && store.subscriptionStatus !== 'active') {
        app.toast.error("Plan expired. Upgrade to export batch PDFs.");
        return;
      }
      
      app.toast.info("Generating batch PDF document...");
      
      // Temporary container in DOM to render QRs to grab image datas
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4" // 210 x 297 mm
      });
      
      // 3x3 Grid Layout parameters
      const colWidth = 60;
      const rowHeight = 85;
      const xMargin = 15;
      const yMargin = 20;
      
      let count = 0;
      
      const drawProductTag = (p, index) => {
        return new Promise((resolve) => {
          const cellId = `temp-qr-${p.id}`;
          const cellEl = document.createElement('div');
          cellEl.id = cellId;
          tempDiv.appendChild(cellEl);
          
          const payload = JSON.stringify({ v: 1, sid: p.storeId, pid: p.id, sku: p.sku });
          new QRCode(cellEl, {
            text: payload,
            width: 150,
            height: 150,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
          });
          
          // Wait for canvas render
          setTimeout(() => {
            const canvas = cellEl.querySelector('canvas');
            if (canvas) {
              const imgData = canvas.toDataURL("image/png");
              
              // Calc page grid coordinates
              const col = index % 3;
              const row = Math.floor(index / 3) % 3;
              
              if (index > 0 && index % 9 === 0) {
                doc.addPage();
              }
              
              const x = xMargin + (col * colWidth) + (col * 5);
              const y = yMargin + (row * rowHeight) + (row * 5);
              
              // Draw Tag Card Border
              doc.setDrawColor(226, 232, 240);
              doc.setLineWidth(0.3);
              doc.rect(x, y, colWidth, rowHeight);
              
              // Title name
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(15, 23, 42);
              
              // Wrap text to fit cell width
              const titleLines = doc.splitTextToSize(p.name, colWidth - 8);
              doc.text(titleLines, x + (colWidth / 2), y + 8, { align: "center" });
              
              // Image QR code
              doc.addImage(imgData, 'PNG', x + (colWidth - 40) / 2, y + 16, 40, 40);
              
              // SKU
              doc.setFont("helvetica", "normal");
              doc.setFontSize(7);
              doc.setTextColor(100, 116, 139);
              doc.text("SKU: " + p.sku, x + (colWidth / 2), y + 62, { align: "center" });
              
              // Price
              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(16, 185, 129);
              doc.text("Price: Rs. " + p.price.toFixed(2), x + (colWidth / 2), y + 72, { align: "center" });
            }
            resolve();
          }, 80);
        });
      };
      
      // Async sequential loops to render all tags correctly
      (async () => {
        for (let i = 0; i < products.length; i++) {
          await drawProductTag(products[i], i);
        }
        
        doc.save(`KumarMart_QR_Batch_${Date.now()}.pdf`);
        document.body.removeChild(tempDiv);
        app.toast.success("Bulk QR PDF document exported successfully.");
      })();
    }
  },

  // Stock inventory control sheet
  inventory: {
    loadStockLevels() {
      this.filterInventory();
    },
    
    filterInventory() {
      const owner = app.auth.currentUser;
      const products = app.db.get('products').filter(p => p.storeId === owner.storeId);
      const searchVal = document.getElementById('inventory-search-input').value.toLowerCase();
      
      let filtered = products;
      if (searchVal) {
        filtered = products.filter(p => 
          p.name.toLowerCase().includes(searchVal) || 
          p.sku.toLowerCase().includes(searchVal) ||
          p.category.toLowerCase().includes(searchVal)
        );
      }
      
      this.renderTable(filtered);
    },
    
    renderTable(products) {
      const tbody = document.getElementById('inventory-table-body');
      tbody.innerHTML = "";
      
      if (products.length > 0) {
        products.forEach(p => {
          let stockStatus = `<span class="badge badge-success">OK Stock</span>`;
          if (p.stockQty === 0) {
            stockStatus = `<span class="badge badge-danger pulse">Out of Stock</span>`;
          } else if (p.stockQty < 10) {
            stockStatus = `<span class="badge badge-warning pulse">Low Stock</span>`;
          }
          
          tbody.innerHTML += `
            <tr>
              <td>
                <div class="table-product-cell">
                  ${p.imageUrl ? `<img src="${p.imageUrl}" class="table-product-img" alt="${p.name}">` : `<div class="table-product-img" style="display:flex;align-items:center;justify-content:center;"><i data-lucide="image" style="width:16px;"></i></div>`}
                  <div class="table-product-info">
                    <h4>${p.name}</h4>
                    <p>Price: ₹${p.price.toFixed(2)}</p>
                  </div>
                </div>
              </td>
              <td><span class="font-mono">${p.sku}</span></td>
              <td>${p.category}</td>
              <td><strong id="stock-val-display-${p.id}" class="${p.stockQty < 10 ? 'text-red' : ''}">${p.stockQty}</strong></td>
              <td>${stockStatus}</td>
              <td style="text-align: right;">
                <div class="stock-adjust-cell">
                  <button class="qty-btn" onclick="app.inventory.adjustStock('${p.id}', -10)">-10</button>
                  <button class="qty-btn" onclick="app.inventory.adjustStock('${p.id}', -1)">-1</button>
                  <input type="number" id="stock-adjust-inp-${p.id}" class="stock-qty-input" value="0">
                  <button class="qty-btn" onclick="app.inventory.adjustStock('${p.id}', 1)">+1</button>
                  <button class="qty-btn" onclick="app.inventory.adjustStock('${p.id}', 10)">+10</button>
                  <button class="btn btn-primary btn-sm" onclick="app.inventory.applyManualInput('${p.id}')">Apply</button>
                </div>
              </td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No products registered to check inventory levels.</td></tr>`;
      }
      lucide.createIcons();
    },
    
    adjustStock(prodId, amount) {
      const products = app.db.get('products');
      const p = products.find(prod => prod.id === prodId);
      if (p) {
        const newQty = Math.max(0, p.stockQty + amount);
        p.stockQty = newQty;
        app.db.set('products', products);
        app.toast.success(`Updated ${p.name} stock level to ${newQty}.`);
        this.loadStockLevels();
        app.dashboard.loadOverview();
      }
    },
    
    applyManualInput(prodId) {
      const input = document.getElementById(`stock-adjust-inp-${prodId}`);
      const val = parseInt(input.value);
      if (isNaN(val)) {
        app.toast.error("Please enter a valid stock integer value.");
        return;
      }
      
      const products = app.db.get('products');
      const p = products.find(prod => prod.id === prodId);
      if (p) {
        const newQty = Math.max(0, p.stockQty + val);
        p.stockQty = newQty;
        app.db.set('products', products);
        app.toast.success(`Adjusted ${p.name} stock to ${newQty}.`);
        input.value = "0";
        this.loadStockLevels();
        app.dashboard.loadOverview();
      }
    }
  },

  // Sales Reports Ledger
  reports: {
    categoryChart: null,
    
    loadLedger() {
      const owner = app.auth.currentUser;
      const orders = app.db.get('orders').filter(o => o.storeId === owner.storeId);
      
      // Calculate Date boundaries (Default last 30 days)
      const endInput = document.getElementById('report-filter-end-date');
      const startInput = document.getElementById('report-filter-start-date');
      
      if (!endInput.value) {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        endInput.value = today.toISOString().split('T')[0];
        startInput.value = thirtyDaysAgo.toISOString().split('T')[0];
      }
      
      this.filterTransactions();
    },
    
    filterTransactions() {
      const owner = app.auth.currentUser;
      const orders = app.db.get('orders').filter(o => o.storeId === owner.storeId);
      
      const startDate = new Date(document.getElementById('report-filter-start-date').value);
      const endDate = new Date(document.getElementById('report-filter-end-date').value);
      // Set end date boundary to midnight of that day
      endDate.setHours(23, 59, 59, 999);
      
      const statusFilter = document.getElementById('report-filter-status').value;
      
      let filtered = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      if (statusFilter !== 'all') {
        filtered = filtered.filter(o => o.paymentStatus === statusFilter);
      }
      
      this.calculateReportMetrics(filtered);
      this.renderTable(filtered);
    },
    
    calculateReportMetrics(orders) {
      const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
      
      const grossSales = paidOrders.reduce((sum, o) => sum + o.subtotal, 0);
      const taxCollected = paidOrders.reduce((sum, o) => sum + o.tax, 0);
      const discountsAwarded = paidOrders.reduce((sum, o) => sum + o.discount, 0);
      const totalOrdersCount = paidOrders.length;
      
      document.getElementById('report-gross-sales').innerText = "₹" + grossSales.toFixed(2);
      document.getElementById('report-tax-collected').innerText = "₹" + taxCollected.toFixed(2);
      document.getElementById('report-discounts-awarded').innerText = "₹" + discountsAwarded.toFixed(2);
      document.getElementById('report-total-orders').innerText = totalOrdersCount;
      
      // Update Category distribution chart
      this.renderCategoryChart(paidOrders);
    },
    
    renderCategoryChart(orders) {
      if (this.categoryChart) {
        this.categoryChart.destroy();
      }
      
      // Grab all items sold and fetch their catalog category to compile chart
      const products = app.db.get('products');
      const catSales = {};
      
      orders.forEach(o => {
        o.items.forEach(item => {
          const p = products.find(prod => prod.id === item.productId);
          const cat = p ? p.category : "Uncategorized";
          const itemTotal = item.price * item.quantity;
          
          catSales[cat] = (catSales[cat] || 0) + itemTotal;
        });
      });
      
      const categories = Object.keys(catSales);
      const totals = Object.values(catSales);
      
      if (categories.length === 0) {
        categories.push("No Sales");
        totals.push(0);
      }
      
      const ctx = document.getElementById('categoryDistributionChart').getContext('2d');
      this.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: categories,
          datasets: [{
            data: totals,
            backgroundColor: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7'],
            borderWidth: 2,
            borderColor: '#1e293b'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#94a3b8', font: { family: 'Inter' } }
            }
          }
        }
      });
    },
    
    renderTable(orders) {
      const tbody = document.getElementById('reports-invoice-table-body');
      tbody.innerHTML = "";
      
      if (orders.length > 0) {
        // Sort descending
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        orders.forEach(o => {
          const dtStr = new Date(o.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
          const itemsCount = o.items.reduce((s, item) => s + item.quantity, 0);
          
          let statusBadge = `<span class="badge badge-warning">Pending</span>`;
          if (o.paymentStatus === 'paid') {
            statusBadge = `<span class="badge badge-success">Completed</span>`;
          } else if (o.paymentStatus === 'failed') {
            statusBadge = `<span class="badge badge-danger">Failed</span>`;
          }
          
          tbody.innerHTML += `
            <tr>
              <td><strong class="font-mono">${o.invoiceNumber}</strong></td>
              <td>${dtStr}</td>
              <td>
                <div style="font-weight:500;">${o.customerName}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);">${o.customerEmail}</div>
              </td>
              <td>${itemsCount} items</td>
              <td><strong>₹${o.total.toFixed(2)}</strong></td>
              <td><span class="font-mono text-sm">${o.txRef || '—'}</span></td>
              <td>${statusBadge}</td>
              <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="app.reports.viewReceiptDetails('${o.id}')">
                  <i data-lucide="eye"></i> Invoice
                </button>
              </td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">No transactions logged within selected date filter.</td></tr>`;
      }
      lucide.createIcons();
    },
    
    viewReceiptDetails(orderId) {
      // Cache order ID globally so receipt screen loads it
      sessionStorage.setItem('last_successful_order_id', orderId);
      app.router.navigate('#view-receipt');
    },
    
    exportInvoicesCSV() {
      const owner = app.auth.currentUser;
      const orders = app.db.get('orders').filter(o => o.storeId === owner.storeId);
      
      if (orders.length === 0) {
        app.toast.error("No invoices available to export.");
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Invoice Number,Timestamp,Customer Name,Customer Email,Items Count,Subtotal,GST Tax,Discount,Total Amount,UPI Tx Ref,Status\n";
      
      orders.forEach(o => {
        const itemsCount = o.items.reduce((s, item) => s + item.quantity, 0);
        csvContent += `"${o.invoiceNumber}","${o.createdAt}","${o.customerName}","${o.customerEmail}",${itemsCount},${o.subtotal},${o.tax},${o.discount},${o.total},"${o.txRef || ''}","${o.paymentStatus}"\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `KumarMart_Sales_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      app.toast.success("CSV file downloaded successfully.");
    }
  },

  // Owner subscription management plans
  subscription: {
    loadBilling() {
      const owner = app.auth.currentUser;
      const subs = app.db.get('subscriptions').filter(s => s.ownerId === owner.id);
      
      // Load current subscription details
      const activeSub = subs.find(s => s.status === 'active');
      const stores = app.db.get('stores');
      const store = stores.find(s => s.ownerId === owner.id);
      
      if (activeSub && store) {
        const isExp = store.subscriptionStatus !== 'active';
        
        document.getElementById('sub-active-badge').innerText = isExp ? "EXPIRED" : "ACTIVE";
        document.getElementById('sub-active-badge').className = isExp ? "sub-badge badge-danger" : "sub-badge";
        
        const tierTitle = activeSub.planName === 'pro' ? 'Pro Store Tier' : activeSub.planName === 'starter' ? 'Starter Store Tier' : 'Enterprise Store Tier';
        document.getElementById('sub-current-plan').innerText = tierTitle;
        
        const expiry = new Date(activeSub.endDate);
        document.getElementById('sub-expiry-date').innerText = (isExp ? "Expired on: " : "Renews on: ") + expiry.toLocaleDateString([], { dateStyle: 'long' });
        
        // Price label
        const planPrice = activeSub.planName === 'pro' ? '₹2,499' : activeSub.planName === 'starter' ? '₹999' : '₹5,999';
        document.querySelector('.sub-status-price .price-val').innerText = planPrice;
        
        // Progress bar calculations
        const start = new Date(activeSub.startDate).getTime();
        const end = expiry.getTime();
        const now = Date.now();
        
        const totalDuration = end - start;
        const elapsed = now - start;
        const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        
        const progressBar = document.getElementById('sub-days-progress');
        progressBar.style.width = (100 - progressPercent) + '%';
        if (isExp) {
          progressBar.style.width = '0%';
          document.getElementById('sub-days-text').innerText = "Subscription has expired. Premium features are locked.";
          document.getElementById('sub-days-text').className = "sub-progress-text text-red";
        } else {
          const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
          document.getElementById('sub-days-text').innerText = `${daysRemaining} days remaining in billing cycle. Auto-renew is enabled.`;
          document.getElementById('sub-days-text').className = "sub-progress-text";
        }
        
        // Update Grid Tiers selections UI
        document.querySelectorAll('.tier-card').forEach(card => card.classList.remove('active'));
        const activeCard = document.getElementById('tier-card-' + activeSub.planName);
        if (activeCard) {
          activeCard.classList.add('active');
          const btn = activeCard.querySelector('button');
          btn.innerText = isExp ? "Plan Expired (Click to Renew)" : "Current Active Plan";
          btn.disabled = !isExp;
          if (isExp) {
            btn.onclick = () => this.renewPlan(activeSub.planName);
          }
        }
      }
      
      // Render billing history table
      const tbody = document.getElementById('subscription-billing-table');
      tbody.innerHTML = "";
      
      if (subs.length > 0) {
        subs.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        subs.forEach(s => {
          const billingId = "TXN-SUB" + new Date(s.startDate).getTime().toString().slice(-6);
          const dtStr = new Date(s.startDate).toLocaleDateString([], { dateStyle: 'medium' });
          const tier = s.planName.toUpperCase();
          tbody.innerHTML += `
            <tr>
              <td><span class="font-mono">${billingId}</span></td>
              <td>${dtStr}</td>
              <td><strong>${tier} Store Plan</strong></td>
              <td>₹${s.amount.toFixed(2)}</td>
              <td>Direct UPI Bank Transfer</td>
              <td><span class="badge badge-success">Completed</span></td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No billing logs available.</td></tr>`;
      }
      lucide.createIcons();
    },
    
    changePlan(planName) {
      const owner = app.auth.currentUser;
      const subs = app.db.get('subscriptions');
      
      // Expire previous active plan
      subs.forEach(s => {
        if (s.ownerId === owner.id && s.status === 'active') {
          s.status = 'expired';
        }
      });
      
      const planAmount = planName === 'starter' ? 999.00 : planName === 'pro' ? 2499.00 : 5999.00;
      
      const newSub = {
        id: "sub_" + Date.now(),
        ownerId: owner.id,
        planName,
        amount: planAmount,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: "active"
      };
      
      subs.push(newSub);
      app.db.set('subscriptions', subs);
      
      // Update store state
      const stores = app.db.get('stores');
      const storeIndex = stores.findIndex(s => s.ownerId === owner.id);
      if (storeIndex !== -1) {
        stores[storeIndex].subscriptionStatus = "active";
        app.db.set('stores', stores);
      }
      
      app.toast.success("Successfully upgraded to " + planName.toUpperCase() + " billing tier.");
      this.loadBilling();
      app.dashboard.loadOverview();
    },
    
    renewPlan(planName) {
      this.changePlan(planName);
    }
  },

  // Owner Store Settings
  settings: {
    loadForm() {
      const owner = app.auth.currentUser;
      const stores = app.db.get('stores');
      const store = stores.find(s => s.ownerId === owner.id);
      
      if (store) {
        document.getElementById('settings-store-name').value = store.name;
        document.getElementById('settings-store-address').value = store.address;
        document.getElementById('settings-store-logo').value = store.logoUrl || '';
        document.getElementById('settings-upi-id').value = store.paymentUpiId;
        document.getElementById('settings-merchant-name').value = store.merchantName;
        document.getElementById('settings-razorpay-key').value = store.razorpayKeyId || '';
      }
    },
    
    saveProfile(e) {
      e.preventDefault();
      const owner = app.auth.currentUser;
      const stores = app.db.get('stores');
      const storeIndex = stores.findIndex(s => s.ownerId === owner.id);
      
      if (storeIndex !== -1) {
        stores[storeIndex].name = document.getElementById('settings-store-name').value.trim();
        stores[storeIndex].address = document.getElementById('settings-store-address').value.trim();
        stores[storeIndex].logoUrl = document.getElementById('settings-store-logo').value.trim();
        
        app.db.set('stores', stores);
        app.toast.success("Profile parameters updated successfully.");
        
        // Force refresh user session name tag
        app.auth.updateHeaderUI();
        app.dashboard.loadOverview();
      }
    },
    
    savePayments(e) {
      e.preventDefault();
      const owner = app.auth.currentUser;
      const stores = app.db.get('stores');
      const storeIndex = stores.findIndex(s => s.ownerId === owner.id);
      
      if (storeIndex !== -1) {
        stores[storeIndex].paymentUpiId = document.getElementById('settings-upi-id').value.trim();
        stores[storeIndex].merchantName = document.getElementById('settings-merchant-name').value.trim();
        stores[storeIndex].razorpayKeyId = document.getElementById('settings-razorpay-key').value.trim();
        
        app.db.set('stores', stores);
        app.toast.success("UPI payment gateway settings configured.");
      }
    }
  },

  // Customer portal home
  customerHome: {
    loadData() {
      const user = app.auth.currentUser;
      document.getElementById('customer-home-greeting').innerText = `Hello, ${user.name}!`;
      
      // Update shopping metrics
      const activeCart = app.db.get('active_cart_' + user.id) || [];
      const totalItems = activeCart.reduce((sum, item) => sum + item.quantity, 0);
      document.getElementById('cust-home-cart-count').innerText = `${totalItems} Items`;
      
      const orders = app.db.get('orders').filter(o => o.customerId === user.id);
      document.getElementById('cust-home-orders-count').innerText = `${orders.length} Receipts`;
      
      // Populate dropdown inside barcode camera fallback
      const selectEl = document.getElementById('scanner-demo-product-select');
      selectEl.innerHTML = "";
      const products = app.db.get('products').filter(p => p.isActive);
      products.forEach(p => {
        selectEl.innerHTML += `<option value="${p.sku}">${p.name} (₹${p.price})</option>`;
      });
      
      // Render customer recent orders
      const listEl = document.getElementById('customer-recent-orders-list');
      listEl.innerHTML = "";
      if (orders.length > 0) {
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        orders.slice(0, 3).forEach(o => {
          const dt = new Date(o.createdAt).toLocaleDateString([], { dateStyle: 'medium' });
          listEl.innerHTML += `
            <div class="recent-order-item" onclick="app.reports.viewReceiptDetails('${o.id}')" style="cursor:pointer;">
              <div class="order-info">
                <h4>${o.invoiceNumber}</h4>
                <p>Date: ${dt} | Total Paid: ₹${o.total.toFixed(2)}</p>
              </div>
              <i data-lucide="chevron-right" style="color:var(--text-muted);width:16px;"></i>
            </div>
          `;
        });
      } else {
        listEl.innerHTML = `<p class="empty-text">No purchases yet. Start shopping!</p>`;
      }
      lucide.createIcons();
    }
  },

  // Customer Camera QR Code scanner
  scanner: {
    html5QrcodeScanner: null,
    isScanning: false,
    
    startScanner() {
      // 1. Reset feedback UI
      const feedback = document.getElementById('scanner-feedback');
      feedback.innerText = "Initializing web camera...";
      feedback.className = "scanner-status-tag";
      
      this.isScanning = true;
      
      // 2. Setup html5-qrcode camera instance
      setTimeout(() => {
        if (!this.isScanning) return;
        
        try {
          this.html5QrcodeScanner = new Html5Qrcode("qr-camera-stream");
          
          this.html5QrcodeScanner.start(
            { facingMode: "environment" }, // Rear camera
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => {
              // On Decode Success
              this.handleScanResult(decodedText);
            },
            (errorMessage) => {
              // Keep scanning, silent debug ignore
            }
          ).then(() => {
            feedback.innerText = "Camera active. Ready to scan!";
            feedback.className = "scanner-status-tag text-green";
          }).catch(err => {
            console.error("Camera access failed", err);
            feedback.innerText = "Camera not detected. Try manual test tool.";
            feedback.className = "scanner-status-tag text-red";
          });
        } catch (e) {
          console.error(e);
          feedback.innerText = "Scanner setup failed. Use testing tool below.";
        }
      }, 300);
    },
    
    stopScanner() {
      this.isScanning = false;
      if (this.html5QrcodeScanner) {
        try {
          this.html5QrcodeScanner.stop().then(() => {
            this.html5QrcodeScanner = null;
            document.getElementById('qr-camera-stream').innerHTML = "";
          }).catch(err => {
            // Safe fallback
            this.html5QrcodeScanner = null;
            document.getElementById('qr-camera-stream').innerHTML = "";
          });
        } catch (e) {
          this.html5QrcodeScanner = null;
          document.getElementById('qr-camera-stream').innerHTML = "";
        }
      }
    },
    
    handleScanResult(qrText) {
      try {
        const payload = JSON.parse(qrText);
        // Verify version schema
        if (payload.v === 1 && payload.pid && payload.sku) {
          // Play notification beep sound (simulated or HTML5 buzz)
          if (navigator.vibrate) navigator.vibrate(100);
          
          // Stop scanner to prevent multiple triggers
          this.stopScanner();
          
          // Lookup and add product
          this.addProductToCart(payload.sku);
        }
      } catch (e) {
        // Not a store product QR, ignore and keep scanning
        console.warn("Non-schema QR detected: " + qrText);
      }
    },
    
    simulateScan() {
      const select = document.getElementById('scanner-demo-product-select');
      const sku = select.value;
      
      if (!sku) {
        app.toast.error("No active products available to scan.");
        return;
      }
      this.addProductToCart(sku);
    },
    
    addProductToCart(sku) {
      const user = app.auth.currentUser;
      const products = app.db.get('products');
      const product = products.find(p => p.sku === sku && p.isActive);
      
      if (!product) {
        app.toast.error("Scanned product not found or is currently disabled.");
        app.router.navigate('#customer-home');
        return;
      }
      
      if (product.stockQty <= 0) {
        app.toast.error(`Out of stock! ${product.name} is currently unavailable.`);
        app.router.navigate('#customer-home');
        return;
      }
      
      const cartKey = 'active_cart_' + user.id;
      const cart = app.db.get(cartKey) || [];
      
      const existingItem = cart.find(item => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stockQty) {
          app.toast.error(`Cannot add more. Limited stock available (${product.stockQty} units).`);
          app.router.navigate('#customer-cart');
          return;
        }
        existingItem.quantity += 1;
      } else {
        cart.push({
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
          taxPercent: 18.0, // GST
          discountPercent: 10.0 // Applied Promo
        });
      }
      
      app.db.set(cartKey, cart);
      app.toast.success(`Added ${product.name} to cart.`);
      app.cart.updateCartBadge();
      
      // Redirect to cart review
      app.router.navigate('#customer-cart');
    }
  },

  // Shopping Cart calculations
  cart: {
    loadCartItems() {
      const user = app.auth.currentUser;
      const cart = app.db.get('active_cart_' + user.id) || [];
      
      const container = document.getElementById('cart-items-list-container');
      container.innerHTML = "";
      
      if (cart.length > 0) {
        cart.forEach(item => {
          container.innerHTML += `
            <div class="cart-item-card scale-in">
              ${item.imageUrl ? `<img src="${item.imageUrl}" class="cart-item-img" alt="${item.name}">` : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;"><i data-lucide="image" style="width:24px;"></i></div>`}
              <div class="cart-item-details">
                <h3 class="cart-item-title">${item.name}</h3>
                <p class="cart-item-sku">SKU: ${item.sku}</p>
                <div class="cart-item-price">₹${item.price.toFixed(2)}</div>
              </div>
              <div class="cart-item-control-row">
                <button class="qty-btn" onclick="app.cart.adjustQuantity('${item.productId}', -1)">-</button>
                <span class="qty-val">${item.quantity}</span>
                <button class="qty-btn" onclick="app.cart.adjustQuantity('${item.productId}', 1)">+</button>
              </div>
              <button class="cart-item-delete" onclick="app.cart.deleteItem('${item.productId}')">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          `;
        });
      } else {
        container.innerHTML = `
          <div class="dashboard-panel text-center" style="padding: 60px 20px;">
            <i data-lucide="shopping-basket" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px;"></i>
            <h3>Your Cart is Empty</h3>
            <p style="color:var(--text-secondary);margin-bottom:24px;">Scan QR codes around the store to populate items.</p>
            <button class="btn btn-accent" onclick="app.router.navigate('#customer-scanner')">
              <i data-lucide="scan-line"></i> Open Scanner
            </button>
          </div>
        `;
      }
      
      this.recalculateInvoiceTotals(cart);
      lucide.createIcons();
    },
    
    adjustQuantity(prodId, amount) {
      const user = app.auth.currentUser;
      const cartKey = 'active_cart_' + user.id;
      const cart = app.db.get(cartKey) || [];
      const item = cart.find(i => i.productId === prodId);
      
      if (item) {
        // Stock inventory validation limit check
        const products = app.db.get('products');
        const p = products.find(prod => prod.id === prodId);
        
        const newQty = item.quantity + amount;
        
        if (newQty <= 0) {
          this.deleteItem(prodId);
          return;
        }
        
        if (p && newQty > p.stockQty) {
          app.toast.error(`Out of stock. Only ${p.stockQty} items left.`);
          return;
        }
        
        item.quantity = newQty;
        app.db.set(cartKey, cart);
        this.loadCartItems();
        this.updateCartBadge();
      }
    },
    
    deleteItem(prodId) {
      const user = app.auth.currentUser;
      const cartKey = 'active_cart_' + user.id;
      let cart = app.db.get(cartKey) || [];
      const item = cart.find(i => i.productId === prodId);
      
      cart = cart.filter(i => i.productId !== prodId);
      app.db.set(cartKey, cart);
      
      if (item) app.toast.info(`Removed ${item.name} from cart.`);
      this.loadCartItems();
      this.updateCartBadge();
    },
    
    clearActiveCart() {
      const user = app.auth.currentUser;
      app.db.set('active_cart_' + user.id, []);
      app.toast.info("Shopping cart cleared.");
      this.loadCartItems();
      this.updateCartBadge();
    },
    
    recalculateInvoiceTotals(cart) {
      let subtotal = 0;
      let tax = 0;
      let discount = 0;
      let total = 0;
      
      cart.forEach(item => {
        const itemSub = item.price * item.quantity;
        // GST calc (18%)
        const itemTax = itemSub * (item.taxPercent / 100);
        // Promo 10% coupon
        const itemDisc = itemSub * (item.discountPercent / 100);
        
        subtotal += itemSub;
        tax += itemTax;
        discount += itemDisc;
      });
      
      total = (subtotal + tax) - discount;
      
      // Update DOM
      document.getElementById('cart-summary-subtotal').innerText = "₹" + subtotal.toFixed(2);
      document.getElementById('cart-summary-tax').innerText = "₹" + tax.toFixed(2);
      document.getElementById('cart-summary-discount').innerText = "-₹" + discount.toFixed(2);
      document.getElementById('cart-summary-total').innerText = "₹" + total.toFixed(2);
      
      // Cache calculated totals for checkout process
      sessionStorage.setItem('last_cart_totals', JSON.stringify({ subtotal, tax, discount, total }));
      
      // Disable checkout button if cart is empty
      document.getElementById('cart-checkout-btn').disabled = cart.length === 0;
    },
    
    updateCartBadge() {
      const user = app.auth.currentUser;
      if (!user || user.role !== 'customer') return;
      
      const cart = app.db.get('active_cart_' + user.id) || [];
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
      
      const badge = document.getElementById('cart-badge-count');
      const mobBadge = document.getElementById('mobile-cart-badge-count');
      
      if (totalItems > 0) {
        badge.innerText = totalItems;
        badge.style.display = "inline-block";
        mobBadge.innerText = totalItems;
        mobBadge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
        mobBadge.style.display = "none";
      }
    },
    
    proceedToCheckout() {
      app.router.navigate('#checkout');
    }
  },

  // Invoice and UPI secure checkout simulator
  checkout: {
    loadCheckoutInvoice() {
      const user = app.auth.currentUser;
      const cart = app.db.get('active_cart_' + user.id) || [];
      const totals = JSON.parse(sessionStorage.getItem('last_cart_totals'));
      
      if (cart.length === 0 || !totals) {
        app.toast.error("Your cart is empty. Scan items first.");
        app.router.navigate('#customer-home');
        return;
      }
      
      // Lookup store (For demo, fetch first store in array)
      const stores = app.db.get('stores');
      const store = stores[0]; // Global retail setup
      
      document.getElementById('invoice-store-name').innerText = store.name;
      document.getElementById('invoice-store-address').innerText = store.address;
      
      // Auto invoice details
      const invoiceNum = "INV-" + Date.now().toString().slice(-6);
      sessionStorage.setItem('current_checkout_invoice_num', invoiceNum);
      
      document.getElementById('invoice-id-tag').innerText = invoiceNum;
      document.getElementById('invoice-date-tag').innerText = "Date: " + new Date().toLocaleDateString([], { dateStyle: 'long' });
      
      document.getElementById('invoice-customer-name').innerText = user.name;
      document.getElementById('invoice-customer-email').innerText = user.email;
      
      // Build items rows
      const tbody = document.getElementById('invoice-table-body');
      tbody.innerHTML = "";
      cart.forEach(item => {
        tbody.innerHTML += `
          <tr>
            <td>
              <div style="font-weight:500;">${item.name}</div>
              <div style="font-size:0.75rem;color:#64748b;">SKU: ${item.sku}</div>
            </td>
            <td class="text-center">₹${item.price.toFixed(2)}</td>
            <td class="text-center">x ${item.quantity}</td>
            <td class="text-right">₹${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      });
      
      // Totals
      document.getElementById('invoice-val-sub').innerText = "₹" + totals.subtotal.toFixed(2);
      document.getElementById('invoice-val-tax').innerText = "₹" + totals.tax.toFixed(2);
      document.getElementById('invoice-val-disc').innerText = "-₹" + totals.discount.toFixed(2);
      document.getElementById('invoice-val-total').innerText = "₹" + totals.total.toFixed(2);
    },
    
    initiateUPIPayment() {
      app.router.navigate('#upi-payment');
    },
    
    loadUPIPaymentGateway() {
      const user = app.auth.currentUser;
      const totals = JSON.parse(sessionStorage.getItem('last_cart_totals'));
      const invoiceNum = sessionStorage.getItem('current_checkout_invoice_num');
      
      if (!totals || !invoiceNum) {
        app.router.navigate('#customer-cart');
        return;
      }
      
      const store = app.db.get('stores')[0]; // Default store
      
      document.getElementById('upi-payee-name').innerText = store.merchantName;
      document.getElementById('upi-payee-vpa').innerText = store.paymentUpiId;
      document.getElementById('upi-pay-amount').innerText = "₹" + totals.total.toFixed(2);
      document.getElementById('upi-pay-invoice-num').innerText = invoiceNum;
      
      // 1. Construct genuine UPI Deep Link URL
      // Payload format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=INVOICENUMBER&cu=INR
      const upiDeepLink = `upi://pay?pa=${store.paymentUpiId}&pn=${encodeURIComponent(store.merchantName)}&am=${totals.total.toFixed(2)}&tn=${invoiceNum}&cu=INR`;
      
      // 2. Set mobile payment deep link button
      const deeplinkBtn = document.getElementById('upi-app-deeplink-btn');
      deeplinkBtn.setAttribute('href', upiDeepLink);
      
      // 3. Render UPI QR code for desktop browsers using QRCodeJS
      const qrHolder = document.getElementById('upi-dynamic-qr-holder');
      qrHolder.innerHTML = "";
      new QRCode(qrHolder, {
        text: upiDeepLink,
        width: 180,
        height: 180,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.M
      });
    },
    
    simulatePaymentSuccess() {
      const user = app.auth.currentUser;
      const cartKey = 'active_cart_' + user.id;
      const cart = app.db.get(cartKey) || [];
      const totals = JSON.parse(sessionStorage.getItem('last_cart_totals'));
      const invoiceNum = sessionStorage.getItem('current_checkout_invoice_num');
      const store = app.db.get('stores')[0];
      
      if (cart.length === 0 || !totals) return;
      
      app.toast.info("Verifying UPI transaction signature...");
      
      setTimeout(() => {
        // 1. Deduct stock quantities from database
        const products = app.db.get('products');
        cart.forEach(item => {
          const p = products.find(prod => prod.id === item.productId);
          if (p) {
            // Deduct stock (ensure stock doesn't fall below zero)
            p.stockQty = Math.max(0, p.stockQty - item.quantity);
          }
        });
        app.db.set('products', products);
        
        // 2. Create and log order invoice document
        const orders = app.db.get('orders');
        const newOrderId = "ord_" + Date.now();
        const txRef = "UPI" + Date.now().toString().slice(-8) + "S";
        
        const newOrder = {
          id: newOrderId,
          customerId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          storeId: store.id,
          invoiceNumber: invoiceNum,
          items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, quantity: i.quantity })),
          subtotal: totals.subtotal,
          tax: totals.tax,
          discount: totals.discount,
          total: totals.total,
          paymentStatus: "paid",
          txRef: txRef,
          createdAt: new Date().toISOString()
        };
        
        orders.push(newOrder);
        app.db.set('orders', orders);
        
        // 3. Clear cart
        app.db.set(cartKey, []);
        app.cart.updateCartBadge();
        
        // Save last successful order ID for receipt display
        sessionStorage.setItem('last_successful_order_id', newOrderId);
        
        app.toast.success("Payment verified! Receipt generated successfully.");
        app.router.navigate('#view-receipt');
      }, 1200);
    },
    
    simulatePaymentFailure() {
      app.toast.info("Initiating sandbox transaction verification...");
      setTimeout(() => {
        app.toast.error("Payment failed. UPI transaction timed out or rejected by bank.");
      }, 1000);
    }
  },

  // Receipt Page
  receipt: {
    loadReceiptPage() {
      const orderId = sessionStorage.getItem('last_successful_order_id');
      if (!orderId) {
        app.router.navigate('#customer-home');
        return;
      }
      
      const orders = app.db.get('orders');
      const order = orders.find(o => o.id === orderId);
      if (!order) return;
      
      const store = app.db.get('stores')[0]; // Default store
      
      document.getElementById('receipt-store-name').innerText = store.name;
      document.getElementById('receipt-store-address').innerText = store.address;
      document.getElementById('receipt-id-tag').innerText = order.invoiceNumber;
      document.getElementById('receipt-date-tag').innerText = "Date: " + new Date(order.createdAt).toLocaleDateString([], { dateStyle: 'long' });
      
      document.getElementById('receipt-customer-name').innerText = order.customerName;
      document.getElementById('receipt-customer-email').innerText = order.customerEmail;
      document.getElementById('receipt-tx-ref').innerText = order.txRef;
      document.getElementById('receipt-timestamp-tag').innerText = "Paid At: " + new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Items Rows
      const tbody = document.getElementById('receipt-table-body');
      tbody.innerHTML = "";
      order.items.forEach(item => {
        tbody.innerHTML += `
          <tr>
            <td>
              <div style="font-weight:500;">${item.name}</div>
            </td>
            <td class="text-center">₹${item.price.toFixed(2)}</td>
            <td class="text-center">x ${item.quantity}</td>
            <td class="text-right">₹${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
      });
      
      document.getElementById('receipt-val-sub').innerText = "₹" + order.subtotal.toFixed(2);
      document.getElementById('receipt-val-tax').innerText = "₹" + order.tax.toFixed(2);
      document.getElementById('receipt-val-disc').innerText = "-₹" + order.discount.toFixed(2);
      document.getElementById('receipt-val-total').innerText = "₹" + order.total.toFixed(2);
    },
    
    loadCustomerOrdersHistory() {
      const user = app.auth.currentUser;
      const orders = app.db.get('orders').filter(o => o.customerId === user.id);
      
      const tbody = document.getElementById('customer-orders-table-body');
      tbody.innerHTML = "";
      
      if (orders.length > 0) {
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        orders.forEach(o => {
          const dateStr = new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
          const itemsText = o.items.map(i => `${i.name} (${i.quantity})`).join(", ");
          
          tbody.innerHTML += `
            <tr>
              <td><strong class="font-mono">${o.invoiceNumber}</strong></td>
              <td>${dateStr}</td>
              <td class="text-sm" style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${itemsText}</td>
              <td><strong>₹${o.total.toFixed(2)}</strong></td>
              <td><span class="font-mono text-sm">${o.txRef}</span></td>
              <td style="text-align: right;">
                <button class="btn btn-outline btn-sm" onclick="app.reports.viewReceiptDetails('${o.id}')">
                  <i data-lucide="eye"></i> View Receipt
                </button>
              </td>
            </tr>
          `;
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color:var(--text-muted); padding:30px;">No purchase receipts logged in your session.</td></tr>`;
      }
      lucide.createIcons();
    },
    
    printReceipt() {
      window.print();
    }
  },

  // Toast Notification System
  toast: {
    show(message, type = 'info') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon = 'info';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'alert-octagon';
      
      toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <div class="toast-message">${message}</div>
      `;
      
      container.appendChild(toast);
      lucide.createIcons();
      
      // Animate entry
      setTimeout(() => toast.classList.add('show'), 50);
      
      // Auto dismiss after 3.5s
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
      }, 3500);
    },
    
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); }
  }
};

// Initial start setup on Page load
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialise Storage Relational Data
  app.db.init();
  
  // 2. Restore User Login Session
  app.auth.init();
  
  // 3. Initiate routes listener
  app.router.init();
  
  // Fade out Splash Screen Loader
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.classList.add('fade-out');
    document.getElementById('app-wrapper').style.display = 'block';
    
    // Auto redirect if session is active
    if (app.auth.currentUser) {
      if (app.auth.currentUser.role === 'owner') {
        app.router.navigate('#owner-dashboard');
      } else {
        app.router.navigate('#customer-home');
      }
    } else {
      app.router.navigate('#home');
    }
  }, 1000);
});
