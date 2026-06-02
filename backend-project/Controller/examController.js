const { getConnection } = require('../config/db');

exports.getExams = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            `SELECT e.*, s.FirstName, s.LastName, s.Class, u.Names AS RecordedByName
             FROM Exam e
             JOIN Student s ON e.StudentID = s.StudentID
             JOIN Users u ON e.RecordedBy = u.User_ID
             ORDER BY e.ExamDate DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('Get exams error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getExamsByStudent = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(
            'SELECT * FROM Exam WHERE StudentID = ? ORDER BY ExamDate DESC',
            [req.params.studentId]
        );
        res.json(rows);
    } catch (err) {
        console.error('Get exams by student error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.createExam = async (req, res) => {
    try {
        const { StudentID, Subject, Score, MaxScore, ExamDate } = req.body;
        if (!StudentID || !Subject || Score === undefined || !MaxScore || !ExamDate) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        const scoreNum = Number(Score);
        const maxScoreNum = Number(MaxScore);
        if (isNaN(scoreNum) || scoreNum < 0) {
            return res.status(400).json({ message: 'Score must be a non-negative number.' });
        }
        if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
            return res.status(400).json({ message: 'MaxScore must be a positive number.' });
        }
        if (scoreNum > maxScoreNum) {
            return res.status(400).json({ message: 'Score cannot exceed MaxScore.' });
        }

        const pool = await getConnection();
        const [student] = await pool.execute('SELECT StudentID FROM Student WHERE StudentID = ?', [StudentID]);
        if (student.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        await pool.execute(
            'INSERT INTO Exam (StudentID, Subject, Score, MaxScore, ExamDate, RecordedBy) VALUES (?, ?, ?, ?, ?, ?)',
            [StudentID, Subject.trim(), scoreNum, maxScoreNum, ExamDate, req.session.user.id]
        );

        res.status(201).json({ message: 'Exam record created.' });
    } catch (err) {
        console.error('Create exam error:', err);
        if (err.errno === 1062) return res.status(409).json({ message: 'Duplicate exam record for this student, subject, and date.' });
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateExam = async (req, res) => {
    try {
        const { Subject, Score, MaxScore, ExamDate } = req.body;
        const scoreNum = Number(Score);
        const maxScoreNum = Number(MaxScore);
        if (isNaN(scoreNum) || scoreNum < 0) {
            return res.status(400).json({ message: 'Score must be a non-negative number.' });
        }
        if (isNaN(maxScoreNum) || maxScoreNum <= 0) {
            return res.status(400).json({ message: 'MaxScore must be a positive number.' });
        }
        if (scoreNum > maxScoreNum) {
            return res.status(400).json({ message: 'Score cannot exceed MaxScore.' });
        }

        const pool = await getConnection();
        const [result] = await pool.execute(
            'UPDATE Exam SET Subject = ?, Score = ?, MaxScore = ?, ExamDate = ?, RecordedBy = ? WHERE ExamID = ?',
            [Subject.trim(), scoreNum, maxScoreNum, ExamDate, req.session.user.id, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Exam record not found.' });
        }
        res.json({ message: 'Exam record updated.' });
    } catch (err) {
        console.error('Update exam error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteExam = async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.execute('DELETE FROM Exam WHERE ExamID = ?', [req.params.id]);
        if (result[0].affectedRows === 0) {
            return res.status(404).json({ message: 'Exam record not found.' });
        }
        res.json({ message: 'Exam record deleted.' });
    } catch (err) {
        console.error('Delete exam error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
