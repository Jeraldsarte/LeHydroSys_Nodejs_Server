const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./mqttClient'); 
const path = require('path');
const { testDbConnection } = require('./db'); 
const apiRouter = require('./routes/api');

const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies

// Routes
app.use('/api', apiRouter); // Mount the API router at the /api path
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the public directory

// Test database connection
testDbConnection()
    .then(() => console.log('✅ Database connected successfully'))
    .catch((err) => console.error('❌ Database connection failed:', err));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});