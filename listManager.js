const fs = require('fs');
const readline = require('readline');

/**
 * מנהל רשימות תפוצה אינטראקטיבי
 * מאפשר יצירה, עריכה וניהול של רשימות אנשי קשר
 */

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// פונקציה ליצירת רשימה חדשה
async function createNewList() {
    console.log('\n📝 יצירת רשימת תפוצה חדשה\n');

    const listName = await question('שם הרשימה: ');
    const contacts = [];

    console.log('\nהוסף אנשי קשר (הקש Enter בלי שם כדי לסיים):\n');

    while (true) {
        const name = await question('שם מלא: ');
        if (!name.trim()) break;

        const firstName = await question('שם פרטי (או Enter לשימוש במילה הראשונה): ');
        const lastName = await question('שם משפחה (או Enter): ');
        const phone = await question('מספר טלפון (פורמט: 972501234567): ');
        const company = await question('חברה (אופציונלי): ');
        const customField = await question('שדה מותאם אישית (אופציונלי): ');

        contacts.push({
            name: name.trim(),
            firstName: firstName.trim() || name.trim().split(' ')[0],
            lastName: lastName.trim() || name.trim().split(' ').slice(1).join(' '),
            phone: phone.trim().replace(/\D/g, ''),
            company: company.trim(),
            customField: customField.trim()
        });

        console.log(`✅ ${name} נוסף לרשימה\n`);
    }

    if (contacts.length === 0) {
        console.log('❌ לא נוספו אנשי קשר');
        return;
    }

    // שמירת הרשימה
    const fileName = `${listName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(contacts, null, 2));

    console.log(`\n✅ רשימה נשמרה ב-${fileName}`);
    console.log(`   סה"כ ${contacts.length} אנשי קשר`);
}

// פונקציה להוספת אנשי קשר לרשימה קיימת
async function addToExistingList() {
    console.log('\n📝 הוספה לרשימה קיימת\n');

    // הצגת רשימות קיימות
    const jsonFiles = fs.readdirSync('.').filter(f => f.endsWith('.json') && !f.includes('package'));

    if (jsonFiles.length === 0) {
        console.log('❌ לא נמצאו רשימות קיימות');
        return;
    }

    console.log('רשימות זמינות:');
    jsonFiles.forEach((file, i) => {
        console.log(`${i + 1}. ${file}`);
    });

    const choice = await question('\nבחר מספר רשימה: ');
    const selectedFile = jsonFiles[parseInt(choice) - 1];

    if (!selectedFile) {
        console.log('❌ בחירה לא תקינה');
        return;
    }

    let contacts = [];
    try {
        contacts = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
    } catch (error) {
        console.log('❌ שגיאה בקריאת הרשימה');
        return;
    }

    console.log(`\n✅ נטענה רשימה עם ${contacts.length} אנשי קשר`);
    console.log('\nהוסף אנשי קשר חדשים (Enter בלי שם לסיום):\n');

    let added = 0;
    while (true) {
        const name = await question('שם מלא: ');
        if (!name.trim()) break;

        const firstName = await question('שם פרטי: ');
        const lastName = await question('שם משפחה: ');
        const phone = await question('מספר טלפון: ');
        const company = await question('חברה: ');
        const customField = await question('שדה מותאם: ');

        contacts.push({
            name: name.trim(),
            firstName: firstName.trim() || name.trim().split(' ')[0],
            lastName: lastName.trim() || name.trim().split(' ').slice(1).join(' '),
            phone: phone.trim().replace(/\D/g, ''),
            company: company.trim(),
            customField: customField.trim()
        });

        added++;
        console.log(`✅ נוסף (${contacts.length} סה"כ)\n`);
    }

    if (added > 0) {
        fs.writeFileSync(selectedFile, JSON.stringify(contacts, null, 2));
        console.log(`\n✅ ${added} אנשי קשר נוספו ל-${selectedFile}`);
    }
}

// פונקציה להצגת רשימה
async function viewList() {
    console.log('\n📋 הצגת רשימה\n');

    const jsonFiles = fs.readdirSync('.').filter(f => f.endsWith('.json') && !f.includes('package'));

    if (jsonFiles.length === 0) {
        console.log('❌ לא נמצאו רשימות');
        return;
    }

    console.log('רשימות זמינות:');
    jsonFiles.forEach((file, i) => {
        console.log(`${i + 1}. ${file}`);
    });

    const choice = await question('\nבחר מספר רשימה: ');
    const selectedFile = jsonFiles[parseInt(choice) - 1];

    if (!selectedFile) {
        console.log('❌ בחירה לא תקינה');
        return;
    }

    let contacts = [];
    try {
        contacts = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
    } catch (error) {
        console.log('❌ שגיאה בקריאת הרשימה');
        return;
    }

    console.log(`\n📋 ${selectedFile} (${contacts.length} אנשי קשר)\n`);
    console.log('='.repeat(70));

    contacts.forEach((contact, i) => {
        console.log(`${i + 1}. ${contact.name}`);
        console.log(`   📱 ${contact.phone}`);
        if (contact.company) console.log(`   🏢 ${contact.company}`);
        if (contact.customField) console.log(`   📌 ${contact.customField}`);
        console.log('');
    });

    console.log('='.repeat(70));
}

// פונקציה לייצוא ל-CSV
async function exportToCSV() {
    console.log('\n💾 ייצוא ל-CSV\n');

    const jsonFiles = fs.readdirSync('.').filter(f => f.endsWith('.json') && !f.includes('package'));

    if (jsonFiles.length === 0) {
        console.log('❌ לא נמצאו רשימות');
        return;
    }

    console.log('רשימות זמינות:');
    jsonFiles.forEach((file, i) => {
        console.log(`${i + 1}. ${file}`);
    });

    const choice = await question('\nבחר מספר רשימה: ');
    const selectedFile = jsonFiles[parseInt(choice) - 1];

    if (!selectedFile) {
        console.log('❌ בחירה לא תקינה');
        return;
    }

    let contacts = [];
    try {
        contacts = JSON.parse(fs.readFileSync(selectedFile, 'utf8'));
    } catch (error) {
        console.log('❌ שגיאה בקריאת הרשימה');
        return;
    }

    // יצירת CSV
    const headers = ['name', 'firstName', 'lastName', 'phone', 'company', 'customField'];
    const csv = [
        headers.join(','),
        ...contacts.map(c => headers.map(h => c[h] || '').join(','))
    ].join('\n');

    const csvFile = selectedFile.replace('.json', '.csv');
    fs.writeFileSync(csvFile, csv);

    console.log(`✅ יוצא ל-${csvFile}`);
}

// תפריט ראשי
async function mainMenu() {
    while (true) {
        console.log('\n' + '='.repeat(50));
        console.log('📱 מנהל רשימות תפוצה ל-WhatsApp');
        console.log('='.repeat(50));
        console.log('1. יצירת רשימה חדשה');
        console.log('2. הוספה לרשימה קיימת');
        console.log('3. הצגת רשימה');
        console.log('4. ייצוא ל-CSV');
        console.log('5. יציאה');
        console.log('='.repeat(50));

        const choice = await question('\nבחר אפשרות (1-5): ');

        switch (choice.trim()) {
            case '1':
                await createNewList();
                break;
            case '2':
                await addToExistingList();
                break;
            case '3':
                await viewList();
                break;
            case '4':
                await exportToCSV();
                break;
            case '5':
                console.log('\n👋 להתראות!\n');
                rl.close();
                return;
            default:
                console.log('❌ בחירה לא תקינה');
        }
    }
}

// הפעלת התוכנית
console.log('🚀 מנהל רשימות תפוצה ל-WhatsApp');
mainMenu().catch(console.error);
