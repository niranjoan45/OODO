const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Configure multer for product image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/products';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Get all products with optional filtering
router.get('/', (req, res) => {
    const { category, search, condition, minPrice, maxPrice, limit = 20, offset = 0 } = req.query;
    
    let query = `
        SELECT p.*, u.username as seller_name, u.full_name as seller_full_name 
        FROM products p 
        JOIN users u ON p.seller_id = u.id 
        WHERE p.status = 'available'
    `;
    const params = [];

    // Add filters
    if (category && category !== 'all') {
        query += ' AND p.category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    if (condition) {
        query += ' AND p.condition = ?';
        params.push(condition);
    }

    if (minPrice) {
        query += ' AND p.price >= ?';
        params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
        query += ' AND p.price <= ?';
        params.push(parseFloat(maxPrice));
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ products });
    });
});

// Get single product by ID
router.get('/:id', (req, res) => {
    const productId = req.params.id;
    
    // Update view count
    db.run('UPDATE products SET views = views + 1 WHERE id = ?', [productId]);
    
    // Get product details
    const query = `
        SELECT p.*, u.username as seller_name, u.full_name as seller_full_name, u.phone as seller_phone 
        FROM products p 
        JOIN users u ON p.seller_id = u.id 
        WHERE p.id = ?
    `;
    
    db.get(query, [productId], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ product });
    });
});

// Create new product (sellers only)
router.post('/', authenticateToken, upload.single('productImage'), (req, res) => {
    const { title, description, price, category, condition, imageUrl } = req.body;
    const sellerId = req.user.userId;

    // Validate required fields
    if (!title || !price || !category) {
        return res.status(400).json({ error: 'Title, price, and category are required' });
    }

    // Check if user is seller or admin
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only sellers can add products' });
    }

    // Use uploaded image path or provided URL
    let finalImageUrl = imageUrl;
    if (req.file) {
        finalImageUrl = req.file.path.replace(/\\/g, '/'); // Normalize path separators
    }

    const stmt = db.prepare(`
        INSERT INTO products (title, description, price, category, condition, image_url, seller_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([title, description, parseFloat(price), category, condition || 'Good', finalImageUrl, sellerId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create product' });
        }

        res.status(201).json({
            message: 'Product created successfully',
            productId: this.lastID
        });
    });

    stmt.finalize();
});

// Update product (seller/admin only)
router.put('/:id', authenticateToken, (req, res) => {
    const productId = req.params.id;
    const { title, description, price, category, condition, imageUrl, status } = req.body;

    // First check if product exists and user owns it
    db.get('SELECT seller_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user owns the product or is admin
        if (product.seller_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only edit your own products' });
        }

        const stmt = db.prepare(`
            UPDATE products 
            SET title = ?, description = ?, price = ?, category = ?, condition = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run([
            title, description, parseFloat(price), category, condition, imageUrl, status || 'available', productId
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update product' });
            }

            res.json({ message: 'Product updated successfully' });
        });

        stmt.finalize();
    });
});

// Delete product (seller/admin only)
router.delete('/:id', authenticateToken, (req, res) => {
    const productId = req.params.id;

    // First check if product exists and user owns it
    db.get('SELECT seller_id FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check if user owns the product or is admin
        if (product.seller_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'You can only delete your own products' });
        }

        db.run('DELETE FROM products WHERE id = ?', [productId], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete product' });
            }

            res.json({ message: 'Product deleted successfully' });
        });
    });
});

// Get products by seller
router.get('/seller/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;
    
    const query = `
        SELECT p.*, u.username as seller_name, u.full_name as seller_full_name 
        FROM products p 
        JOIN users u ON p.seller_id = u.id 
        WHERE p.seller_id = ? 
        ORDER BY p.created_at DESC
    `;
    
    db.all(query, [sellerId], (err, products) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ products });
    });
});

// Get categories
router.get('/meta/categories', (req, res) => {
    const categories = [
        'Electronics',
        'Clothing',
        'Furniture',
        'Books',
        'Sports',
        'Accessories',
        'Home & Garden',
        'Toys',
        'Art & Collectibles',
        'Other'
    ];
    
    res.json({ categories });
});

module.exports = router;
