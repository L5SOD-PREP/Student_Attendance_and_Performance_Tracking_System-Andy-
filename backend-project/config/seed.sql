-- ============================================================
-- SAPTS - Seed Users
-- Password for all users: password123
-- Security answer for all users: answer123
-- Hashed using bcrypt (salt rounds: 12)
-- ============================================================

USE SAPTS;

INSERT INTO Users (Username, Names, Email, Password, role, mustChangePassword, status) VALUES
('admin',    'Admin User',      'admin@school.com',    '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy', 'admin',   FALSE, 'active'),
('teacher',  'John Teacher',    'teacher@school.com',  '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy', 'teacher', FALSE, 'active'),
('msamson',  'Mukase Samson',   'msamson@school.com',  '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy', 'teacher', FALSE, 'active'),
('akamanzi', 'Alice Kamanzi',   'akamanzi@school.com', '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy', 'teacher', FALSE, 'active'),
('butera',   'David Butera',    'dbutera@school.com',  '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy', 'teacher', FALSE, 'active')
ON DUPLICATE KEY UPDATE Username = Username;

INSERT INTO Security (UserID, Question, Answer)
SELECT u.UserID, 'What is your favorite book?', '$2a$12$N.QaSQX6WvP0hCTMnvlOoeOvk/y0HLbWLjCqJ04Fso2vlIDiT5yHy'
FROM Users u
WHERE u.Username IN ('admin','teacher','msamson','akamanzi','butera')
ON DUPLICATE KEY UPDATE Question = VALUES(Question), Answer = VALUES(Answer);
