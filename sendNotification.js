const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

/**
 * Send a push notification to a device
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 */
function sendNotification(token, title, body) {
    const message = {
        notification: {
            title,
            body
        },
        token
    };

    admin.messaging().send(message)
        .then(response => {
            console.log('✅ Notification sent:', response);
        })
        .catch(error => {
            console.error('❌ Error sending notification:', error);
        });
}

module.exports = sendNotification;

// Example usage (uncomment to test):
// const testToken = 'YOUR_DEVICE_FCM_TOKEN';
// sendNotification(testToken, 'Test Title', 'Test Body');