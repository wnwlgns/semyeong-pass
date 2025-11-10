const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./database/db');
const fs = require('fs');

const app = express();

// uploads 폴더 자동 생성
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ uploads 폴더가 생성되었습니다.');
}

// 미들웨어 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'semyeong-pass-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// 라우트
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/board', require('./routes/board'));
app.use('/user', require('./routes/user'));

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log('🚀 세명패스 서버 시작!');
    console.log(`📡 서버 주소: http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════');
});