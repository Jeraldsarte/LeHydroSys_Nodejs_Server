const mqtt = require('mqtt');
const fs = require('fs');
const db = require('./db');
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

    try {
        const params = new URLSearchParams(payload);

        const temperature = parseFloat(params.get("field1"));
        const humidity = parseFloat(params.get("field2"));
        const waterTemp = parseFloat(params.get("field3"));
        const tds = parseFloat(params.get("field4"));
        const ph = parseFloat(params.get("field5"));
        const distance = parseFloat(params.get("field6"));

        const values = [temperature, humidity, waterTemp, tds, ph, distance];

        // Validate all values
        if (values.some(v => isNaN(v))) {
            console.warn("⚠️ Invalid or missing fields in payload:", values);
            throw new Error("Invalid sensor data (NaN values)");
        }

        // Insert into DB
        const query = `
            INSERT INTO sensor_data (temperature, humidity, waterTemp, tds, ph, distance)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(query, values, (err) => {
            if (err) {
                console.error('❌ DB Insert Error:', err);
            } else {
                console.log('✅ Data saved to DB');
            }
        });

        console.log('👉 Insert Query:', query);
        console.log('👉 Values:', values);

        // Control MQTT publishing rate based on time
        const currentTime = Date.now();
        if (currentTime - lastPublishedTime >= PUBLISH_INTERVAL) {
            const mqttPayload = `field1=${temperature}&field2=${humidity}&field3=${waterTemp}&field4=${tds}&field5=${ph}&field6=${distance}`;
            
            // Publish to MQTT
            client.publish(process.env.MQTT_TOPIC, mqttPayload, { qos: 1 }, (err) => {
                if (err) {
                    console.error('❌ MQTT Publish Error:', err);
                } else {
                    console.log('📡 Data published to broker:', mqttPayload);
                    lastPublishedTime = currentTime; // Update last published time
                }
            });
        } else {
            console.log('🕑 Waiting to publish. Interval not met yet.');
        }

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
