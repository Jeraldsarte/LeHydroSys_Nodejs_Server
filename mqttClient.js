const mqtt = require('mqtt');
const fs = require('fs');
const db = require('./db');
require('dotenv').config();

const options = {
    port: process.env.MQTT_PORT,
    protocol: 'mqtts',
    rejectUnauthorized: false // ⚠️ Only use false for testing purposes
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

    const [temperature, humidity, waterTemp, tds, ph, distance] = payload.split(',');

    const query = 'INSERT INTO sensor_data (temperature, humidity, waterTemp, tds, ph, distance) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [temperature, humidity, waterTemp, tds, ph, distance], err => {
        if (err) console.error('❌ DB Insert Error:', err);
        else console.log('✅ Data saved to DB');
    });
});

client.on('error', err => {
    console.error('❌ MQTT Client Error:', err);
});
