const mqtt = require('mqtt');
const fs = require('fs');
const { db } = require('./db');
require('dotenv').config();

// Read CA certificate
const caCert = fs.readFileSync('./certs/emqxsl_ca.crt'); // Update the path if needed

// MQTT connection options with certificate validation
const options = {
    port: parseInt(process.env.MQTT_PORT, 10),
    protocol: 'mqtts',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    ca: caCert,
    rejectUnauthorized: true // ✅ Enforce server certificate validation
};

const client = mqtt.connect(process.env.MQTT_BROKER, options);

// To control the rate of publishing data
let lastPublishedTime = 0; // Keep track of the last published time (in ms)

const PUBLISH_INTERVAL = 1000; // Set to 1000ms (1 second) or adjust to your preferred interval

client.on('connect', () => {
    console.log('✅ Securely connected to EMQX MQTT broker with certificate validation');

    client.subscribe(process.env.MQTT_TOPIC, (err) => {
        if (!err) {
            console.log('📡 Subscribed to topic:', process.env.MQTT_TOPIC);
        } else {
            console.error('❌ MQTT Subscribe Error:', err);
        }
    });
});

client.on('message', (topic, message) => {
    const payload = message.toString();
    console.log('📥 MQTT Message:', payload);

    // === 🟡 Relay Status Handling ===
    if (payload.startsWith("RELAY1:") || payload.startsWith("RELAY2:")) {
        const [relayLabel, statusStr] = payload.split(':');
        const relay = relayLabel.toUpperCase(); // RELAY1 or RELAY2
        const status = parseInt(statusStr, 10);

        if (isNaN(status) || (status !== 0 && status !== 1)) {
            console.warn('⚠️ Invalid relay status value:', payload);
            return;
        }

        const now = new Date();
        const philippinesTime = now.toLocaleString('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        const formattedTimestamp = philippinesTime.replace('T', ' ');

        const insertRelayQuery = `
            INSERT INTO relay_status (relay_name, status, timestamp)
            VALUES (?, ?, ?)
        `;

        db.query(insertRelayQuery, [relay, status, formattedTimestamp], (err) => {
            if (err) {
                console.error('❌ DB Insert Error (relay):', err);
            } else {
                console.log(`✅ ${relay} status (${status}) saved at ${formattedTimestamp}`);
            }
        });

        return; // Skip the rest (sensor data) if this is a relay command
    }

    // === 🟢 Sensor Data Handling ===
    try {
        let temperature, humidity, waterTemp, tds, ph, distance;

        if (payload.includes('field1=')) {
            const params = new URLSearchParams(payload);
            temperature = parseFloat(params.get("field1"));
            humidity = parseFloat(params.get("field2"));
            waterTemp = parseFloat(params.get("field3"));
            tds = parseFloat(params.get("field4"));
            ph = parseFloat(params.get("field5"));
            distance = parseFloat(params.get("field6"));
        } else if (payload.includes(',')) {
            const parts = payload.split(',').map(Number);
            if (parts.length === 6) {
                [temperature, humidity, waterTemp, tds, ph, distance] = parts;
            } else {
                console.warn("⚠️ Payload does not have exactly 6 fields:", parts);
                throw new Error("Invalid comma-separated sensor data");
            }
        } else {
            console.warn("⚠️ Unrecognized payload format, ignoring:", payload);
            return;
        }

        const values = [temperature, humidity, waterTemp, tds, ph, distance];

        if (values.some(v => isNaN(v))) {
            console.warn("⚠️ Invalid or missing fields in payload:", values);
            throw new Error("Invalid sensor data (NaN values)");
        }

        const now = new Date();
        const philippinesTime = now.toLocaleString('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        const formattedTimestamp = philippinesTime.replace('T', ' ');

        const query = `
            INSERT INTO sensor_data (temperature, humidity, waterTemp, tds, ph, distance, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(query, [...values, formattedTimestamp], (err) => {
            if (err) {
                console.error('❌ DB Insert Error:', err);
            } else {
                console.log('✅ Data saved to DB with timestamp:', formattedTimestamp);
            }
        });

        console.log('👉 Insert Query:', query);
        console.log('👉 Values:', [...values, formattedTimestamp]);

    } catch (err) {
        console.error('❌ Payload Parse Error:', err.message);
    }
});


client.on('error', (err) => {
    console.error('❌ MQTT Client Error:', err);
});

process.on('SIGINT', () => {
    console.log('Gracefully shutting down...');
    client.end();  // Close MQTT connection
    db.end();      // Close DB connection
    process.exit();
});