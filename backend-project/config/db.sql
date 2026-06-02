-- ============================================================
-- SAPTS - Student Attendance and Performance Tracking System
-- Database: SAPTS (MySQL / MariaDB)
-- ============================================================

CREATE DATABASE IF NOT EXISTS SAPTS;
USE SAPTS;

-- ============================================================
-- TABLE: Users
-- Stores system users (Admin & Teachers)
-- Username used for session-based login
-- ============================================================
CREATE TABLE Users (
    User_ID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    Names VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher')),
    mustChangePassword BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: Parent
-- Stores parent/guardian contact information
-- ============================================================
CREATE TABLE Parent (
    ParentPhone VARCHAR(20) PRIMARY KEY,
    ParentName VARCHAR(100) NOT NULL,
    Email VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: Student
-- Stores student personal and academic info
-- ============================================================
CREATE TABLE Student (
    StudentID VARCHAR(20) PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Class VARCHAR(20) NOT NULL,
    ParentPhone VARCHAR(20),
    CONSTRAINT FK_Student_Parent FOREIGN KEY (ParentPhone)
        REFERENCES Parent(ParentPhone)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_student_class ON Student(Class);

-- ============================================================
-- TABLE: Attendance
-- Records daily student attendance
-- RecordedBy links to the user (teacher/admin) who recorded it
-- ============================================================
CREATE TABLE Attendance (
    AttendanceID INT AUTO_INCREMENT PRIMARY KEY,
    Date DATE NOT NULL,
    Status VARCHAR(10) NOT NULL CHECK (Status IN ('Present', 'Absent')),
    StudentID VARCHAR(20) NOT NULL,
    RecordedBy INT NOT NULL,
    CONSTRAINT FK_Attendance_Student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT FK_Attendance_User FOREIGN KEY (RecordedBy)
        REFERENCES Users(User_ID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT UQ_Attendance_StudentDate UNIQUE (StudentID, Date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_attendance_date ON Attendance(Date);
CREATE INDEX idx_attendance_student ON Attendance(StudentID);

-- ============================================================
-- TABLE: Exam
-- Stores exam scores for each student
-- RecordedBy links to the user (teacher/admin) who entered it
-- ============================================================
CREATE TABLE Exam (
    ExamID INT AUTO_INCREMENT PRIMARY KEY,
    Subject VARCHAR(100) NOT NULL,
    Score DECIMAL(5,2) NOT NULL CHECK (Score >= 0),
    MaxScore DECIMAL(5,2) NOT NULL CHECK (MaxScore > 0),
    ExamDate DATE NOT NULL,
    StudentID VARCHAR(20) NOT NULL,
    RecordedBy INT NOT NULL,
    CONSTRAINT CK_Exam_ScoreRange CHECK (Score <= MaxScore),
    CONSTRAINT FK_Exam_Student FOREIGN KEY (StudentID)
        REFERENCES Student(StudentID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT FK_Exam_User FOREIGN KEY (RecordedBy)
        REFERENCES Users(User_ID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT UQ_Exam_StudentSubjectDate UNIQUE (StudentID, Subject, ExamDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_exam_student ON Exam(StudentID);
CREATE INDEX idx_exam_subject ON Exam(Subject);
CREATE INDEX idx_exam_date ON Exam(ExamDate);

-- ============================================================
-- TABLE: Security
-- Stores security questions/answers for password
-- recovery (linked to Users)
-- ============================================================
CREATE TABLE Security (
    SecurityID INT AUTO_INCREMENT PRIMARY KEY,
    User_ID INT NOT NULL,
    Question VARCHAR(255) NOT NULL,
    Answer VARCHAR(255) NOT NULL,
    CONSTRAINT FK_Security_Users FOREIGN KEY (User_ID)
        REFERENCES Users(User_ID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- RELATIONSHIPS & CARDINALITIES (for ER Diagram)
-- ============================================================
/*
  ┌──────────────────────────────────────────────────────────────┐
  │  ENTITY        │  RELATIONSHIP       │  ENTITY              │
  ├──────────────────────────────────────────────────────────────┤
  │  Parent   (1)  │─── has ─────────────│  Student    (N)      │
  │  Student  (1)  │─── records ─────────│  Attendance (N)      │
  │  Student  (1)  │─── takes ───────────│  Exam       (N)      │
  │  Users    (1)  │─── recorded_by ─────│  Attendance (N)      │
  │  Users    (1)  │─── recorded_by ─────│  Exam       (N)      │
  │  Users    (1)  │─── sets ────────────│  Security   (N)      │
  └──────────────────────────────────────────────────────────────┘

  DETAILED CARDINALITIES:

  1. Parent ──── Student
     - One Parent can have MANY Students (1:N)
     - Each Student has exactly ONE Parent (if assigned)
     - Foreign Key: Student.ParentPhone → Parent.ParentPhone

  2. Student ──── Attendance
     - One Student can have MANY Attendance records (1:N)
     - Each Attendance record belongs to exactly ONE Student
     - Foreign Key: Attendance.StudentID → Student.StudentID

  3. Student ──── Exam
     - One Student can have MANY Exam records (1:N)
     - Each Exam record belongs to exactly ONE Student
     - Foreign Key: Exam.StudentID → Student.StudentID

  4. Users ──── Attendance (RecordedBy)
     - One User can record MANY Attendance entries (1:N)
     - Each Attendance record is recorded by exactly ONE User
     - Foreign Key: Attendance.RecordedBy → Users.User_ID

  5. Users ──── Exam (RecordedBy)
     - One User can record MANY Exam entries (1:N)
     - Each Exam record is entered by exactly ONE User
     - Foreign Key: Exam.RecordedBy → Users.User_ID

  6. Users ──── Security
     - One User can have MANY Security questions (1:N)
     - Each Security record belongs to exactly ONE User
     - Foreign Key: Security.User_ID → Users.User_ID
*/
