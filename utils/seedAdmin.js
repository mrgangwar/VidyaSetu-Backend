const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

const seedSuperAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            console.error('Admin credentials missing in .env');
            return;
        }

        const adminExists = await User.findOne({ role: 'SUPER_ADMIN' });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            try {
                await User.create({
                    name: 'Main Super Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'SUPER_ADMIN',
                    coachingId: null
                });
                console.log('Super Admin created');
            } catch (error) {
                if (error.code === 11000) {
                    console.error('Duplicate email:', adminEmail);
                } else {
                    console.error('Error creating Super Admin:', error.message);
                }
            }
        }
    } catch (error) {
        console.error('Error seeding Super Admin:', error.message);
    }
};

module.exports = seedSuperAdmin;
