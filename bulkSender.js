const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

/**
 * מערכת שליחה המונית חכמה ל-WhatsApp
 * תכונות:
 * - מרווחי זמן טבעיים ומשתנים בין הודעות
 * - תמיכה ברשימות תפוצה
 * - התאמה אישית להודעות
 * - דיווח התקדמות
 */

// הגדרות זמן (במילישניות)
// ⚠️ חשוב: עיכובים אלו מבוססים על מחקר ומניעת חסימה
// WhatsApp חוסם חשבונות ששולחים 100+ הודעות תוך 5 דקות
// מקורות: 8M חשבונות נחסמו בהודו ב-2024 בגלל שליחה אוטומטית מהירה
const DELAY_CONFIG = {
    min: 30000,     // 30 שניות מינימום - בטוח ומומלץ
    max: 60000,     // 60 שניות מקסימום - מחקה התנהגות אנושית
    personalized: { // עיכוב נוסף להודעות מותאמות אישית
        min: 5000,  // 5 שניות נוספות
        max: 10000  // 10 שניות נוספות
    }
};

// פונקציה ליצירת עיכוב אקראי טבעי
function getRandomDelay(min = DELAY_CONFIG.min, max = DELAY_CONFIG.max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// פונקציה להחלפת placeholders בהודעה
function personalizeMessage(template, contact) {
    return template
        .replace(/{name}/g, contact.name || '')
        .replace(/{firstName}/g, contact.firstName || contact.name?.split(' ')[0] || '')
        .replace(/{lastName}/g, contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '')
        .replace(/{company}/g, contact.company || '')
        .replace(/{customField}/g, contact.customField || '');
}

// פונקציה להמתנה
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// פונקציה לשליחת הודעות המונית
async function sendBulkMessages(client, contacts, messageTemplate, options = {}) {
    const results = {
        total: contacts.length,
        sent: 0,
        failed: 0,
        skipped: 0,
        details: []
    };

    console.log(`\n📊 מתחיל שליחה ל-${contacts.length} נמענים...\n`);

    for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const progress = `[${i + 1}/${contacts.length}]`;

        try {
            // בדיקה אם המספר תקין
            if (!contact.phone) {
                console.log(`${progress} ⏭️  דילוג - אין מספר טלפון עבור ${contact.name || 'Unknown'}`);
                results.skipped++;
                results.details.push({ contact, status: 'skipped', reason: 'No phone number' });
                continue;
            }

            const chatId = contact.phone.replace(/\D/g, '') + '@c.us';

            // בדיקה אם המספר רשום ב-WhatsApp
            if (options.validateNumbers) {
                const isRegistered = await client.isRegisteredUser(chatId);
                if (!isRegistered) {
                    console.log(`${progress} ⏭️  ${contact.name || contact.phone} - מספר לא רשום ב-WhatsApp`);
                    results.skipped++;
                    results.details.push({ contact, status: 'skipped', reason: 'Not registered' });
                    continue;
                }
            }

            // התאמה אישית של ההודעה
            const personalizedMsg = personalizeMessage(messageTemplate, contact);

            // שליחת ההודעה
            await client.sendMessage(chatId, personalizedMsg);

            console.log(`${progress} ✅ נשלח ל-${contact.name || contact.phone}`);
            results.sent++;
            results.details.push({ contact, status: 'sent' });

            // המתנה טבעית לפני ההודעה הבאה (למעט האחרונה)
            if (i < contacts.length - 1) {
                const waitTime = getRandomDelay();
                const additionalDelay = options.personalize ? getRandomDelay(
                    DELAY_CONFIG.personalized.min,
                    DELAY_CONFIG.personalized.max
                ) : 0;

                const totalDelay = waitTime + additionalDelay;
                console.log(`   ⏳ ממתין ${(totalDelay / 1000).toFixed(1)} שניות...\n`);
                await delay(totalDelay);
            }

        } catch (error) {
            console.log(`${progress} ❌ שגיאה בשליחה ל-${contact.name || contact.phone}: ${error.message}`);
            results.failed++;
            results.details.push({ contact, status: 'failed', error: error.message });

            // המתנה גם במקרה של שגיאה
            if (i < contacts.length - 1) {
                await delay(getRandomDelay());
            }
        }
    }

    return results;
}

// פונקציה לטעינת רשימת תפוצה מקובץ JSON
function loadContactsFromJSON(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ שגיאה בקריאת קובץ ${filePath}:`, error.message);
        return null;
    }
}

// פונקציה לטעינת רשימת תפוצה מקובץ CSV
function loadContactsFromCSV(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split('\n').filter(line => line.trim());

        // השורה הראשונה היא כותרות
        const headers = lines[0].split(',').map(h => h.trim());

        // המרת כל שורה לאובייקט
        const contacts = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim());
            const contact = {};
            headers.forEach((header, index) => {
                contact[header] = values[index] || '';
            });
            return contact;
        });

        return contacts;
    } catch (error) {
        console.error(`❌ שגיאה בקריאת קובץ ${filePath}:`, error.message);
        return null;
    }
}

// --- תחילת התוכנית הראשית ---

// בדיקת ארגומנטים
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(`
📱 מערכת שליחה המונית ל-WhatsApp

שימוש:
  node bulkSender.js <קובץ-אנשי-קשר> <קובץ-הודעה> [אפשרויות]

קובץ אנשי קשר:
  - JSON: קובץ עם מערך של אובייקטים {name, phone, firstName, ...}
  - CSV: קובץ עם עמודות: name,phone,firstName,...

קובץ הודעה:
  - קובץ טקסט עם ההודעה לשליחה
  - תומך ב-placeholders: {name}, {firstName}, {lastName}, {company}, {customField}

דוגמאות:
  node bulkSender.js contacts.json message.txt
  node bulkSender.js contacts.csv message.txt --validate

אפשרויות:
  --validate    בדוק שכל המספרים רשומים ב-WhatsApp לפני שליחה
  --no-delay    שלח ללא מרווחי זמן (לא מומלץ!)
    `);
    process.exit(1);
}

const contactsFile = args[0];
const messageFile = args[1];
const options = {
    validateNumbers: args.includes('--validate'),
    noDelay: args.includes('--no-delay'),
    personalize: true
};

// קריאת ההודעה
let messageTemplate;
try {
    messageTemplate = fs.readFileSync(messageFile, 'utf8');
} catch (error) {
    console.error(`❌ לא ניתן לקרוא את קובץ ההודעה: ${messageFile}`);
    process.exit(1);
}

// קריאת אנשי הקשר
let contacts;
if (contactsFile.endsWith('.json')) {
    contacts = loadContactsFromJSON(contactsFile);
} else if (contactsFile.endsWith('.csv')) {
    contacts = loadContactsFromCSV(contactsFile);
} else {
    console.error('❌ פורמט קובץ לא נתמך. השתמש ב-JSON או CSV');
    process.exit(1);
}

if (!contacts || contacts.length === 0) {
    console.error('❌ לא נמצאו אנשי קשר');
    process.exit(1);
}

console.log(`✅ נטענו ${contacts.length} אנשי קשר מ-${contactsFile}`);
console.log(`✅ נטענה הודעה מ-${messageFile}`);

if (options.noDelay) {
    DELAY_CONFIG.min = 0;
    DELAY_CONFIG.max = 100;
    console.log('⚠️  מצב ללא עיכוב - זה עלול להוביל לחסימה!');
}

// יצירת לקוח WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "bulk-sender"
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('\n🔐 סרוק את ה-QR Code הזה:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 פתח WhatsApp > הגדרות > מכשירים מקושרים > קשר מכשיר\n');
});

client.on('authenticated', () => {
    console.log('✅ אומת בהצלחה!');
});

client.on('ready', async () => {
    console.log('✅ WhatsApp מוכן!\n');

    try {
        // שליחת ההודעות
        const results = await sendBulkMessages(client, contacts, messageTemplate, options);

        // הצגת סיכום
        console.log('\n' + '='.repeat(50));
        console.log('📊 סיכום שליחה:');
        console.log('='.repeat(50));
        console.log(`✅ נשלחו בהצלחה: ${results.sent}/${results.total}`);
        console.log(`❌ נכשלו: ${results.failed}`);
        console.log(`⏭️  דולגו: ${results.skipped}`);
        console.log('='.repeat(50) + '\n');

        // שמירת דוח מפורט
        const reportFile = `report_${Date.now()}.json`;
        fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
        console.log(`📄 דוח מפורט נשמר ב-${reportFile}\n`);

        await client.destroy();
        process.exit(0);

    } catch (error) {
        console.error('❌ שגיאה כללית:', error);
        await client.destroy();
        process.exit(1);
    }
});

client.on('disconnected', (reason) => {
    console.log('❌ התנתק:', reason);
});

console.log('🚀 מתחיל את WhatsApp Web...');
client.initialize();
