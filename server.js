const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./mqttClient');
const path = require('path');
const { testDbConnection } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', require('./routes/api'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});


