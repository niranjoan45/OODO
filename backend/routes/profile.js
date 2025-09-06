const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../../database/init');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/profiles';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Get user profile
router.get('/', verifyToken, (req, res) => {
    const sql = `SELECT id, username, email, full_name, phone, address, profile_picture, role, created_at FROM users WHERE id = ?`;
    
    db.get(sql, [req.user.userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ user });
    });
});

// Update user profile
router.put('/', verifyToken, (req, res) => {
    const { fullName, username, email, phone, address } = req.body;
    
    // Validate required fields
    if (!fullName || !username || !email) {
        return res.status(400).json({ message: 'Full name, username, and email are required' });
    }
    
    const sql = `UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    
    db.run(sql, [fullName, username, email, phone, address, req.user.userId], function(err) {
        if (err) {
            console.error('Database error:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }
            return res.status(500).json({ message: 'Database error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.json({ message: 'Profile updated successfully' });
    });
});

// Upload profile picture
router.post('/picture', verifyToken, upload.single('profilePicture'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const profilePicturePath = req.file.path.replace(/\\/g, '/'); // Normalize path separators
    
    // Get current profile picture to delete old one
    const getCurrentPictureSql = `SELECT profile_picture FROM users WHERE id = ?`;
    
    db.get(getCurrentPictureSql, [req.user.userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        // Update profile picture in database
        const updateSql = `UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(updateSql, [profilePicturePath, req.user.userId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            // Delete old profile picture if it exists
            if (user && user.profile_picture && fs.existsSync(user.profile_picture)) {
                fs.unlink(user.profile_picture, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting old profile picture:', unlinkErr);
                });
            }
            
            res.json({ 
                message: 'Profile picture uploaded successfully',
                profilePicture: profilePicturePath
            });
        });
    });
});

// Remove profile picture
router.delete('/picture', verifyToken, (req, res) => {
    // Get current profile picture
    const getCurrentPictureSql = `SELECT profile_picture FROM users WHERE id = ?`;
    
    db.get(getCurrentPictureSql, [req.user.userId], (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        // Update database to remove profile picture
        const updateSql = `UPDATE users SET profile_picture = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(updateSql, [req.user.userId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            // Delete profile picture file if it exists
            if (user && user.profile_picture && fs.existsSync(user.profile_picture)) {
                fs.unlink(user.profile_picture, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting profile picture:', unlinkErr);
                });
            }
            
            res.json({ message: 'Profile picture removed successfully' });
        });
    });
});

// Change password
router.put('/password', verifyToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    // Get current password hash
    const getUserSql = `SELECT password FROM users WHERE id = ?`;
    
    db.get(getUserSql, [req.user.userId], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        const updateSql = `UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        db.run(updateSql, [hashedNewPassword, req.user.userId], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            res.json({ message: 'Password updated successfully' });
        });
    });
});

module.exports = router;
