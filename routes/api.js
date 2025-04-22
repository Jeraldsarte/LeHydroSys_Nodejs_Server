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

// Get relay commands for ESP32
router.get('/get_commands', (req, res) => {
    db.query('SELECT relay1, relay2 FROM relay_state WHERE id = 1', (err, results) => {
        if (err) return res.status(500).send(err);

        const relay1Command = results[0].relay1 ? 'relay1_on' : 'relay1_off';
        const relay2Command = results[0].relay2 ? 'relay2_on' : 'relay2_off';

        res.json({
            relay1: relay1Command,
            relay2: relay2Command
        });
    });
});

// Add route to get sensor data based on the selected time range
router.get('/get_sensor_data', (req, res) => {
    const range = req.query.range || 'day'; // Default to 'day' if not provided
    const query = buildQueryForTimeRange(range);

    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);

        // Map the results to the format expected by the Android app
        const data = results.map(row => ({
            air_temp: row.air_temp,
            humidity: row.humidity,
            water_temp: row.water_temp,
            water_level: row.water_level,
            ph: row.ph,
            tds: row.tds,
            timestamp: row.timestamp // Include timestamp if needed for graph plotting
        }));

        res.json(data); // Return the sensor data as JSON
    });
});

// Helper function to build the query for different time ranges
function buildQueryForTimeRange(range) {
    let query = 'SELECT * FROM sensor_data';

    const currentDate = new Date();
    let startDate;

    switch (range) {
        case 'week':
            startDate = new Date(currentDate.setDate(currentDate.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
            break;
        case 'year':
            startDate = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1));
            break;
        case 'day':
        default:
            startDate = new Date(currentDate.setHours(0, 0, 0, 0)); // Midnight of today
            break;
    }

    query += ` WHERE timestamp >= '${startDate.toISOString()}' ORDER BY timestamp`;

    return query;
}

module.exports = router;