# 🌱 EcoFinds - Sustainable Second-Hand Marketplace

A complete, fully functional, hackathon-ready web application that promotes sustainability through second-hand item trading. Built with modern web technologies and designed for both desktop and mobile experiences.

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **Git** (optional, for cloning)

### Installation & Setup

1. **Clone or Download the Project**
   ```bash
   git clone <repository-url>
   cd ecofinds
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Application**
   ```bash
   npm start
   ```

4. **Access the Application**
   - **Desktop/Laptop**: Open `http://localhost:3000` in your browser
   - **Mobile**: Scan the QR code displayed in the terminal
   - **Network Access**: Use the network URL shown in the terminal

## 📱 Mobile Access

When you start the server, you'll see output like this:

```
🌱 EcoFinds - Sustainable Second-Hand Marketplace
==================================================
📱 Access URLs:
   → Laptop:  http://localhost:3000
   → Network: http://192.168.1.100:3000

📱 Mobile Access - Scan QR Code:
[QR CODE DISPLAYED HERE]
==================================================
```

**To access on mobile:**
1. Ensure your mobile device is connected to the same Wi-Fi network
2. Scan the QR code with your phone's camera
3. Or manually enter the network URL in your mobile browser

## 🔐 Demo Accounts

The application comes with pre-configured demo accounts for testing different user roles:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@ecofinds.com` | `admin123` | Full platform management access |
| **Seller** | `seller@ecofinds.com` | `seller123` | Can list and manage products |
| **User** | `user1@ecofinds.com` | `user123` | Can browse and purchase items |
| **User** | `user2@ecofinds.com` | `user123` | Additional user account |

## 🎯 Testing Different Dashboards

### Admin Dashboard
1. Login with `admin@ecofinds.com` / `admin123`
2. Access admin-specific features:
   - View platform statistics
   - Manage all users
   - Monitor all products and orders
   - Platform analytics

### Seller Dashboard
1. Login with `seller@ecofinds.com` / `seller123`
2. Access seller-specific features:
   - **Add new products** with image upload capability
   - Manage listings with uploaded product images
   - View sales performance
   - Track earnings and views

### User Dashboard
1. Login with `user1@ecofinds.com` / `user123`
2. Access user-specific features:
   - Browse products
   - Add items to cart
   - **Enhanced checkout** with customer details confirmation
   - View order history with detailed order information
   - **Manage profile** - Update personal info, change password, upload profile picture

## 🏗️ Project Structure

```
ecofinds/
├── frontend/                 # Client-side application
│   ├── css/
│   │   └── style.css        # Complete responsive styling
│   ├── js/
│   │   └── main.js          # All JavaScript functionality
│   ├── index.html           # Abstract login page
│   ├── user-dashboard.html  # User dashboard
│   ├── seller-dashboard.html# Seller dashboard
│   ├── admin-dashboard.html # Admin dashboard
│   ├── product_feed.html    # Product browsing
│   ├── add_product.html     # Product creation
│   ├── cart.html           # Shopping cart
│   ├── purchases.html      # Order history
│   └── ...                 # Other pages
├── backend/                 # Server-side application
│   ├── routes/             # API endpoints
│   │   ├── auth.js         # Authentication
│   │   ├── products.js     # Product management
│   │   ├── cart.js         # Shopping cart
│   │   └── orders.js       # Order processing
│   └── server.js           # Express server
├── database/               # Database layer
│   ├── init.js            # Database initialization
│   └── ecofinds.db        # SQLite database (auto-created)
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## ✨ Key Features

### 🔐 Abstract Role-Based Authentication
- **Email + Password only** - No role selection required
- **Automatic role detection** from database
- **Smart dashboard redirection** based on user role
- **Secure JWT-based sessions**

### 📱 Mobile-First Design
- **Fully responsive** on all devices
- **Touch-optimized** interactions
- **QR code access** for instant mobile testing
- **Network sharing** for multi-device demos

### 🛒 Complete E-commerce Flow
- **Product browsing** with search and filters
- **Shopping cart** with quantity management
- **Enhanced checkout** with customer details confirmation
- **Order tracking** and history with order numbers

### 👥 Multi-Role Support
- **Users**: Browse, purchase, track orders, manage profile
- **Sellers**: List products, upload images, manage inventory, view sales
- **Admins**: Platform oversight, user management, analytics

### 🌱 Sustainability Focus
- **Environmental impact** tracking
- **Second-hand marketplace** concept
- **Item rescue** statistics
- **Eco-friendly** messaging throughout

### 🆕 Enhanced Features
- **User Profile Management** - Update personal info, change password, upload profile picture
- **Image Upload System** - Sellers can upload product images directly
- **Enhanced Checkout Flow** - Complete customer details confirmation
- **Order Management** - Detailed order tracking with unique order numbers
- **Mobile Optimization** - Perfect mobile experience with touch interactions

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Styling**: Custom CSS with CSS Grid & Flexbox
- **Mobile**: Responsive design, touch optimization
- **QR Codes**: qrcode library for mobile access

## 🎨 Design Highlights

- **Modern UI/UX** with smooth animations
- **Consistent color scheme** with CSS custom properties
- **Accessible design** with proper ARIA labels
- **Loading states** and user feedback
- **Toast notifications** for user actions
- **Modal dialogs** for enhanced UX

## 🔧 Development

### Available Scripts
- `npm start` - Start the production server
- `npm run dev` - Start development server (if configured)

### Database
- **Auto-initialization** on first run
- **Sample data** included for immediate testing
- **SQLite** for portability and ease of setup

## 🚀 Deployment Ready

The application is designed to be:
- **Portable** - Works on any system with Node.js
- **Self-contained** - No external dependencies
- **Demo-ready** - Pre-loaded with sample data
- **Hackathon-optimized** - Quick setup and impressive features

## 📞 Support

For any issues or questions:
1. Check that Node.js is properly installed
2. Ensure port 3000 is available
3. Verify network connectivity for mobile access
4. Check the terminal output for detailed error messages

---

## 📋 Detailed Feature Guide

### 🖼️ **Seller Image Upload**
1. **Login as Seller**: Use `seller@ecofinds.com` / `seller123`
2. **Navigate to Add Product**: Click "Add Product" from seller dashboard
3. **Upload Images**:
   - Click "Choose File" or drag & drop images
   - Supports: JPEG, JPG, PNG, GIF, WebP (up to 10MB)
   - Images are automatically resized and optimized
4. **Product Display**: Uploaded images appear in product listings and detail pages

### 🛒 **Enhanced Checkout Process**
1. **Add Items to Cart**: Browse products and add desired items
2. **Proceed to Checkout**: Click "Checkout" from cart page
3. **Confirm Details**:
   - Full name, email, and phone number (required)
   - Delivery address with detailed instructions
   - Optional delivery notes
4. **Place Order**: Review order summary and confirm
5. **Order Confirmation**: Receive unique order number and details
6. **Track Order**: View in "Previous Purchases" with complete order history

### ⚙️ **User Profile Management**
1. **Access Settings**: Click user menu → "Settings" or visit `/settings.html`
2. **Update Profile**:
   - Edit full name, username, email
   - Add/update phone number and address
   - Upload profile picture (JPEG, PNG, GIF up to 5MB)
3. **Change Password**:
   - Enter current password
   - Set new password (minimum 6 characters)
   - Confirm new password
4. **Profile Picture**:
   - Upload new image or remove existing one
   - Automatically displayed across the platform

### 📱 **Mobile Experience**
1. **QR Code Access**: Scan QR code from terminal for instant mobile access
2. **Touch Optimized**: All buttons and interactions are touch-friendly (44px minimum)
3. **Responsive Design**: Perfect layout on all screen sizes
4. **Mobile Checkout**: Streamlined checkout process optimized for mobile
5. **Image Upload**: Mobile-friendly file selection and upload

### 🔍 **Order Tracking**
1. **Order Numbers**: Each order gets unique ID (format: ECO-TIMESTAMP-XXXXX)
2. **Order Details**: View complete order information including:
   - Customer details and delivery address
   - Item list with quantities and prices
   - Order status and timestamps
3. **Purchase History**: Access complete order history from user dashboard

**Built for hackathons, designed for impact! 🌱**
