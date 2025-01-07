const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Adjust path based on your project structure

// Search Route
router.get('/search', async (req, res) => {
    const searchQuery = req.query.username;

    if (!searchQuery) {
        return res.status(400).json({ success: false, message: 'No search query provided.' });
    }

    try {
        // Perform a case-insensitive search for usernames containing the query
        const users = await User.find({ username: { $regex: searchQuery, $options: 'i' } }).select('username');
        if (users.length === 0) {
            return res.json({ success: true, message: 'No matching users found.', users: [] });
        }
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error searching for users:', error);
        res.status(500).json({ success: false, message: 'An error occurred while searching.' });
    }
});

module.exports = router;
