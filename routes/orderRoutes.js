const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { v4: uuidv4 } = require('uuid');

// Create new order
router.post('/', async (req, res) => {
    try {
        const { items, customerInfo } = req.body;
        
        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'No items in order' });
        }
        
        // Calculate totals
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            // Verify menu item exists and get current price
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(404).json({ error: `Menu item ${item.menuItemId} not found` });
            }
            
            orderItems.push({
                menuItemId: item.menuItemId,
                name: menuItem.name,
                price: menuItem.price,
                quantity: item.quantity
            });
            
            subtotal += menuItem.price * item.quantity;
        }
        
        const tax = subtotal * 0.02;
        const total = subtotal + tax;
        
        // Generate order number
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        const order = new Order({
            orderNumber,
            items: orderItems,
            subtotal,
            tax,
            total,
            customerInfo,
            status: 'pending'
        });
        
        await order.save();
        
        res.status(201).json({
            success: true,
            order,
            message: 'Order placed successfully'
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// Get all orders (admin only)
router.get('/', async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let query = {};
        
        if (status) {
            query.status = status;
        }
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }
        
        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .populate('items.menuItemId', 'name description');
            
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
router.get('/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('items.menuItemId', 'name description category');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Update order status (admin only)
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router;