const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../database/init');

const router = express.Router();
const JWT_SECRET = 'ecofinds_hackathon_secret_key_2024';

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, fullName, phone, address } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (row) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const stmt = db.prepare(`
                INSERT INTO users (username, email, password, role, full_name, phone, address) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run([username, email, hashedPassword, role || 'user', fullName, phone, address], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { userId: this.lastID, username, role: role || 'user' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.status(201).json({
                    message: 'User created successfully',
                    token,
                    user: {
                        id: this.lastID,
                        username,
                        email,
                        role: role || 'user',
                        fullName
                    }
                });
            });

            stmt.finalize();
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    fullName: user.full_name
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, username, email, role, full_name, phone, address FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: user.full_name,
                phone: user.phone,
                address: user.address
            }
        });
    });
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
