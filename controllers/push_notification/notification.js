import admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url';
import { channel } from 'diagnostics_channel';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, './serviceAccountKey.json');
const serviceAccount = JSON.parse(await fs.promises.readFile(serviceAccountPath, 'utf8'));


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});



// Function to send push notification
const sendNotification = async (tokens, title, body, data = {}) => {
    const message = {
        notification: {
            title,
            body,
        },
        data,
        tokens, // FCM will send to all these tokens
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};



// register notification
const registerNotificationToken = async(req,res)=>{
    const { userId, token, userType } = req.body; 

    if (!userId || !token || !userType) {
        return res.status(400).json({ message: 'userId, token, and userType are required.' });
    }

    try {
        if (userType === 'doctor') {
            await prisma.deviceToken.create({
                data: {
                    token,
                    doctorId: userId,
                },
            });
        } else if (userType === 'patient') {
            await prisma.deviceToken.create({
                data: {
                    token,
                    patientId: userId,
                },
            });
        }
        res.status(200).json({ message: 'Token registered successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering token.' });
    }
}


// send notifications to doctor or patients
export const sendNotificationsPatientDoctor = async(req,res)=>{
    const { userId, userType, title, body, data } = req.body;

    if (!userId || !userType || !title || !body) {
        return res.status(400).json({ message: 'userId, userType, title, and body are required.' });
    }
    
    try {
        let tokens = [];

        if (userType === 'doctor') {
            const doctor = await prisma.doctor.findUnique({
                where: { id: userId },
                include: { deviceTokens: true },
            });
            tokens = doctor.deviceTokens.map(dt => dt.token);
        } else if (userType === 'patient') {
            const patient = await prisma.patient.findUnique({
                where: { id: userId },
                include: { deviceTokens: true },
            });
            tokens = patient.deviceTokens.map(dt => dt.token);
        }

        if (tokens.length === 0) {
            return res.status(404).json({ message: 'No device tokens found for the user.' });
        }

        const response = await sendNotification(tokens, title, body, data);
        res.status(200).json({ message: 'Notification sent successfully.', response });
    } catch (error) {
        res.status(500).json({ message: 'Error sending notification.', error });
    }
}


export const testFirbase  = async(req,res)=>{
    try {
        const message = {
            notification: {
                title: 'Testing !!!!',
                body: 'Firebase Admin SDK is properly initialized.',
            },
            token: 'erzqMv2-RmO-OHAzyB83Qp:APA91bHQ7X-VWHPC_BpqkQ6mzbb7bco3oU4GtOhlg-n6xpZYfqiJ8yzCkQgIi915QtgxVyhYpqijgoHz49rx6hHU2R2QunwYPSsuBEgd33zbzGsxkwnWAvlTu7qR3XStaRTkqfxOWML_', // Replace with a valid device token
        };
        const response = await admin.messaging().send(message);
        console.log('Test message sent successfully:', response);
        res.status(200).json({ message: 'Firebase test message sent successfully.', response });
    } catch (error) {
        console.error('Error sending test message:', error);
        res.status(500).json({ message: 'Error sending test message.', error });
    }
}

export async function toDoctor(title,body,channelName){
        try {
            const message = {
                notification: {
                    title,
                    body,
                },
                data:{
                     channelName
                },
                token: 'eC_EUSi9Qpap-nJyhgKiF5:APA91bH02Ae0vQNhX7y0LRd2dOObnPxQr__knaviXoszU2773ys8ka4dsqIghfHQEojV5FUG5foeUf1xQxcNVwnNYILLH2gVJv2r1VEaZ90O-crAax0IgFlL3Onw4qbeZIxCQS_kAxb5', 
            };
            const response = await admin.messaging().send(message);
            console.log('Test message sent successfully:', response);
        } catch (error) {
            console.error('Error sending test message:', error);
        }
}
