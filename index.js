const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Readable } = require('stream');
const { google } = require('googleapis');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const apikeys = require('./apikeys.json');
const SCOPE = ['https://www.googleapis.com/auth/drive'];

async function authorize() {
    const jwtClient = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPE
    );

    await jwtClient.authorize();

    return jwtClient;
}

async function uploadFile(authClient, base64Data, fileName, folderId) {
    return new Promise((resolve, rejected) => {
        const drive = google.drive({ version: 'v3', auth: authClient });

        const fileMetaData = {
            name: fileName,
            parents: [folderId]
        };
        const bufferStream = new Readable();
        bufferStream.push(Buffer.from(base64Data, 'base64'));
        bufferStream.push(null);

        drive.files.create({
            resource: fileMetaData,
            media: {
                body: bufferStream,
                mimeType: 'application/octet-stream'
            },
            fields: 'id'
        }, function (error, file) {
            if (error) {
                return rejected(error)
            }
            resolve(file);
        })
    });
}

// async function uploadqr(authClient, base64Data) {
//     return new Promise((resolve, rejected) => {
//         const drive = google.drive({ version: 'v3', auth: authClient });

//         const fileMetaData = {
//             name: 'qr',
//             parents: ['1b5JtTaDgW4ETVovE3Uocyy7fVJ6qKL_Z']
//         };
//         const bufferStream = new Readable();
//         bufferStream.push(Buffer.from(base64Data, 'base64'));
//         bufferStream.push(null);

//         drive.files.create({
//             resource: fileMetaData,
//             media: {
//                 body: bufferStream,
//                 mimeType: 'application/octet-stream'
//             },
//             fields: 'id'
//         }, function (error, file) {
//             if (error) {
//                 return rejected(error)
//             }
//             resolve(file);
//         })
//     });
// }
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const client = new Client({
    authStrategy: new LocalAuth(),
});


// client.on('qr', qr => {
//     qrcode.generate(qr, { small: true });
//     qrcode.error

//     console.log('qr', qr);
//     uploadqr(authClient,qr);
// });

client.on('qr', qrText => {
    // Display QR code in the console
    
    console.log(qrText);

    qrcode.generate(qrText, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

let db;

async function connectToDB() {
    const uri = 'mongodb+srv://abel:abel@cluster0.iqgx2js.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    const client = new MongoClient(uri);

    try {
        await client.connect();
        db = client.db('ezprints');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

async function insertFilenameToDB(filename,collectionName) {
    try {
        const collection = db.collection(collectionName);
        await collection.insertOne({ name: filename });
        console.log('Filename inserted into database:', filename);
    } catch (error) {
        console.error('Ntho preshnm');
    }
}




// Check if the collection exists, if not create it
// async function insertFilenameToDB(filename,collectionName) {
//   try {
//       const collection = db.collection(collectionName);
//       await collection.insertOne({ name: filename });
//       console.log('Filename inserted into collection', collectionName, ':', filename);
//   } catch (error) {
//       console.error('Error inserting filename into collection', collectionName, ':', error);
//       throw error; // Re-throw the error for handling at higher level if needed
//   }
// }


client.on('message', async message => {
  const senderPhoneNumber = message.from;
  const phoneNumberDigits = senderPhoneNumber.replace(/\D/g, '').slice(-10);
  const collectionName = phoneNumberDigits;
  console.log('Sender phone number:', phoneNumberDigits);
    if (message.hasMedia ) {
        const media = await message.downloadMedia();
        if(media.filename!=null && media.filename.endsWith('.pdf')) {
            const base64Data = media.data;
            const fileName = media.filename;
            async function createCollectionIfNotExists(collectionName) {
            const collections = await db.listCollections().toArray();
            const collectionExists = collections.some(collection => collection.name === collectionName);
            if (!collectionExists) {
                await db.createCollection(collectionName);
                console.log('Collection created:', collectionName);
            }
            }
            
            // Insert filename into the collection
            createCollectionIfNotExists(collectionName)
            .then(() => insertFilenameToDB(media.filename,collectionName))
            .catch(error => console.error('Error creating collection or inserting filename:', error));
            // const folderId = '15fhDr2SHWaN0mARKhqzl6KDGKwBn9a1m';
            const folderId = '1d0HXC7KlRY1kQ87pHwT1aDcnazj5z8HB';


            authorize().then(authClient => {

                return uploadFile(authClient, base64Data, fileName, folderId);
            })
                .then(uploadedFile => {
                    console.log('File uploaded:', media.filename);
                    message.reply('File uploaded:', media.filename);
                    //client.sendMessage(message.from, 'Files are found in the below link:');
                    //client.sendMessage(message.from, 'https://tinyurl.com/ezprints');

                    // Insert filename into MongoDB
                    insertFilenameToDB(media.filename);
                })
        
            .catch(error => {
                console.error('Error:', error);
            });
        }
    } else if (message.body === 'ping') {
        message.reply('pong');
        console.log('ping message recevied');
    } else if (message.body === 'nadako') {
        message.reply('avo');
        message.react('🚶');
    } else if (message.body === '!anand') {
        message.reply('ni eatha naaayeeeee!');
        message.react('🖕');
    } else if(message.body=='!erajhipo'){
        
        message.reply('ninte achan');
        message.reply('LocalAuth loggingout.');
        
    } else if (message.body === '!epadida') {
        message.reply('unnal mudiyath thambi!');
        message.react('😙');
    }
    // else if (msg.body === '!isviewonce' && msg.hasQuotedMsg) {
    //     const quotedMsg = await msg.getQuotedMessage();
    //     if (quotedMsg.hasMedia) {
    //         const media = await quotedMsg.downloadMedia();
    //         await client.sendMessage(msg.from, media, { isViewOnce: true });
    //     }
    // }
    // client.logout();
    
});

(async () => {
    await connectToDB();
    await client.initialize();
})();
