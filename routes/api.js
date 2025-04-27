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
    const query = 'UPDATE relay_state SET relay1 = ?, relay2 = ?, last_updated = NOW() WHERE id = 1';
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

let lastFetchTime = null; // Store the last fetch time for the ESP32

router.get('/get_commands', (req, res) => {
    const query = 'SELECT relay1, relay2, last_updated FROM relay_state WHERE id = 1';
    db.query(query, (err, results) => {
        if (err) return res.status(500).send(err);

        const { relay1, relay2, last_updated } = results[0];

        // Check if the relay state was updated since the last fetch
        if (!lastFetchTime || new Date(last_updated) > new Date(lastFetchTime)) {
            const relay1Command = relay1 ? 'relay1_on' : 'relay1_off';
            const relay2Command = relay2 ? 'relay2_on' : 'relay2_off';

            // Update the last fetch time
            lastFetchTime = last_updated;

            res.json({
                relay1: relay1Command,
                relay2: relay2Command
            });
        } else {
            // No updates, return an empty response
            res.json({});
        }
    });
});

router.get('/api/get_sensor_data', (req, res) => {
    const { range, specific, limit = 100, offset = 0 } = req.query;

    let query = `
        SELECT temperature, humidity, waterTemp, tds, ph, distance, timestamp
        FROM sensor_data
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC
        LIMIT ? OFFSET ?;
    `;

    let startDate, endDate;
    if (specific) {
        if (range === 'day') {
            startDate = new Date(specific);
            endDate = new Date(specific);
            endDate.setDate(endDate.getDate() + 1);
        } else if (range === 'week') {
            const [year, week] = specific.split('-W');
            const firstDayOfWeek = new Date(year, 0, (week - 1) * 7 + 1);
            startDate = firstDayOfWeek;
            endDate = new Date(firstDayOfWeek);
            endDate.setDate(endDate.getDate() + 7);
        } else if (range === 'month') {
            startDate = new Date(specific + '-01');
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (range === 'year') {
            startDate = new Date(specific + '-01-01');
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
    } else {
        startDate = getStartDateForRange(range);
        endDate = new Date();
    }

    db.query(query, [startDate, endDate, parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error('❌ Error fetching data:', err);
            return res.status(500).json({ error: 'Error fetching data' });
        }
        res.json(results);
    });
});

function getStartDateForRange(range) {
    const now = new Date();
    switch (range) {
        case 'day':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        case 'week':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        case 'month':
            return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case 'year':
            return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        default:
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    }
}

module.exports = router;