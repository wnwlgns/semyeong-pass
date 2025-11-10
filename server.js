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

// 헬스체크
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('Server started on port ' + PORT);
});