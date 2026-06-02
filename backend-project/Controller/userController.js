const { getConnection } = require('../config/db');

exports.getUsers = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            "SELECT User_ID, Username, Names, Email, role, status FROM Users ORDER BY role, Names"
        );
        res.json(rows);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT User_ID, Username, Names, Email, role, status FROM Users WHERE User_ID = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { Names, Email, role } = req.body;
        if (!Names || !Email || !role) {
            return res.status(400).json({ message: 'Names, Email, and role are required.' });
        }
        if (!['admin', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Role must be admin or teacher.' });
        }
        const pool = await getConnection();
        const [result] = await pool.execute(
            'UPDATE Users SET Names = ?, Email = ?, role = ? WHERE User_ID = ?',
            [Names.trim(), Email.trim(), role, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User updated successfully.' });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const pool = await getConnection();
        const [result] = await pool.execute('DELETE FROM Users WHERE User_ID = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: 'User deleted.' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.toggleUserStatus = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT status FROM Users WHERE User_ID = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'User not found.' });

        const newStatus = rows[0].status === 'active' ? 'disabled' : 'active';
        await pool.execute(
            'UPDATE Users SET status = ? WHERE User_ID = ?',
            [newStatus, req.params.id]
        );

        res.json({ message: `User ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully.`, status: newStatus });
    } catch (err) {
        console.error('Toggle user status error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
