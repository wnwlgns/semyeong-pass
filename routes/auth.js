const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 로그인 페이지
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null, user: null });
});

// 로그인 처리
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('로그인 오류:', err);
            return res.render('login', { error: '서버 오류가 발생했습니다.', user: null });
        }
        
        if (results.length === 0) {
            return res.render('login', { error: '아이디 또는 비밀번호가 올바르지 않습니다.', user: null });
        }
        
        const user = results[0];
        
        // 간단한 비밀번호 체크
        if (password === user.password) {
            req.session.user = {
                id: user.id,
                username: user.username,
                nickname: user.nickname
            };
            
            console.log('✅ 로그인 성공:', user.username);
            res.redirect('/');
        } else {
            res.render('login', { error: '아이디 또는 비밀번호가 올바르지 않습니다.', user: null });
        }
    });
});

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// 회원가입 페이지
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { error: null, user: null });
});

// 회원가입 처리
router.post('/register', (req, res) => {
    const { username, password, password_confirm, nickname, email, school, grade } = req.body;
    
    // 비밀번호 확인
    if (password !== password_confirm) {
        return res.render('register', { error: '비밀번호가 일치하지 않습니다.', user: null });
    }
    
    // 아이디 중복 확인
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error('회원가입 오류:', err);
            return res.render('register', { error: '서버 오류가 발생했습니다.', user: null });
        }
        
        if (results.length > 0) {
            return res.render('register', { error: '이미 사용 중인 아이디입니다.', user: null });
        }
        
        // 회원가입
        db.query(
            'INSERT INTO users (username, password, nickname, email, school, grade) VALUES (?, ?, ?, ?, ?, ?)',
            [username, password, nickname, email, school, grade],
            (err2, result) => {
                if (err2) {
                    console.error('회원가입 저장 오류:', err2);
                    return res.render('register', { error: '회원가입 중 오류가 발생했습니다.', user: null });
                }
                
                console.log('✅ 회원가입 성공:', username);
                
                // 자동 로그인
                req.session.user = {
                    id: result.insertId,
                    username: username,
                    nickname: nickname
                };
                
                res.redirect('/');
            }
        );
    });
});

module.exports = router;