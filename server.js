const express = require('express');
const path = require('path');
const session = require('express-session');
const db = require('./database/db');
const fs = require('fs'); // 추가

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ uploads 폴더가 생성되었습니다.');
}

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: 'semyeong-pass-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // 24시간
    }
}));

// 라우터 설정
const indexRouter = require('./routes/index');
const boardRouter = require('./routes/board');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');

app.use('/', indexRouter);
app.use('/board', boardRouter);
app.use('/auth', authRouter);
app.use('/user', userRouter);

// 서버 시작

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(' 세명패스 서버 시작!');
    console.log(` 서버 주소: http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════');
});