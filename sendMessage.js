const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// יצירת לקוח WhatsApp עם אימות מקומי (שומר את הסשן)
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "client-one"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// אירוע: הצגת QR Code לסריקה (רק בפעם הראשונה)
client.on('qr', (qr) => {
    console.log('\n🔐 סרוק את ה-QR Code הזה עם WhatsApp במכשיר שלך:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 פתח WhatsApp > הגדרות > מכשירים מקושרים > קשר מכשיר');
});

// אירוע: אימות בתהליך
client.on('authenticated', () => {
    console.log('✅ אומת בהצלחה!');
});

// אירוע: כשיר להשתמש
client.on('ready', async () => {
    console.log('✅ WhatsApp מוכן לשימוש!');

    try {
        // דוגמה לשליחת הודעה
        // החלף את המספר במספר הנכון (בפורמט בינלאומי ללא +)
        const phoneNumber = '972501234567'; // דוגמה: 972 = ישראל, 50 = prefix
        const message = 'היי! זו הודעה אוטומטית מ-Claude Code! 🤖';

        // שליחת ההודעה
        const chatId = phoneNumber + '@c.us';
        await client.sendMessage(chatId, message);

        console.log(`✅ הודעה נשלחה ל-${phoneNumber}`);

        // יציאה מהסקריפט
        await client.destroy();
        process.exit(0);

    } catch (error) {
        console.error('❌ שגיאה בשליחת ההודעה:', error);
        process.exit(1);
    }
});

// אירוע: התנתקות
client.on('disconnected', (reason) => {
    console.log('❌ התנתק מ-WhatsApp:', reason);
});

// אתחול הלקוח
console.log('🚀 מתחיל את WhatsApp Web...');
client.initialize();
