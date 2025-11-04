const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// קבלת ארגומנטים מה-command line
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('❌ שימוש: node sendMessageCLI.js <מספר-טלפון> <הודעה>');
    console.log('דוגמה: node sendMessageCLI.js 972501234567 "שלום מקלוד!"');
    process.exit(1);
}

const phoneNumber = args[0];
const message = args.slice(1).join(' ');

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

// אירוע: הצגת QR Code
client.on('qr', (qr) => {
    console.log('\n🔐 סרוק את ה-QR Code הזה עם WhatsApp במכשיר שלך:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 פתח WhatsApp > הגדרות > מכשירים מקושרים > קשר מכשיר');
});

client.on('authenticated', () => {
    console.log('✅ אומת בהצלחה!');
});

client.on('ready', async () => {
    console.log('✅ WhatsApp מוכן לשימוש!');
    console.log(`📤 שולח הודעה ל-${phoneNumber}...`);

    try {
        const chatId = phoneNumber + '@c.us';
        await client.sendMessage(chatId, message);

        console.log(`✅ הודעה נשלחה בהצלחה!`);
        console.log(`📱 מספר: ${phoneNumber}`);
        console.log(`💬 הודעה: ${message}`);

        await client.destroy();
        process.exit(0);

    } catch (error) {
        console.error('❌ שגיאה בשליחת ההודעה:', error.message);
        await client.destroy();
        process.exit(1);
    }
});

client.on('disconnected', (reason) => {
    console.log('❌ התנתק מ-WhatsApp:', reason);
});

console.log('🚀 מתחיל את WhatsApp Web...');
client.initialize();
