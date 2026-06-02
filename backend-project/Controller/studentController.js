const { getConnection } = require('../config/db');

// Generate StudentID in STU-XXX format
async function generateStudentID(pool) {
    const [rows] = await pool.execute(
        'SELECT StudentID FROM Student ORDER BY StudentID DESC LIMIT 1'
    );
    let nextNum = 1;
    if (rows.length > 0) {
        const lastId = rows[0].StudentID;
        const num = parseInt(lastId.replace('STU-', ''), 10);
        if (!isNaN(num)) nextNum = num + 1;
    }
    return 'STU-' + String(nextNum).padStart(3, '0');
}

exports.getStudents = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT s.*, p.ParentName, p.Email AS ParentEmail FROM Student s LEFT JOIN Parent p ON s.ParentPhone = p.ParentPhone'
        );
        res.json(rows);
    } catch (err) {
        console.error('Get students error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT s.*, p.ParentName, p.Email AS ParentEmail FROM Student s LEFT JOIN Parent p ON s.ParentPhone = p.ParentPhone WHERE s.StudentID = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'Student not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get student error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.createStudent = async (req, res) => {
    try {
        const { FirstName, LastName, Class, ParentPhone } = req.body;
        if (!FirstName || !LastName || !Class) {
            return res.status(400).json({ message: 'FirstName, LastName, Class are required.' });
        }
        if (FirstName.length > 50 || LastName.length > 50 || Class.length > 20) {
            return res.status(400).json({ message: 'One or more fields exceed maximum length.' });
        }

        const pool = await getConnection();
        const StudentID = await generateStudentID(pool);

        await pool.execute(
            'INSERT INTO Student (StudentID, FirstName, LastName, Class, ParentPhone) VALUES (?, ?, ?, ?, ?)',
            [StudentID, FirstName.trim(), LastName.trim(), Class.trim(), ParentPhone || null]
        );

        res.status(201).json({ message: 'Student created successfully.', StudentID });
    } catch (err) {
        console.error('Create student error:', err);
        if (err.errno === 1062) return res.status(400).json({ message: 'StudentID already exists.' });
        if (err.errno === 1452) return res.status(400).json({ message: 'Parent phone not found. Please register the parent first before assigning them to a student.' });
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const { FirstName, LastName, Class, ParentPhone } = req.body;
        const pool = await getConnection();
        const [result] = await pool.execute(
            'UPDATE Student SET FirstName = ?, LastName = ?, Class = ?, ParentPhone = ? WHERE StudentID = ?',
            [FirstName, LastName, Class, ParentPhone, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        res.json({ message: 'Student updated successfully.' });
    } catch (err) {
        console.error('Update student error:', err);
        if (err.errno === 1452) return res.status(400).json({ message: 'Parent phone not found. Please register the parent first before assigning them to a student.' });
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        const pool = await getConnection();
        const [result] = await pool.execute('DELETE FROM Student WHERE StudentID = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        res.json({ message: 'Student deleted successfully.' });
    } catch (err) {
        console.error('Delete student error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
