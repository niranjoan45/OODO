const express = require('express');
const db = require('../../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Get user's cart
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT c.*, p.title, p.description, p.price, p.image_url, p.status,
               u.username as seller_name, u.full_name as seller_full_name
        FROM cart c
        JOIN products p ON c.product_id = p.id
        JOIN users u ON p.seller_id = u.id
        WHERE c.user_id = ? AND p.status = 'available'
        ORDER BY c.added_at DESC
    `;
    
    db.all(query, [userId], (err, cartItems) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Calculate total
        const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        res.json({ 
            cartItems,
            total: parseFloat(total.toFixed(2)),
            itemCount: cartItems.length
        });
    });
});

// Add item to cart
router.post('/add', authenticateToken, (req, res) => {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if product exists and is available
    db.get('SELECT id, seller_id, status FROM products WHERE id = ?', [productId], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.status !== 'available') {
            return res.status(400).json({ error: 'Product is not available' });
        }

        // Check if user is trying to add their own product
        if (product.seller_id === userId) {
            return res.status(400).json({ error: 'You cannot add your own product to cart' });
        }

        // Check if item already exists in cart
        db.get('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId], (err, existingItem) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (existingItem) {
                // Update quantity
                const newQuantity = existingItem.quantity + parseInt(quantity);
                db.run('UPDATE cart SET quantity = ? WHERE id = ?', [newQuantity, existingItem.id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update cart' });
                    }
                    res.json({ message: 'Cart updated successfully' });
                });
            } else {
                // Add new item
                const stmt = db.prepare('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)');
                stmt.run([userId, productId, parseInt(quantity)], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to add to cart' });
                    }
                    res.status(201).json({ message: 'Item added to cart successfully' });
                });
                stmt.finalize();
            }
        });
    });
});

// Update cart item quantity
router.put('/update/:itemId', authenticateToken, (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // Check if cart item belongs to user
    db.get('SELECT id FROM cart WHERE id = ? AND user_id = ?', [itemId, userId], (err, cartItem) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        db.run('UPDATE cart SET quantity = ? WHERE id = ?', [parseInt(quantity), itemId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update cart item' });
            }
            res.json({ message: 'Cart item updated successfully' });
        });
    });
});

// Remove item from cart
router.delete('/remove/:itemId', authenticateToken, (req, res) => {
    const { itemId } = req.params;
    const userId = req.user.userId;

    // Check if cart item belongs to user
    db.get('SELECT id FROM cart WHERE id = ? AND user_id = ?', [itemId, userId], (err, cartItem) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!cartItem) {
            return res.status(404).json({ error: 'Cart item not found' });
        }

        db.run('DELETE FROM cart WHERE id = ?', [itemId], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to remove cart item' });
            }
            res.json({ message: 'Item removed from cart successfully' });
        });
    });
});

// Clear entire cart
router.delete('/clear', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to clear cart' });
        }
        res.json({ message: 'Cart cleared successfully' });
    });
});

// Get cart item count
router.get('/count', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    db.get('SELECT COUNT(*) as count FROM cart WHERE user_id = ?', [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ count: result.count });
    });
});

module.exports = router;
