const { getConnection } = require('../config/db');

exports.getStudentReport = async (req, res) => {
    try {
        const { studentId } = req.params;
        const pool = await getConnection();

        const [studentRows] = await pool.execute(
            'SELECT s.*, p.ParentName, p.Email AS ParentEmail FROM Student s LEFT JOIN Parent p ON s.ParentPhone = p.ParentPhone WHERE s.StudentID = ?',
            [studentId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const [exams] = await pool.execute(
            'SELECT * FROM Exam WHERE StudentID = ? ORDER BY ExamDate',
            [studentId]
        );

        const [attendanceRows] = await pool.execute(
            `SELECT 
                COUNT(*) AS TotalDays,
                SUM(CASE WHEN Status = 'Present' THEN 1 ELSE 0 END) AS PresentDays,
                SUM(CASE WHEN Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentDays
            FROM Attendance WHERE StudentID = ?`,
            [studentId]
        );

        const [subjectAverages] = await pool.execute(
            `SELECT Subject, AVG(Score * 100.0 / MaxScore) AS AveragePercentage,
                    SUM(Score) AS TotalScore, SUM(MaxScore) AS TotalMaxScore
            FROM Exam WHERE StudentID = ? GROUP BY Subject`,
            [studentId]
        );

        res.json({
            student: studentRows[0],
            exams,
            attendance: attendanceRows[0],
            subjectAverages
        });
    } catch (err) {
        console.error('Get student report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getClassPerformance = async (req, res) => {
    try {
        const { className } = req.params;
        const pool = await getConnection();

        const [rows] = await pool.execute(
            `SELECT s.StudentID, s.FirstName, s.LastName,
                    AVG(e.Score * 100.0 / e.MaxScore) AS OverallAverage,
                    SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.AttendanceID) AS AttendancePercentage
            FROM Student s
            LEFT JOIN Exam e ON s.StudentID = e.StudentID
            LEFT JOIN Attendance a ON s.StudentID = a.StudentID
            WHERE s.Class = ?
            GROUP BY s.StudentID, s.FirstName, s.LastName
            ORDER BY OverallAverage DESC`,
            [className]
        );

        res.json(rows);
    } catch (err) {
        console.error('Get class performance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getOverallSummary = async (req, res) => {
    try {
        const pool = await getConnection();

        const [totalStudents] = await pool.execute('SELECT COUNT(*) AS Total FROM Student');
        const [totalTeachers] = await pool.execute("SELECT COUNT(*) AS Total FROM Users WHERE role = 'teacher'");
        const [todayAttendance] = await pool.execute(
            `SELECT 
                COUNT(*) AS Total,
                SUM(CASE WHEN Status = 'Present' THEN 1 ELSE 0 END) AS Present,
                SUM(CASE WHEN Status = 'Absent' THEN 1 ELSE 0 END) AS Absent
            FROM Attendance WHERE Date = CURDATE()`
        );
        const [classCounts] = await pool.execute(
            'SELECT Class, COUNT(*) AS Count FROM Student GROUP BY Class'
        );

        res.json({
            totalStudents: totalStudents[0].Total,
            totalTeachers: totalTeachers[0].Total,
            todayAttendance: todayAttendance[0],
            classCounts
        });
    } catch (err) {
        console.error('Get overall summary error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.exportStudentReportCSV = async (req, res) => {
    try {
        const { studentId } = req.params;
        const pool = await getConnection();

        const [studentRows] = await pool.execute(
            'SELECT s.*, p.ParentName, p.Email AS ParentEmail FROM Student s LEFT JOIN Parent p ON s.ParentPhone = p.ParentPhone WHERE s.StudentID = ?',
            [studentId]
        );
        if (studentRows.length === 0) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        const [exams] = await pool.execute(
            'SELECT Subject, Score, MaxScore, ExamDate FROM Exam WHERE StudentID = ? ORDER BY ExamDate',
            [studentId]
        );

        const [attendanceRows] = await pool.execute(
            `SELECT COUNT(*) AS TotalDays,
                    SUM(CASE WHEN Status = 'Present' THEN 1 ELSE 0 END) AS PresentDays,
                    SUM(CASE WHEN Status = 'Absent' THEN 1 ELSE 0 END) AS AbsentDays
             FROM Attendance WHERE StudentID = ?`,
            [studentId]
        );

        const student = studentRows[0];
        const att = attendanceRows[0];
        let csv = 'Student Report,' + student.FirstName + ' ' + student.LastName + ',Class,' + student.Class + '\n';
        csv += 'Attendance,Total,' + (att.TotalDays || 0) + ',Present,' + (att.PresentDays || 0) + ',Absent,' + (att.AbsentDays || 0) + '\n\n';
        csv += 'Subject,Score,MaxScore,Percentage,Date\n';
        for (const e of exams) {
            const pct = ((e.Score / e.MaxScore) * 100).toFixed(1);
            csv += e.Subject + ',' + e.Score + ',' + e.MaxScore + ',' + pct + '%,' + e.ExamDate + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="report_' + studentId + '.csv"');
        res.send(csv);
    } catch (err) {
        console.error('Export CSV error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getParentNotificationSummary = async (req, res) => {
    try {
        const pool = await getConnection();
        const [rows] = await pool.execute(`
            SELECT 
                p.ParentName,
                p.ParentPhone,
                p.Email AS ParentEmail,
                s.StudentID,
                s.FirstName,
                s.LastName,
                s.Class,
                COALESCE(
                    ROUND(
                        SUM(CASE WHEN a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0 / 
                        NULLIF(COUNT(a.AttendanceID), 0), 1
                    ), 0
                ) AS AttendancePercentage,
                COALESCE(
                    ROUND(
                        AVG(e.Score * 100.0 / e.MaxScore), 1
                    ), 0
                ) AS AverageScore
            FROM Parent p
            JOIN Student s ON p.ParentPhone = s.ParentPhone
            LEFT JOIN Attendance a ON s.StudentID = a.StudentID
            LEFT JOIN Exam e ON s.StudentID = e.StudentID
            GROUP BY p.ParentName, p.ParentPhone, p.Email, s.StudentID, s.FirstName, s.LastName, s.Class
            ORDER BY p.ParentName, s.LastName
        `);
        res.json(rows);
    } catch (err) {
        console.error('Get parent notification summary error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
