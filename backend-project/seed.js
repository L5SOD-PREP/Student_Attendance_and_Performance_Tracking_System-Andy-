const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'SAPTS',
    });

    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash('password123', salt);
    const answerHash = await bcrypt.hash('answer123', salt);

    const users = [
        { Username: 'admin', Names: 'Admin User', Email: 'admin@school.com', Password: password, role: 'admin', mustChangePassword: false, status: 'active', Question: 'What is your favorite book?', Answer: answerHash },
        { Username: 'teacher', Names: 'John Teacher', Email: 'teacher@school.com', Password: password, role: 'teacher', mustChangePassword: false, status: 'active', Question: 'What is your favorite book?', Answer: answerHash },
        { Username: 'msamson', Names: 'Mukase Samson', Email: 'msamson@school.com', Password: password, role: 'teacher', mustChangePassword: false, status: 'active', Question: 'What is your favorite book?', Answer: answerHash },
        { Username: 'akamanzi', Names: 'Alice Kamanzi', Email: 'akamanzi@school.com', Password: password, role: 'teacher', mustChangePassword: false, status: 'active', Question: 'What is your favorite book?', Answer: answerHash },
        { Username: 'butera', Names: 'David Butera', Email: 'dbutera@school.com', Password: password, role: 'teacher', mustChangePassword: false, status: 'active', Question: 'What is your favorite book?', Answer: answerHash },
    ];

    for (const u of users) {
        try {
            await connection.execute(
                'INSERT INTO Users (Username, Names, Email, Password, role, mustChangePassword, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [u.Username, u.Names, u.Email, u.Password, u.role, u.mustChangePassword, u.status]
            );
            const [rows] = await connection.execute('SELECT UserID FROM Users WHERE Username = ?', [u.Username]);
            if (rows.length > 0) {
                await connection.execute(
                    'INSERT INTO Security (UserID, Question, Answer) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE Question = VALUES(Question), Answer = VALUES(Answer)',
                    [rows[0].UserID, u.Question, u.Answer]
                );
            }
            console.log(`  ✓ Created: ${u.Username} (${u.role})`);
        } catch (err) {
            if (err.errno === 1062) {
                console.log(`  - Skipped: ${u.Username} (already exists)`);
            } else {
                console.error(`  ✗ Error creating ${u.Username}:`, err.message);
            }
        }
    }

    await connection.end();
    console.log('\n✅ Seed complete. All users have password: password123');
}

seed().catch(console.error);
