const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');

// Get or create cart
router.get('/:sessionId', async (req, res) => {
    console.log('GET /api/cart/:sessionId called with:', req.params.sessionId);
    
    try {
        let cart = await Cart.findOne({ sessionId: req.params.sessionId })
            .populate('items.menuItemId', 'name description price');
        
        if (!cart) {
            // Create new cart
            cart = new Cart({
                sessionId: req.params.sessionId,
                items: []
            });
            await cart.save();
        }
        
        // Calculate totals
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add item to cart
router.post('/:sessionId/items', async (req, res) => {
    console.log('POST /api/cart/:sessionId/items called');
    console.log('Request body:', req.body);
    
    try {
        const { menuItemId, quantity = 1 } = req.body;
        
        // Validate menu item exists
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        // Find or create cart
        let cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            cart = new Cart({ sessionId: req.params.sessionId, items: [] });
        }
        
        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.menuItemId.toString() === menuItemId
        );
        
        if (existingItemIndex !== -1) {
            // Update quantity of existing item
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                menuItemId: menuItemId,
                name: menuItem.name,
                price: menuItem.price,
                quantity: quantity
            });
        }
        
        // Calculate totals
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        await cart.save();
        
        // Populate for response
        await cart.populate('items.menuItemId', 'name description price');
        
        res.status(200).json(cart);
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update cart item quantity
router.put('/:sessionId/items/:itemId', async (req, res) => {
    console.log('PUT /api/cart/:sessionId/items/:itemId called');
    console.log('Updating itemId:', req.params.itemId);
    
    try {
        const { quantity } = req.body;
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }
        
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        console.log('Current cart items:', cart.items);
        
        // FIXED: Use menuItemId instead of _id
        const itemIndex = cart.items.findIndex(
            item => item.menuItemId.toString() === req.params.itemId
        );
        
        console.log('Found item at index:', itemIndex);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }
        
        // Update quantity
        cart.items[itemIndex].quantity = quantity;
        
        // Calculate totals
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        await cart.save();
        await cart.populate('items.menuItemId', 'name description price');
        
        res.json(cart);
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove item from cart
router.delete('/:sessionId/items/:itemId', async (req, res) => {
    console.log('DELETE /api/cart/:sessionId/items/:itemId called');
    console.log('Trying to remove itemId:', req.params.itemId);
    
    try {
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        console.log('Current cart items:', cart.items);
        
        // FIXED: Use menuItemId instead of _id
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(
            item => item.menuItemId.toString() !== req.params.itemId
        );
        
        console.log('After filter, items length:', cart.items.length);
        
        if (cart.items.length === initialLength) {
            return res.status(404).json({ 
                error: 'Item not found in cart',
                details: `Item with menuItemId ${req.params.itemId} not found`
            });
        }
        
        // Calculate totals
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        await cart.save();
        await cart.populate('items.menuItemId', 'name description price');
        
        console.log('Item removed successfully');
        res.json(cart);
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear cart
router.delete('/:sessionId', async (req, res) => {
    console.log('DELETE /api/cart/:sessionId called');
    
    try {
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        cart.items = [];
        cart.subtotal = 0;
        cart.tax = 0;
        cart.total = 0;
        cart.lastUpdated = new Date();
        
        await cart.save();
        
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to see cart structure (optional - remove in production)
router.get('/:sessionId/debug', async (req, res) => {
    try {
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        res.json({
            cartId: cart._id,
            sessionId: cart.sessionId,
            items: cart.items.map(item => ({
                itemId: item._id,
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            itemCount: cart.items.length,
            subtotal: cart.subtotal,
            total: cart.total,
            lastUpdated: cart.lastUpdated
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;