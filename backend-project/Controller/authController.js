const { getConnection } = require('../config/db');
const bcrypt = require('bcryptjs');

exports.login = async (req, res) => {
    try {
        const { Username, Password } = req.body;
        if (!Username || !Password) {
            return res.status(400).json({ message: 'Username and Password are required.' });
        }

        const pool = await getConnection();
        const [rows] = await pool.execute('SELECT * FROM Users WHERE Username = ?', [Username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(Password, user.Password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password.' });
        }

        if (user.status === 'disabled') {
            return res.status(403).json({ message: 'Your account has been disabled. Contact an administrator.' });
        }

        req.session.user = {
            id: user.User_ID,
            username: user.Username,
            names: user.Names,
            email: user.Email,
            role: user.role,
            mustChangePassword: !!user.mustChangePassword
        };

        res.json({
            message: 'Login successful',
            user: req.session.user
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logged out successfully.' });
    });
};

exports.me = async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }

    try {
        // Check if user is still active in the database (in case they were disabled)
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT status, mustChangePassword FROM Users WHERE User_ID = ?',
            [req.session.user.id]
        );

        if (rows.length === 0 || rows[0].status === 'disabled') {
            req.session.destroy();
            return res.status(401).json({ message: 'Account disabled or not found.' });
        }

        // Sync mustChangePassword flag from DB
        req.session.user.mustChangePassword = !!rows[0].mustChangePassword;

        res.json({ user: req.session.user });
    } catch (err) {
        console.error('Me endpoint error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.register = async (req, res) => {
    try {
        const { Username, Names, Email, role, securityQuestion, securityAnswer } = req.body;
        if (!Username || !Names || !Email || !role) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (!['admin', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Role must be admin or teacher.' });
        }

        // Use a fixed default password that user must change on first login
        const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'changeme123';
        if (DEFAULT_PASSWORD.length < 8) {
            return res.status(500).json({ message: 'Default password configuration error.' });
        }

        const pool = await getConnection();
        const [existing] = await pool.execute(
            'SELECT * FROM Users WHERE Username = ? OR Email = ?',
            [Username, Email]
        );

        if (existing.length > 0) {
            const field = existing[0].Username === Username ? 'Username' : 'Email';
            return res.status(400).json({ message: `${field} already registered.` });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, salt);

        const [result] = await pool.execute(
            'INSERT INTO Users (Username, Names, Email, Password, role, mustChangePassword, status) VALUES (?, ?, ?, ?, ?, TRUE, \'active\')',
            [Username, Names, Email, hashedPassword, role]
        );

        if (securityQuestion && securityAnswer) {
            const answerSalt = await bcrypt.genSalt(12);
            const hashedAnswer = await bcrypt.hash(securityAnswer.trim().toLowerCase(), answerSalt);
            await pool.execute(
                'INSERT INTO Security (User_ID, Question, Answer) VALUES (?, ?, ?)',
                [result.insertId, securityQuestion.trim(), hashedAnswer]
            );
        }

        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        console.error('Register error:', err);
        if (err.errno === 1062) {
            return res.status(400).json({ message: 'Username or Email already exists.' });
        }
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Old and new passwords are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }

        const pool = await getConnection();
        const [rows] = await pool.execute('SELECT * FROM Users WHERE User_ID = ?', [req.session.user.id]);

        const user = rows[0];
        const isMatch = await bcrypt.compare(oldPassword, user.Password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Old password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.execute('UPDATE Users SET Password = ?, mustChangePassword = FALSE WHERE User_ID = ?', [hashedPassword, req.session.user.id]);

        // Update session
        req.session.user.mustChangePassword = false;

        res.json({ message: 'Password changed successfully.' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getSecurityQuestions = async (req, res) => {
    try {
        const { Username } = req.query;
        if (!Username) return res.status(400).json({ message: 'Username is required.' });

        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT u.User_ID, s.SecurityID, s.Question FROM Users u LEFT JOIN Security s ON u.User_ID = s.User_ID WHERE u.Username = ?',
            [Username]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const questions = rows.filter(r => r.Question !== null).map(r => ({
            SecurityID: r.SecurityID,
            Question: r.Question
        }));

        res.json({ User_ID: rows[0].User_ID, questions });
    } catch (err) {
        console.error('Get security questions error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.verifySecurityAnswer = async (req, res) => {
    try {
        const { User_ID, SecurityID, Answer, newPassword } = req.body;
        if (!User_ID || !SecurityID || !Answer || !newPassword) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters.' });
        }

        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT * FROM Security WHERE SecurityID = ? AND User_ID = ?',
            [SecurityID, User_ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Security question not found.' });
        }

        const stored = rows[0];
        const answerMatch = await bcrypt.compare(Answer.toLowerCase(), stored.Answer);
        if (!answerMatch) {
            return res.status(401).json({ message: 'Incorrect answer.' });
        }

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.execute('UPDATE Users SET Password = ? WHERE User_ID = ?', [hashedPassword, User_ID]);

        res.json({ message: 'Password reset successfully.' });
    } catch (err) {
        console.error('Verify security answer error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.setSecurityQuestions = async (req, res) => {
    try {
        const { questions } = req.body;
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ message: 'At least one security question is required.' });
        }

        const pool = await getConnection();
        await pool.execute('DELETE FROM Security WHERE User_ID = ?', [req.session.user.id]);

        for (const q of questions) {
            const salt = await bcrypt.genSalt(12);
            const hashedAnswer = await bcrypt.hash(q.Answer.toLowerCase(), salt);
            await pool.execute(
                'INSERT INTO Security (User_ID, Question, Answer) VALUES (?, ?, ?)',
                [req.session.user.id, q.Question, hashedAnswer]
            );
        }

        res.json({ message: 'Security questions saved successfully.' });
    } catch (err) {
        console.error('Set security questions error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
