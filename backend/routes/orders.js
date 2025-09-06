const express = require('express');
const db = require('../../database/init');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Create new order (checkout)
router.post('/checkout', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { fullName, email, phone, deliveryAddress, deliveryNotes } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !deliveryAddress) {
        return res.status(400).json({ error: 'Full name, email, phone, and delivery address are required' });
    }

    // Get cart items
    const cartQuery = `
        SELECT c.*, p.title, p.price, p.seller_id
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND p.status = 'available'
    `;

    db.all(cartQuery, [userId], (err, cartItems) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate total
        const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Generate unique order number
        const orderNumber = 'ECO-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Create order with enhanced details
        const orderStmt = db.prepare(`
            INSERT INTO orders (
                user_id, total_amount, customer_name, customer_email,
                customer_phone, delivery_address, delivery_notes, order_number, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `);

        orderStmt.run([
            userId, totalAmount, fullName, email, phone,
            deliveryAddress, deliveryNotes, orderNumber
        ], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to create order' });
            }

            const orderId = this.lastID;

            // Add order items
            const orderItemStmt = db.prepare(`
                INSERT INTO order_items (order_id, product_id, quantity, price) 
                VALUES (?, ?, ?, ?)
            `);

            let itemsProcessed = 0;
            const totalItems = cartItems.length;

            cartItems.forEach(item => {
                orderItemStmt.run([orderId, item.product_id, item.quantity, item.price], (err) => {
                    if (err) {
                        console.error('Error adding order item:', err);
                    }

                    itemsProcessed++;
                    if (itemsProcessed === totalItems) {
                        orderItemStmt.finalize();

                        // Mark products as sold (for second-hand marketplace, typically one item per product)
                        const productIds = cartItems.map(item => item.product_id);
                        const placeholders = productIds.map(() => '?').join(',');
                        
                        db.run(`UPDATE products SET status = 'sold' WHERE id IN (${placeholders})`, productIds, (err) => {
                            if (err) {
                                console.error('Error updating product status:', err);
                            }
                        });

                        // Clear cart
                        db.run('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
                            if (err) {
                                console.error('Error clearing cart:', err);
                            }
                        });

                        res.status(201).json({
                            message: 'Order placed successfully',
                            orderId: orderId,
                            orderNumber: orderNumber,
                            totalAmount: parseFloat(totalAmount.toFixed(2)),
                            customerName: fullName,
                            deliveryAddress: deliveryAddress,
                            itemCount: totalItems
                        });
                    }
                });
            });
        });

        orderStmt.finalize();
    });
});

// Get user's orders (purchase history)
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    const query = `
        SELECT o.*, 
               GROUP_CONCAT(p.title) as product_titles,
               COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;

    db.all(query, [userId], (err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ orders });
    });
});

// Get specific order details
router.get('/:orderId', authenticateToken, (req, res) => {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Get order details
    const orderQuery = `
        SELECT * FROM orders 
        WHERE id = ? AND user_id = ?
    `;

    db.get(orderQuery, [orderId, userId], (err, order) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Get order items
        const itemsQuery = `
            SELECT oi.*, p.title, p.description, p.image_url,
                   u.username as seller_name, u.full_name as seller_full_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN users u ON p.seller_id = u.id
            WHERE oi.order_id = ?
        `;

        db.all(itemsQuery, [orderId], (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                order: {
                    ...order,
                    items
                }
            });
        });
    });
});

// Get seller's sales (for sellers to see their sold items)
router.get('/sales/history', authenticateToken, (req, res) => {
    const sellerId = req.user.userId;

    // Check if user is seller or admin
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only sellers can view sales history' });
    }

    const query = `
        SELECT o.id as order_id, o.created_at as order_date, o.total_amount,
               oi.quantity, oi.price, p.title, p.description,
               u.username as buyer_name, u.full_name as buyer_full_name
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN users u ON o.user_id = u.id
        WHERE p.seller_id = ?
        ORDER BY o.created_at DESC
    `;

    db.all(query, [sellerId], (err, sales) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Calculate total revenue
        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);

        res.json({ 
            sales,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalSales: sales.length
        });
    });
});

// Get order statistics (for admin/analytics)
router.get('/stats/overview', authenticateToken, (req, res) => {
    // Only admin can access stats
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const queries = {
        totalOrders: 'SELECT COUNT(*) as count FROM orders',
        totalRevenue: 'SELECT SUM(total_amount) as total FROM orders',
        recentOrders: `
            SELECT o.*, u.username, u.full_name 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC 
            LIMIT 10
        `
    };

    const stats = {};
    let queriesCompleted = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        if (key === 'recentOrders') {
            db.all(query, [], (err, rows) => {
                if (!err) stats[key] = rows;
                queriesCompleted++;
                if (queriesCompleted === totalQueries) {
                    res.json(stats);
                }
            });
        } else {
            db.get(query, [], (err, row) => {
                if (!err) stats[key] = row;
                queriesCompleted++;
                if (queriesCompleted === totalQueries) {
                    res.json(stats);
                }
            });
        }
    });
});

module.exports = router;
