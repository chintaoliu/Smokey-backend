const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');

// Get all menu items
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;
        let query = { active: true };
        
        if (category) {
            query.category = category;
        }
        
        const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
        
        // Group by category for frontend
        const groupedMenu = {
            smokedMeats: menuItems.filter(item => item.category === 'smokedMeats'),
            sides: menuItems.filter(item => item.category === 'sides'),
            sandwiches: menuItems.filter(item => item.category === 'sandwiches')
        };
        
        res.json(groupedMenu);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// Get single menu item
router.get('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ error: 'Failed to fetch menu item' });
    }
});

// Create new menu item (admin only)
router.post('/', async (req, res) => {
    try {
        const menuItem = new MenuItem(req.body);
        await menuItem.save();
        res.status(201).json(menuItem);
    } catch (error) {
        console.error('Error creating menu item:', error);
        res.status(400).json({ error: 'Failed to create menu item' });
    }
});

// Update menu item (admin only)
router.put('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(400).json({ error: 'Failed to update menu item' });
    }
});

// Delete menu item (admin only)
router.delete('/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

module.exports = router;