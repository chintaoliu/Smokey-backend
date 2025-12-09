const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

const seedData = [
    // Smoked Meats
    {
        name: "Texas Brisket",
        description: "Slow-smoked for 14 hours, served with our signature rub",
        serving: "12 oz portion, served with two sides",
        price: 24.99,
        category: "smokedMeats",
        popular: true,
        spicy: false
    },
    {
        name: "Pulled Pork",
        description: "12-hour smoked pork shoulder, hand-pulled to perfection",
        serving: "8 oz portion, served with two sides",
        price: 18.99,
        category: "smokedMeats",
        popular: false,
        spicy: false
    },
    {
        name: "St. Louis Ribs",
        description: "Fall-off-the-bone pork ribs with your choice of sauce",
        serving: "Full rack (serves 2-3)",
        price: 28.99,
        category: "smokedMeats",
        popular: true,
        spicy: false
    },
    {
        name: "Smoked Chicken",
        description: "Whole chicken smoked with our special herb blend",
        serving: "Half chicken, served with two sides",
        price: 16.99,
        category: "smokedMeats",
        popular: false,
        spicy: true
    },
    // Sides
    {
        name: "Smoked Mac & Cheese",
        description: "Creamy blend of three cheeses with a smoky flavor",
        serving: "Regular portion",
        price: 5.99,
        category: "sides",
        popular: false,
        spicy: false
    },
    {
        name: "Collard Greens",
        description: "Slow-cooked with smoked turkey",
        serving: "Regular portion",
        price: 4.99,
        category: "sides",
        popular: false,
        spicy: false
    },
    {
        name: "BBQ Baked Beans",
        description: "Sweet and savory with chunks of brisket",
        serving: "Regular portion",
        price: 4.99,
        category: "sides",
        popular: false,
        spicy: false
    },
    {
        name: "Cornbread",
        description: "Freshly baked with honey butter",
        serving: "Two pieces",
        price: 3.99,
        category: "sides",
        popular: false,
        spicy: false
    },
    // Sandwiches
    {
        name: "The Smokey Special",
        description: "Brisket, pulled pork, and sausage with coleslaw",
        serving: "Served on a brioche bun with fries",
        price: 15.99,
        category: "sandwiches",
        popular: true,
        spicy: false
    },
    {
        name: "Pulled Pork Sandwich",
        description: "Tender pulled pork with our signature sauce",
        serving: "Served on a brioche bun with one side",
        price: 12.99,
        category: "sandwiches",
        popular: false,
        spicy: false
    },
    {
        name: "BBQ Chicken Sandwich",
        description: "Smoked chicken with spicy BBQ sauce",
        serving: "Served on a brioche bun with one side",
        price: 11.99,
        category: "sandwiches",
        popular: false,
        spicy: true
    }
];

async function seedDatabase() {
    try {
        await mongoose.connect('mongodb://localhost:27017/smokey_restaurant');
        
        console.log('Connected to MongoDB');
        
        // Clear existing data
        await MenuItem.deleteMany({});
        console.log('Cleared existing menu items');
        
        // Insert seed data
        await MenuItem.insertMany(seedData);
        console.log(`Inserted ${seedData.length} menu items`);
        
        // Display inserted items
        const items = await MenuItem.find({});
        console.log('\nMenu Items:');
        items.forEach(item => {
            console.log(`- ${item.name}: $${item.price} (${item.category})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
