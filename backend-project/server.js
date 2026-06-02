const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./Routes/authRoutes');
const studentRoutes = require('./Routes/studentRoutes');
const attendanceRoutes = require('./Routes/attendanceRoutes');
const examRoutes = require('./Routes/examRoutes');
const parentRoutes = require('./Routes/parentRoutes');
const reportRoutes = require('./Routes/reportRoutes');
const userRoutes = require('./Routes/userRoutes');

const app = express();

const isProd = process.env.NODE_ENV === 'production';

app.use(helmet());
app.use(morgan('dev'));

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { message: 'Too many requests, please try again later.' }
});
app.use('/api/auth/login', limiter);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProd,
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
    res.json({ message: 'SAPTS API is running' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`SAPTS server running on port ${PORT} (${isProd ? 'production' : 'development'})`);
});
