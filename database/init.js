const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'ecofinds.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Users table
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            full_name VARCHAR(100),
            phone VARCHAR(20),
            address TEXT,
            profile_picture VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating users table:', err.message);
            else console.log('Users table created successfully');
        });

        // Products table
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            category VARCHAR(50),
            condition VARCHAR(20),
            image_url VARCHAR(500),
            seller_id INTEGER,
            status VARCHAR(20) DEFAULT 'available',
            views INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (seller_id) REFERENCES users (id)
        )`, (err) => {
            if (err) console.error('Error creating products table:', err.message);
            else console.log('Products table created successfully');
        });

        // Cart table
        db.run(`CREATE TABLE IF NOT EXISTS cart (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            product_id INTEGER,
            quantity INTEGER DEFAULT 1,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`, (err) => {
            if (err) console.error('Error creating cart table:', err.message);
            else console.log('Cart table created successfully');
        });

        // Orders table
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            total_amount DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'pending',
            customer_name VARCHAR(100),
            customer_email VARCHAR(100),
            customer_phone VARCHAR(20),
            delivery_address TEXT,
            delivery_notes TEXT,
            order_number VARCHAR(50) UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`, (err) => {
            if (err) console.error('Error creating orders table:', err.message);
            else console.log('Orders table created successfully');
        });

        // Order items table
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            price DECIMAL(10,2),
            FOREIGN KEY (order_id) REFERENCES orders (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`, (err) => {
            if (err) console.error('Error creating order_items table:', err.message);
            else console.log('Order items table created successfully');
        });

        // Insert sample data after all tables are created
        setTimeout(() => {
            insertSampleData();
        }, 500);
    });
}

async function insertSampleData() {
    // First, check if data already exists
    db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
        if (err) {
            console.error('Error checking users:', err);
            return;
        }

        if (row.count > 0) {
            console.log('Sample data already exists');
            return;
        }

        // Sample users with specified credentials - insert first
        const bcrypt = require('bcryptjs');
        const sampleUsers = [
            ['admin', 'admin@ecofinds.com', await bcrypt.hash('admin123', 10), 'admin', 'Admin User', '+1234567890', '123 Admin St'],
            ['seller', 'seller@ecofinds.com', await bcrypt.hash('seller123', 10), 'seller', 'John Smith', '+1234567891', '456 Seller Ave'],
            ['user1', 'user1@ecofinds.com', await bcrypt.hash('user123', 10), 'user', 'Jane Doe', '+1234567892', '789 User Blvd'],
            ['user2', 'user2@ecofinds.com', await bcrypt.hash('user123', 10), 'user', 'Mike Johnson', '+1234567893', '321 User Lane']
        ];

        const userStmt = db.prepare(`INSERT INTO users (username, email, password, role, full_name, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)`);

        let usersInserted = 0;
        sampleUsers.forEach((user, index) => {
            userStmt.run(user, function(err) {
                if (err) {
                    console.error('Error inserting user:', err);
                    return;
                }
                usersInserted++;

                // When all users are inserted, insert products
                if (usersInserted === sampleUsers.length) {
                    userStmt.finalize();
                    insertProducts();
                }
            });
        });
    });

    function insertProducts() {
        // Sample products - insert after users (seller_id = 2 for the seller account)
        const sampleProducts = [
            ['Vintage Leather Jacket', 'Authentic vintage leather jacket in excellent condition', 89.99, 'Clothing', 'Good', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', 2, 'available'],
            ['Retro Gaming Console', 'Classic gaming console with original controllers', 149.99, 'Electronics', 'Very Good', 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400', 2, 'available'],
            ['Antique Wooden Chair', 'Beautiful handcrafted wooden chair from the 1960s', 75.00, 'Furniture', 'Good', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', 2, 'available'],
            ['Designer Handbag', 'Authentic designer handbag, gently used', 199.99, 'Accessories', 'Excellent', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', 2, 'available'],
            ['Bicycle Mountain Bike', 'Well-maintained mountain bike, perfect for trails', 299.99, 'Sports', 'Good', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 2, 'available'],
            ['Vintage Camera', 'Classic film camera in working condition', 120.00, 'Electronics', 'Good', 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400', 2, 'available']
        ];

        const productStmt = db.prepare(`INSERT INTO products (title, description, price, category, condition, image_url, seller_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        let productsInserted = 0;
        sampleProducts.forEach((product, index) => {
            productStmt.run(product, function(err) {
                if (err) {
                    console.error('Error inserting product:', err);
                    return;
                }
                productsInserted++;

                if (productsInserted === sampleProducts.length) {
                    productStmt.finalize();
                    console.log('Sample data inserted successfully');
                }
            });
        });
    }
}

module.exports = db;
