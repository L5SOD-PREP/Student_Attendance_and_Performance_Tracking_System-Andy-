const { getConnection } = require('../config/db');

exports.getParents = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT p.*, (SELECT COUNT(*) FROM Student WHERE ParentPhone = p.ParentPhone) AS ChildrenCount FROM Parent p'
        );
        res.json(rows);
    } catch (err) {
        console.error('Get parents error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getParentById = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT * FROM Parent WHERE ParentPhone = ?',
            [req.params.phone]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Parent not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get parent error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.createParent = async (req, res) => {
    try {
        const { ParentPhone, ParentName, Email } = req.body;
        if (!ParentPhone || !ParentName) {
            return res.status(400).json({ message: 'ParentPhone and ParentName are required.' });
        }
        if (ParentPhone.length > 20) {
            return res.status(400).json({ message: 'Phone number too long.' });
        }

        const pool = await getConnection();
        await pool.execute(
            'INSERT INTO Parent (ParentPhone, ParentName, Email) VALUES (?, ?, ?)',
            [ParentPhone.trim(), ParentName.trim(), Email ? Email.trim() : null]
        );

        res.status(201).json({ message: 'Parent created successfully.' });
    } catch (err) {
        console.error('Create parent error:', err);
        if (err.errno === 1062) return res.status(400).json({ message: 'Parent phone already exists.' });
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateParent = async (req, res) => {
    try {
        const { ParentName, Email } = req.body;
        const pool = await getConnection();
        const [result] = await pool.execute(
            'UPDATE Parent SET ParentName = ?, Email = ? WHERE ParentPhone = ?',
            [ParentName, Email, req.params.phone]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Parent not found.' });
        }
        res.json({ message: 'Parent updated successfully.' });
    } catch (err) {
        console.error('Update parent error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteParent = async (req, res) => {
    try {
        const pool = await getConnection();
        const [result] = await pool.execute('DELETE FROM Parent WHERE ParentPhone = ?', [req.params.phone]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Parent not found.' });
        }
        res.json({ message: 'Parent deleted successfully.' });
    } catch (err) {
        console.error('Delete parent error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
