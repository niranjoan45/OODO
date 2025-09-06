const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/product_feed.html'));
});

app.get('/add-product', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/add_product.html'));
});

app.get('/my-listings', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/my_listings.html'));
});

app.get('/product/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/product_detail.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/cart.html'));
});

app.get('/purchases', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/purchases.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const initializeApp = async () => {
    try {
        // Initialize database
        const db = require('../database/init');

        // Wait a moment for database initialization
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Get network IP and generate QR code
        const ip = require('ip');
        const QRCode = require('qrcode');
        const networkIP = ip.address();
        const networkURL = `http://${networkIP}:${PORT}`;

        // Generate QR code
        const qrCode = await QRCode.toString(networkURL, { type: 'terminal', small: true });

        // Start server
        app.listen(PORT, () => {
            console.log('\n🌱 EcoFinds - Sustainable Second-Hand Marketplace');
            console.log('=' .repeat(50));
            console.log(`📱 Access URLs:`);
            console.log(`   → Laptop:  http://localhost:${PORT}`);
            console.log(`   → Network: ${networkURL}`);
            console.log('\n📱 Mobile Access - Scan QR Code:');
            console.log(qrCode);
            console.log('=' .repeat(50));
            console.log('📊 Database initialized and ready');
            console.log('🚀 Ready for hackathon demo!');
            console.log('\n💡 Demo Accounts:');
            console.log('   Admin:  admin@ecofinds.com / admin123');
            console.log('   Seller: seller@ecofinds.com / seller123');
            console.log('   User:   user1@ecofinds.com / user123');
            console.log('=' .repeat(50));
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
};

initializeApp();

module.exports = app;
