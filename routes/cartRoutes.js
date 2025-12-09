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
            cart = new Cart({
                sessionId: req.params.sessionId,
                items: []
            });
            await cart.save();
        }
        
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
    
    try {
        const { menuItemId, quantity = 1 } = req.body;
        
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        
        let cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            cart = new Cart({ sessionId: req.params.sessionId, items: [] });
        }
        
        const existingItemIndex = cart.items.findIndex(
            item => item.menuItemId.toString() === menuItemId
        );
        
        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({
                menuItemId: menuItemId,
                name: menuItem.name,
                price: menuItem.price,
                quantity: quantity
            });
        }
        
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        await cart.save();
        await cart.populate('items.menuItemId', 'name description price');
        
        res.status(200).json(cart);
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update cart item quantity - USING item._id
router.put('/:sessionId/items/:itemId', async (req, res) => {
    console.log('PUT /api/cart/:sessionId/items/:itemId called');
    
    try {
        const { quantity } = req.body;
        
        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1' });
        }
        
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        // USE item._id (cart item ID)
        const itemIndex = cart.items.findIndex(
            item => item._id.toString() === req.params.itemId
        );
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        cart.items[itemIndex].quantity = quantity;
        
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

// Remove item from cart - USING item._id
router.delete('/:sessionId/items/:itemId', async (req, res) => {
    console.log('DELETE /api/cart/:sessionId/items/:itemId called');
    
    try {
        const cart = await Cart.findOne({ sessionId: req.params.sessionId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }
        
        const initialLength = cart.items.length;
        // USE item._id (cart item ID)
        cart.items = cart.items.filter(
            item => item._id.toString() !== req.params.itemId
        );
        
        if (cart.items.length === initialLength) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        
        cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cart.tax = cart.subtotal * 0.02;
        cart.total = cart.subtotal + cart.tax;
        cart.lastUpdated = new Date();
        
        await cart.save();
        await cart.populate('items.menuItemId', 'name description price');
        
        res.json(cart);
    } catch (error) {
        console.error('Error removing item from cart:', error);
        res.status(500).json({ error: error.message });
    }
});

// Clear cart (for debugging)
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

module.exports = router;