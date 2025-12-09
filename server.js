const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// ============ ENVIRONMENT SETUP ============
const isProduction = process.env.NODE_ENV === 'production';
const isLocalTest = process.env.NODE_ENV === 'test' || process.env.LOCAL_TEST === 'true';

console.log('🚀 Starting server...');
console.log('📊 Mode:', isProduction ? 'Production' : (isLocalTest ? 'Local Test' : 'Development'));
console.log('🔗 Node Environment:', process.env.NODE_ENV || 'development');

// Load appropriate .env file
if (isLocalTest) {
  require('dotenv').config({ path: '.env.test' });
  console.log('📁 Loaded .env.test');
} else if (!isProduction) {
  require('dotenv').config({ path: '.env.local' });
  console.log('📁 Loaded .env.local');
} else {
  require('dotenv').config();
  console.log('📁 Loaded .env (production)');
}

// Import models
require('./models/MenuItem');
require('./models/Cart');
require('./models/Order');

const app = express();

// ============ CORS CONFIGURATION ============
const getCorsOrigins = () => {
  if (isLocalTest) {
    return ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
  }
  if (isProduction) {
    return ['https://smokey.infinityfreeapp.com'];
  }
  return ['http://localhost:5173', 'http://localhost:3000'];
};

const allowedOrigins = getCorsOrigins();
console.log('🌍 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('⚠️ CORS blocked origin:', origin);
      const msg = 'CORS policy blocks this origin';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// ============================================

// Import routes
const menuRoutes = require('./routes/menuRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Use routes
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Health check (enhanced for testing)
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
      mode: isLocalTest ? 'local-test' : (isProduction ? 'production' : 'development'),
      database: mongoose.connection.name,
      connection: mongoose.connection.host,
      menuItems: menuCount,
      orders: orderCount,
      carts: cartCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      mode: isLocalTest ? 'local-test' : (isProduction ? 'production' : 'development')
    });
  }
});

// Test endpoint for local testing
if (!isProduction) {
  app.get('/api/test/reset-carts', async (req, res) => {
    try {
      const Cart = mongoose.model('Cart');
      const result = await Cart.deleteMany({});
      res.json({
        success: true,
        message: 'Test carts cleared',
        deletedCount: result.deletedCount,
        database: mongoose.connection.name
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Smokey Restaurant API',
    version: '1.0.0',
    mode: isLocalTest ? 'local-test' : (process.env.NODE_ENV || 'development'),
    database: mongoose.connection.name || 'Not connected',
    endpoints: {
      menu: 'GET /api/menu',
      cart: 'GET /api/cart/:sessionId',
      order: 'POST /api/orders',
      health: 'GET /api/health',
      ...(!isProduction && { testReset: 'GET /api/test/reset-carts' })
    }
  });
});

// Database connection
const connectDB = async () => {
  try {
    // Determine connection string based on environment
    let mongoURI;
    
    if (isLocalTest) {
      // Local test database
      mongoURI = 'mongodb://localhost:27017/test';
      console.log('🔧 Connecting to LOCAL TEST database: test');
    } else if (process.env.MONGODB_URI) {
      // Use environment variable (production or development)
      mongoURI = process.env.MONGODB_URI;
      console.log('🔧 Connecting via MONGODB_URI environment variable');
    } else {
      // Default local development
      mongoURI = 'mongodb://localhost:27017/smokey_restaurant';
      console.log('🔧 Connecting to LOCAL DEVELOPMENT database: smokey_restaurant');
    }
    
    console.log('📡 MongoDB URI:', mongoURI.replace(/\/\/(.*):(.*)@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🌍 Host: ${conn.connection.host}`);
    console.log(`🔌 Port: ${conn.connection.port}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Only try fallback in development/test, not production
    if (!isProduction) {
      console.log('🔄 Trying default localhost fallback...');
      try {
        const conn = await mongoose.connect('mongodb://localhost:27017/smokey_restaurant_local');
        console.log('✅ Connected to fallback local MongoDB');
        console.log(`📊 Database: ${conn.connection.name}`);
      } catch (localError) {
        console.error('❌ All connection attempts failed:', localError.message);
        console.log('\n💡 TROUBLESHOOTING:');
        console.log('   1. Make sure MongoDB is running: mongod');
        console.log('   2. Or install MongoDB: https://www.mongodb.com/docs/manual/installation/');
        console.log('   3. Or use Docker: docker run -d -p 27017:27017 --name mongodb mongo');
        process.exit(1);
      }
    } else {
      // In production, just exit
      console.error('❌ Production database connection failed');
      process.exit(1);
    }
  }
};

const PORT = process.env.PORT || (isLocalTest ? 4000 : 3000);

// Start server after connecting to DB
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📡 Mode: ${isLocalTest ? 'Local Test' : (isProduction ? 'Production' : 'Development')}`);
    console.log(`🔗 Base URL: http://localhost:${PORT}`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`\n📚 Available Endpoints:`);
    console.log(`   GET  /              - API info`);
    console.log(`   GET  /api/health    - Health check`);
    console.log(`   GET  /api/menu      - Get menu items`);
    console.log(`   GET  /api/cart/:id  - Get cart`);
    console.log(`   POST /api/orders    - Place order`);
    if (!isProduction) {
      console.log(`   GET  /api/test/reset-carts - Clear test carts`);
    }
    console.log(`\n💡 Quick Test:`);
    console.log(`   curl http://localhost:${PORT}/api/health`);
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
});

startServer();