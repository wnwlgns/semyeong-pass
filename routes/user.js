const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 마이페이지
router.get('/mypage', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    const userId = req.session.user.id;
    
    // 사용자 정보 조회
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, userResults) => {
        if (err || userResults.length === 0) {
            return res.status(404).send('사용자를 찾을 수 없습니다.');
        }
        
        // 내가 쓴 글 조회
        const query = `
            SELECT p.*, 
            GROUP_CONCAT(t.name) as tags
            FROM posts p 
            LEFT JOIN post_tags pt ON p.id = pt.post_id 
            LEFT JOIN tags t ON pt.tag_id = t.id 
            WHERE p.author_id = ?
            GROUP BY p.id 
            ORDER BY p.created_at DESC
        `;
        
        db.query(query, [userId], (err2, postsResults) => {
            if (err2) {
                console.error('게시글 조회 오류:', err2);
                return res.status(500).send('서버 오류');
            }
            
            res.render('mypage', { 
                user: req.session.user,
                userInfo: userResults[0],
                myPosts: postsResults
            });
        });
    });
});

module.exports = router;