const mysql = require('mysql2');

// Railway MySQL PUBLIC URL 사용
const DATABASE_URL = process.env.MYSQL_PUBLIC_URL || process.env.DATABASE_URL;

let db;

if (DATABASE_URL) {
    // Railway 배포 환경 - PUBLIC URL 사용
    console.log('🔍 Railway 환경: PUBLIC URL로 연결');
    db = mysql.createConnection(DATABASE_URL);
} else {
    // 로컬 개발 환경
    console.log('🔍 로컬 환경: localhost로 연결');
    db = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'semyeong_pass'
    });
}

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL 연결 실패:', err.message);
        console.error('상세 오류:', err);
        return;
    }
    console.log('✅ MySQL 데이터베이스 연결 성공!');
});

db.on('error', (err) => {
    console.error('❌ MySQL 오류:', err);
});

module.exports = db;
