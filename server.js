const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./mqttClient');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', require('./routes/api'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
