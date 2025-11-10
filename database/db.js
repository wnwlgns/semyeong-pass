const mysql = require('mysql2');

// Railway MySQL 환경변수 확인
const dbConfig = {
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port: process.env.MYSQLPORT || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'semyeong_pass',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('🔍 DB 연결 시도 중...');
console.log('Host:', dbConfig.host);
console.log('Port:', dbConfig.port);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
    if (err) {
        console.error('❌ MySQL 연결 실패:', err.message);
        console.error('상세 오류:', err);
        return;
    }
    console.log('✅ MySQL 데이터베이스 연결 성공!');
});

// 연결 끊김 처리
db.on('error', (err) => {
    console.error('❌ MySQL 오류:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 데이터베이스 재연결 시도...');
    }
});

module.exports = db;