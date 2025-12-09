const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import models
require('./models/MenuItem');
require('./models/Cart');
require('./models/Order');
require('dotenv').config();

console.log('🚀 Starting server with NODE_ENV:', process.env.NODE_ENV);
console.log('🌍 Allowed origins:', 
  process.env.NODE_ENV === 'production' 
    ? ['https://smokey.infinityfreeapp.com'] 
    : ['http://localhost:5173', 'http://localhost:3000']
);

const app = express();

// ============ MIDDLEWARE ============
// Remove localhost from CORS in production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://smokey.infinityfreeapp.com']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy blocks this origin';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ====================================

// Import routes
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Use routes
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const MenuItem = mongoose.model('MenuItem');
    const Order = mongoose.model('Order');
    const Cart = mongoose.model('Cart');
    
    const menuCount = await MenuItem.countDocuments();
    const orderCount = await Order.countDocuments();
    const cartCount = await Cart.countDocuments();
    
    res.json({
      status: 'healthy',
      mode: 'mongodb-atlas',  // Changed from 'mongodb'
      database: mongoose.connection.name,
      menuItems: menuCount,
      orders: orderCount,
      carts: cartCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smokey Restaurant API',
    version: '1.0.0',
    mode: process.env.NODE_ENV || 'production',
    database: 'MongoDB Atlas',
    endpoints: {
      menu: 'GET /api/menu',
      cart: 'GET /api/cart/:sessionId',
      order: 'POST /api/orders',
      health: 'GET /api/health'
    }
  });
});

// Database connection
const connectDB = async () => {
  try {
    // Use environment variable for connection string
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smokey_restaurant';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
      socketTimeoutMS: 45000, // Close sockets after 45s
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌍 Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // If Atlas fails, try local fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Trying local MongoDB fallback...');
      try {
        await mongoose.connect('mongodb://localhost:27017/smokey_restaurant');
        console.log('✅ Connected to local MongoDB');
      } catch (localError) {
        console.error('❌ Local MongoDB also failed:', localError.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

const PORT = process.env.PORT || 5000;

// Start server after connecting to DB
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
    console.log(`📡 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}`);
    console.log(`\n📚 Endpoints:`);
    console.log(`   GET  /api/menu - Get all menu items`);
    console.log(`   GET  /api/cart/:sessionId - Get or create cart`);
    console.log(`   POST /api/orders - Place an order`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`\n💡 Test the API:`);
    console.log(`   curl http://localhost:${PORT}/api/health`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
});

startServer();