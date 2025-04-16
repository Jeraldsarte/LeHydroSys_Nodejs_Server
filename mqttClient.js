const mqtt = require('mqtt');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

// MQTT connection options with authentication
const options = {
    port: parseInt(process.env.MQTT_PORT, 10),
    protocol: 'mqtts',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false // ⚠️ Use true for production with valid certs
};

const client = mqtt.connect(process.env.MQTT_BROKER, options);

client.on('connect', () => {
    console.log('✅ Securely connected to EMQX MQTT broker');

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

        const query = `
            INSERT INTO sensor_data (temperature, humidity, waterTemp, tds, ph, distance)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [temperature, humidity, waterTemp, tds, ph, distance];

        db.query(query, values, (err) => {
            if (err) {
                console.error('❌ DB Insert Error:', err);
            } else {
                console.log('✅ Data saved to DB');
            }
        });

        console.log('👉 Insert Query:', query);
        console.log('👉 Values:', values);

    } catch (err) {
        console.error('❌ Payload Parse Error:', err.message);
    }
});

client.on('error', (err) => {
    console.error('❌ MQTT Client Error:', err);
});
