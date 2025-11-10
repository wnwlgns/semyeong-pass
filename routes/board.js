const express = require('express');
const router = express.Router();
const db = require('../database/db');
const multer = require('multer');
const path = require('path');

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

// 파일 필터 함수
const fileFilter = (req, file, cb) => {
    // 이미지 파일
    if (file.fieldname === 'image') {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'), false);
        }
    }
    // 일반 파일
    else if (file.fieldname === 'file') {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB 제한
});

// 게시판 목록 (검색 + 정렬 기능 포함)
router.get('/', (req, res) => {
    const tag = req.query.tag || 'all';
    const search = req.query.search || '';
    const sort = req.query.sort || 'latest'; // 정렬 옵션 추가
    
    let query = `
        SELECT p.*, u.nickname, 
        GROUP_CONCAT(DISTINCT t.name) as tags,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count
        FROM posts p 
        JOIN users u ON p.author_id = u.id 
        LEFT JOIN post_tags pt ON p.id = pt.post_id 
        LEFT JOIN tags t ON pt.tag_id = t.id 
    `;
    
    let whereConditions = [];
    let params = [];
    
    // 태그 필터
    if (tag !== 'all') {
        whereConditions.push('t.name = ?');
        params.push(tag);
    }
    
    // 검색어 필터
    if (search) {
        whereConditions.push('(p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ` GROUP BY p.id`;
    
    // 정렬
    switch(sort) {
        case 'views':
            query += ' ORDER BY p.views DESC';
            break;
        case 'likes':
            query += ' ORDER BY like_count DESC';
            break;
        case 'comments':
            query += ' ORDER BY comment_count DESC';
            break;
        default:
            query += ' ORDER BY p.created_at DESC';
    }
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('게시글 조회 오류:', err);
            return res.status(500).send('서버 오류');
        }
        
        db.query('SELECT * FROM tags', (err2, tags) => {
            if (err2) {
                console.error('태그 조회 오류:', err2);
                return res.status(500).send('서버 오류');
            }
            
            res.render('board', { 
                posts: results,
                currentTag: tag,
                search: search,
                sort: sort,
                tags: tags,
                user: req.session.user || null
            });
        });
    });
});

// 게시글 상세보기 (댓글, 좋아요 포함)
router.get('/view/:id', (req, res) => {
    const postId = req.params.id;
    
    // 조회수 증가
    db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
    
    // 게시글 정보 조회
    const query = `
        SELECT p.*, u.nickname, 
        GROUP_CONCAT(DISTINCT t.name) as tags
        FROM posts p 
        JOIN users u ON p.author_id = u.id 
        LEFT JOIN post_tags pt ON p.id = pt.post_id 
        LEFT JOIN tags t ON pt.tag_id = t.id 
        WHERE p.id = ?
        GROUP BY p.id
    `;
    
    db.query(query, [postId], (err, results) => {
        if (err || results.length === 0) {
            console.error('게시글 조회 오류:', err);
            return res.status(404).send('게시글을 찾을 수 없습니다.');
        }
        
        // 댓글 조회
        const commentQuery = `
            SELECT c.*, u.nickname 
            FROM comments c 
            JOIN users u ON c.author_id = u.id 
            WHERE c.post_id = ? 
            ORDER BY c.created_at ASC
        `;
        
        db.query(commentQuery, [postId], (err2, comments) => {
            if (err2) {
                console.error('댓글 조회 오류:', err2);
                comments = [];
            }
            
            // 좋아요 수 조회
            db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId], (err3, likeResults) => {
                const likeCount = likeResults ? likeResults[0].count : 0;
                
                // 현재 사용자가 좋아요를 눌렀는지 확인
                if (req.session.user) {
                    db.query('SELECT * FROM likes WHERE post_id = ? AND user_id = ?', 
                        [postId, req.session.user.id], (err4, userLikeResults) => {
                        const userLiked = userLikeResults.length > 0;
                        
                        res.render('view', { 
                            post: results[0],
                            comments: comments,
                            likeCount: likeCount,
                            userLiked: userLiked,
                            user: req.session.user
                        });
                    });
                } else {
                    res.render('view', { 
                        post: results[0],
                        comments: comments,
                        likeCount: likeCount,
                        userLiked: false,
                        user: null
                    });
                }
            });
        });
    });
});

// 글쓰기 페이지
router.get('/write', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    // 모든 태그 가져오기
    db.query('SELECT * FROM tags', (err, tags) => {
        if (err) {
            console.error('태그 조회 오류:', err);
            return res.status(500).send('서버 오류');
        }
        
        res.render('write', { 
            user: req.session.user,
            tags: tags
        });
    });
});

// 글쓰기 처리 (이미지 + 파일 업로드)
router.post('/write', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    
    const { title, content, tags } = req.body;
    const filename = req.files && req.files['file'] ? req.files['file'][0].filename : null;
    const original_filename = req.files && req.files['file'] ? req.files['file'][0].originalname : null;
    const image_filename = req.files && req.files['image'] ? req.files['image'][0].filename : null;
    const authorId = req.session.user.id;
    
    // 게시글 저장
    db.query(
        'INSERT INTO posts (title, content, author_id, filename, original_filename, image_filename) VALUES (?, ?, ?, ?, ?, ?)',
        [title, content, authorId, filename, original_filename, image_filename],
        (err, result) => {
            if (err) {
                console.error('게시글 저장 오류:', err);
                return res.status(500).send('서버 오류');
            }
            
            const postId = result.insertId;
            
            // 태그 저장
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : [tags];
                
                tagArray.forEach(tagName => {
                    db.query('SELECT id FROM tags WHERE name = ?', [tagName], (err, tagResults) => {
                        if (err) return;
                        
                        if (tagResults.length > 0) {
                            db.query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', 
                                [postId, tagResults[0].id]);
                        }
                    });
                });
            }
            
            console.log(' 게시글 작성 성공 (이미지:', image_filename, ')');
            res.redirect('/board/view/' + postId);
        }
    );
});

// 게시글 수정 페이지
router.get('/edit/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    const postId = req.params.id;
    const userId = req.session.user.id;
    
    // 게시글 정보 조회
    const query = `
        SELECT p.*, GROUP_CONCAT(t.name) as tags
        FROM posts p 
        LEFT JOIN post_tags pt ON p.id = pt.post_id 
        LEFT JOIN tags t ON pt.tag_id = t.id 
        WHERE p.id = ? AND p.author_id = ?
        GROUP BY p.id
    `;
    
    db.query(query, [postId, userId], (err, postResults) => {
        if (err || postResults.length === 0) {
            return res.status(403).send('수정 권한이 없습니다.');
        }
        
        // 모든 태그 가져오기
        db.query('SELECT * FROM tags', (err2, allTags) => {
            if (err2) {
                console.error('태그 조회 오류:', err2);
                return res.status(500).send('서버 오류');
            }
            
            const post = postResults[0];
            const selectedTags = post.tags ? post.tags.split(',') : [];
            
            res.render('edit', { 
                user: req.session.user,
                post: post,
                tags: allTags,
                selectedTags: selectedTags
            });
        });
    });
});

// 게시글 수정 처리 (이미지 + 파일 업로드)
router.post('/edit/:id', upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    
    const postId = req.params.id;
    const userId = req.session.user.id;
    const { title, content, tags, delete_file, delete_image } = req.body;
    
    // 본인의 글인지 확인
    db.query('SELECT * FROM posts WHERE id = ? AND author_id = ?', [postId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).send('수정 권한이 없습니다.');
        }
        
        let filename = results[0].filename;
        let original_filename = results[0].original_filename;
        let image_filename = results[0].image_filename;
        
        // 파일 삭제 옵션
        if (delete_file === 'on') {
            filename = null;
            original_filename = null;
        }
        
        // 이미지 삭제 옵션
        if (delete_image === 'on') {
            image_filename = null;
        }
        
        // 새 파일이 업로드되었으면
        if (req.files && req.files['file']) {
            filename = req.files['file'][0].filename;
            original_filename = req.files['file'][0].originalname;
        }
        
        // 새 이미지가 업로드되었으면
        if (req.files && req.files['image']) {
            image_filename = req.files['image'][0].filename;
        }
        
        // 게시글 수정
        db.query(
            'UPDATE posts SET title = ?, content = ?, filename = ?, original_filename = ?, image_filename = ? WHERE id = ?',
            [title, content, filename, original_filename, image_filename, postId],
            (err2) => {
                if (err2) {
                    console.error('게시글 수정 오류:', err2);
                    return res.status(500).send('수정 중 오류가 발생했습니다.');
                }
                
                // 기존 태그 연결 삭제
                db.query('DELETE FROM post_tags WHERE post_id = ?', [postId], (err3) => {
                    if (err3) {
                        console.error('태그 삭제 오류:', err3);
                    }
                    
                    // 새 태그 저장
                    if (tags) {
                        const tagArray = Array.isArray(tags) ? tags : [tags];
                        
                        tagArray.forEach(tagName => {
                            db.query('SELECT id FROM tags WHERE name = ?', [tagName], (err4, tagResults) => {
                                if (err4) return;
                                
                                if (tagResults.length > 0) {
                                    db.query('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)', 
                                        [postId, tagResults[0].id]);
                                }
                            });
                        });
                    }
                    
                    console.log(' 게시글 수정 성공:', postId);
                    res.redirect('/board/view/' + postId);
                });
            }
        );
    });
});

// 게시글 삭제
router.post('/delete/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    
    const postId = req.params.id;
    const userId = req.session.user.id;
    
    // 본인의 글인지 확인
    db.query('SELECT * FROM posts WHERE id = ? AND author_id = ?', [postId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }
        
        // 게시글 삭제 (CASCADE로 post_tags, comments, likes도 자동 삭제됨)
        db.query('DELETE FROM posts WHERE id = ?', [postId], (err2) => {
            if (err2) {
                console.error('삭제 오류:', err2);
                return res.status(500).send('삭제 중 오류가 발생했습니다.');
            }
            
            console.log(' 게시글 삭제 성공:', postId);
            res.redirect('/user/mypage');
        });
    });
});

// 댓글 작성
router.post('/comment/:postId', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('로그인이 필요합니다.');
    }
    
    const postId = req.params.postId;
    const { content } = req.body;
    const authorId = req.session.user.id;
    
    db.query(
        'INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?)',
        [postId, authorId, content],
        (err) => {
            if (err) {
                console.error('댓글 저장 오류:', err);
                return res.status(500).send('댓글 저장 실패');
            }
            
            console.log(' 댓글 작성 성공');
            res.redirect('/board/view/' + postId);
        }
    );
});

// 댓글 삭제
router.get('/comment/delete/:commentId', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    
    const commentId = req.params.commentId;
    const userId = req.session.user.id;
    
    // 본인의 댓글인지 확인
    db.query('SELECT * FROM comments WHERE id = ? AND author_id = ?', [commentId, userId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(403).send('삭제 권한이 없습니다.');
        }
        
        const postId = results[0].post_id;
        
        db.query('DELETE FROM comments WHERE id = ?', [commentId], (err2) => {
            if (err2) {
                console.error('댓글 삭제 오류:', err2);
                return res.status(500).send('삭제 실패');
            }
            
            console.log(' 댓글 삭제 성공');
            res.redirect('/board/view/' + postId);
        });
    });
});

// 좋아요 토글
router.post('/like/:postId', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }
    
    const postId = req.params.postId;
    const userId = req.session.user.id;
    
    // 이미 좋아요를 눌렀는지 확인
    db.query('SELECT * FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err, results) => {
        if (err) {
            console.error('좋아요 확인 오류:', err);
            return res.status(500).json({ success: false, message: '서버 오류' });
        }
        
        if (results.length > 0) {
            // 이미 좋아요를 눌렀으면 취소
            db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err2) => {
                if (err2) {
                    console.error('좋아요 취소 오류:', err2);
                    return res.status(500).json({ success: false, message: '서버 오류' });
                }
                
                // 현재 좋아요 수 조회
                db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId], (err3, countResults) => {
                    const likeCount = countResults[0].count;
                    console.log(' 좋아요 취소:', postId);
                    res.json({ success: true, liked: false, likeCount: likeCount });
                });
            });
        } else {
            // 좋아요 추가
            db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId], (err2) => {
                if (err2) {
                    console.error('좋아요 추가 오류:', err2);
                    return res.status(500).json({ success: false, message: '서버 오류' });
                }
                
                // 현재 좋아요 수 조회
                db.query('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [postId], (err3, countResults) => {
                    const likeCount = countResults[0].count;
                    console.log(' 좋아요 추가:', postId);
                    res.json({ success: true, liked: true, likeCount: likeCount });
                });
            });
        }
    });
});

module.exports = router;