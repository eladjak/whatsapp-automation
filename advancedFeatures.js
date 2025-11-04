const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// יצירת לקוח WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-one"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('\n🔐 סרוק את ה-QR Code הזה:\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('✅ אומת בהצלחה!');
});

client.on('ready', async () => {
    console.log('✅ WhatsApp מוכן! הנה כמה דוגמאות מתקדמות:\n');

    const phoneNumber = '972501234567'; // החלף במספר שלך
    const chatId = phoneNumber + '@c.us';

    try {
        // 1. שליחת הודעה עם emoji
        console.log('1️⃣ שולח הודעה עם emojis...');
        await client.sendMessage(chatId, 'שלום! 👋 זו הודעה אוטומטית 🤖');
        await delay(2000);

        // 2. שליחת הודעה מרובת שורות
        console.log('2️⃣ שולח הודעה מרובת שורות...');
        const multilineMessage = `
שלום!

זוהי הודעה מרובת שורות.
- נקודה 1
- נקודה 2
- נקודה 3

תודה! 🙏
        `.trim();
        await client.sendMessage(chatId, multilineMessage);
        await delay(2000);

        // 3. שליחת תמונה (אם קיימת)
        if (fs.existsSync('./test-image.jpg')) {
            console.log('3️⃣ שולח תמונה...');
            const media = MessageMedia.fromFilePath('./test-image.jpg');
            await client.sendMessage(chatId, media, {
                caption: 'זו תמונת דוגמה! 📸'
            });
            await delay(2000);
        }

        // 4. שליחת מיקום
        console.log('4️⃣ שולח מיקום...');
        await client.sendMessage(chatId, 'שולח לך מיקום של תל אביב:');
        await client.sendMessage(chatId, {
            location: {
                latitude: 32.0853,
                longitude: 34.7818,
                description: 'תל אביב, ישראל'
            }
        });
        await delay(2000);

        // 5. בדיקת סטטוס (האם המספר רשום ב-WhatsApp)
        console.log('5️⃣ בודק סטטוס מספר...');
        const isRegistered = await client.isRegisteredUser(chatId);
        console.log(`   📱 המספר ${phoneNumber} ${isRegistered ? 'רשום' : 'לא רשום'} ב-WhatsApp`);

        // 6. קבלת מידע על צ'אט
        console.log('6️⃣ מקבל מידע על הצ\'אט...');
        const chat = await client.getChatById(chatId);
        console.log(`   💬 שם: ${chat.name || 'לא זמין'}`);
        console.log(`   🔇 מושתק: ${chat.isMuted ? 'כן' : 'לא'}`);

        console.log('\n✅ כל הפעולות הושלמו בהצלחה!');

        await client.destroy();
        process.exit(0);

    } catch (error) {
        console.error('❌ שגיאה:', error);
        await client.destroy();
        process.exit(1);
    }
});

// פונקציית עזר להמתנה
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

client.on('disconnected', (reason) => {
    console.log('❌ התנתק:', reason);
});

console.log('🚀 מתחיל...');
client.initialize();
