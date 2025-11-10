const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 홈페이지
router.get('/', (req, res) => {
    // 최근 게시글 4개
    const recentPostsQuery = `
        SELECT p.*, u.nickname, 
        GROUP_CONCAT(t.name) as tags
        FROM posts p 
        JOIN users u ON p.author_id = u.id 
        LEFT JOIN post_tags pt ON p.id = pt.post_id 
        LEFT JOIN tags t ON pt.tag_id = t.id 
        GROUP BY p.id 
        ORDER BY p.created_at DESC 
        LIMIT 4
    `;
    
    // 인기 게시글 TOP 5
    const topPostsQuery = `
        SELECT p.id, p.title, p.views, u.nickname
        FROM posts p
        JOIN users u ON p.author_id = u.id
        ORDER BY p.views DESC
        LIMIT 5
    `;
    
    // 최근 댓글 5개
    const recentCommentsQuery = `
        SELECT c.content, c.created_at, u.nickname, p.id as post_id, p.title as post_title
        FROM comments c
        JOIN users u ON c.author_id = u.id
        JOIN posts p ON c.post_id = p.id
        ORDER BY c.created_at DESC
        LIMIT 5
    `;
    
    // 통계 쿼리
    const statsQuery = `
        SELECT 
            (SELECT COUNT(*) FROM posts) as totalPosts,
            (SELECT COUNT(*) FROM comments) as totalComments,
            (SELECT COUNT(*) FROM users) as totalUsers,
            (SELECT COUNT(*) FROM posts WHERE DATE(created_at) = CURDATE()) as todayPosts
    `;
    
    // 모든 쿼리 실행
    db.query(recentPostsQuery, (err1, recentPosts) => {
        db.query(topPostsQuery, (err2, topPosts) => {
            db.query(recentCommentsQuery, (err3, recentComments) => {
                db.query(statsQuery, (err4, stats) => {
                    if (err1 || err2 || err3 || err4) {
                        console.error('조회 오류:', err1 || err2 || err3 || err4);
                        return res.status(500).send('서버 오류');
                    }
                    
                    res.render('index', { 
                        posts: recentPosts,
                        topPosts: topPosts,
                        recentComments: recentComments,
                        stats: stats[0],
                        user: req.session.user || null
                    });
                });
            });
        });
    });
});

module.exports = router;