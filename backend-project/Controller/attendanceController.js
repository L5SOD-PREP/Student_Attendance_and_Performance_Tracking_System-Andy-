const { getConnection } = require('../config/db');

exports.getAttendance = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            `SELECT a.*, s.FirstName, s.LastName, s.Class, u.Names AS RecordedByName
             FROM Attendance a
             JOIN Student s ON a.StudentID = s.StudentID
             JOIN Users u ON a.RecordedBy = u.User_ID
             ORDER BY a.Date DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Get attendance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getAttendanceByStudent = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT * FROM Attendance WHERE StudentID = ? ORDER BY Date DESC',
            [req.params.studentId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get attendance by student error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.recordAttendance = async (req, res) => {
    try {
        const { records } = req.body;
        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'Attendance records array is required.' });
        }

        const pool = await getConnection();
        const userId = req.session.user.id;
        const userRole = req.session.user.role;
        const today = new Date().toISOString().split('T')[0];

        for (const r of records) {
            if (!r.StudentID || !r.Date || !r.Status) {
                return res.status(400).json({ message: 'Each record needs StudentID, Date, Status.' });
            }
            if (!['Present', 'Absent'].includes(r.Status)) {
                return res.status(400).json({ message: 'Status must be Present or Absent.' });
            }
            if (r.Date > today) {
                return res.status(400).json({ message: 'Attendance date cannot be in the future.' });
            }
            // Teachers can only record for today's date
            if (userRole === 'teacher' && r.Date !== today) {
                return res.status(403).json({ message: 'Teachers can only record attendance for today\'s date.' });
            }

            const [existing] = await pool.execute(
                'SELECT AttendanceID FROM Attendance WHERE StudentID = ? AND Date = ?',
                [r.StudentID, r.Date]
            );
            if (existing.length > 0) {
                return res.status(409).json({ message: `Attendance already exists for student ${r.StudentID} on ${r.Date}.` });
            }

            await pool.execute(
                'INSERT INTO Attendance (StudentID, Date, Status, RecordedBy) VALUES (?, ?, ?, ?)',
                [r.StudentID, r.Date, r.Status, userId]
            );
        }

        res.status(201).json({ message: `${records.length} attendance records saved.` });
    } catch (err) {
        console.error('Record attendance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateAttendance = async (req, res) => {
    try {
        const { Status } = req.body;
        if (!Status || !['Present', 'Absent'].includes(Status)) {
            return res.status(400).json({ message: 'Status must be Present or Absent.' });
        }

        const pool = await getConnection();
        const result = await pool.execute(
            'UPDATE Attendance SET Status = ?, RecordedBy = ? WHERE AttendanceID = ?',
            [Status, req.session.user.id, req.params.id]
        );
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Attendance record not found.' });
        }
        res.json({ message: 'Attendance updated.' });
    } catch (err) {
        console.error('Update attendance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteAttendance = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.execute('DELETE FROM Attendance WHERE AttendanceID = ?', [req.params.id]);
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Attendance record not found.' });
        }
        res.json({ message: 'Attendance record deleted.' });
    } catch (err) {
        console.error('Delete attendance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getAttendanceSummary = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT s.StudentID, s.FirstName, s.LastName, s.Class,
                   COUNT(a.AttendanceID) AS TotalDays,
                   SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) AS PresentDays,
                   SUM(CASE WHEN a.Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentDays
            FROM Student s
            LEFT JOIN Attendance a ON s.StudentID = a.StudentID
            GROUP BY s.StudentID, s.FirstName, s.LastName, s.Class
            ORDER BY s.Class, s.LastName
        `);
        res.json(rows);
    } catch (err) {
        console.error('Attendance summary error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
