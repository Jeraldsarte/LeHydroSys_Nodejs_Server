const express = require('express');
const router = express.Router();
const db = require('../db');

// Get latest sensor data
router.get('/data/latest', (req, res) => {
    db.query('SELECT * FROM sensor_data ORDER BY timestamp DESC LIMIT 1', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

// Post relay command
router.post('/relay', (req, res) => {
    const { relay1, relay2 } = req.body;
    const query = 'UPDATE relay_state SET relay1 = ?, relay2 = ? WHERE id = 1';
    db.query(query, [relay1, relay2], (err) => {
        if (err) return res.status(500).send(err);
        res.send('Relay state updated');
    });
});

// Get relay state
router.get('/relay', (req, res) => {
    db.query('SELECT * FROM relay_state WHERE id = 1', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results[0]);
    });
});

module.exports = router;
