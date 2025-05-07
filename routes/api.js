const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function to convert a date to the Philippines timezone
function toPhilippinesTime(date) {
    const offset = 8 * 60; // UTC+8 in minutes
    return new Date(date.getTime() + offset * 60 * 1000);
}

router.post('/register_token', (req, res) => {
    const { fcmToken, userId } = req.body; // Assuming you're sending userId along with the token

    if (!fcmToken || !userId) {
        return res.status(400).json({ error: 'FCM token and user ID are required' });
    }

    // Example: Save the token along with the user ID in the database
    db.query(
        'INSERT INTO fcm_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE token=?',
        [userId, fcmToken, fcmToken], // Update token if it already exists for the same user
        (err) => {
            if (err) {
                console.error('Error saving token:', err); // Log the error for debugging
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ success: true, message: 'Token registered successfully' });
        }
    );
});

app.get('/api/relay-status', (req, res) => {
    const sql = `
        SELECT rs.relay_name, rs.status, rs.timestamp
        FROM relay_status rs
        JOIN (
            SELECT relay_name, MAX(timestamp) as max_time
            FROM relay_status
            GROUP BY relay_name
        ) latest
        ON rs.relay_name = latest.relay_name AND rs.timestamp = latest.max_time
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching relay status:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});


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

/// Get sensor data
router.get('/get_sensor_data', (req, res) => {
    const { range, specific, limit = 10000, offset = 0 } = req.query;

    let query = `
        SELECT temperature, humidity, waterTemp, tds, ph, distance, timestamp
        FROM sensor_data
        WHERE timestamp BETWEEN ? AND ?
        ORDER BY timestamp ASC;
    `;

    let startDate, endDate;
    if (specific) {
        if (range === 'day') {
            startDate = new Date(specific);
            startDate.setHours(0, 0, 0, 0); // Set to 12:00 AM
            endDate = new Date(specific);
            endDate.setHours(23, 59, 59, 999); // Set to 11:59 PM
        } else if (range === 'week') {
            const [year, week] = specific.split('-W');
            const firstDayOfWeek = new Date(year, 0, (week - 1) * 7 + 1);
            startDate = firstDayOfWeek;
            endDate = new Date(firstDayOfWeek);
            endDate.setDate(endDate.getDate() + 6); // End of the week
        } else if (range === 'month') {
            startDate = new Date(specific + '-01');
            startDate.setHours(0, 0, 0, 0); // Start of the month
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of the month
            endDate.setHours(23, 59, 59, 999); // End of the month
        } else if (range === 'year') {
            startDate = new Date(specific + '-01-01');
            startDate.setHours(0, 0, 0, 0); // Start of the year
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            endDate.setDate(0); // Last day of the year
            endDate.setHours(23, 59, 59, 999); // End of the year
        }
    } else {
        startDate = getStartDateForRange(range);
        endDate = new Date();
    }

    // Convert startDate and endDate to UTC
    startDate = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
    endDate = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000);

    console.log('Start Date (UTC):', startDate);
    console.log('End Date (UTC):', endDate);

    db.query(query, [startDate, endDate], (err, results) => {
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