const admin = require('firebase-admin');

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK with a service account JSON string.
 * Only initializes once per process.
 * @param {string} serviceAccountJsonString
 */
function initializeFirebase(serviceAccountJsonString) {
    if (!firebaseInitialized) {
        const serviceAccount = JSON.parse(serviceAccountJsonString);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
    }
}

/**
 * Send a push notification to a device
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} serviceAccountJsonString - The service account JSON string from the database
 */
function sendNotification(token, title, body, serviceAccountJsonString) {
    initializeFirebase(serviceAccountJsonString);

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