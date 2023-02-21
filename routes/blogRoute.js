const express = require('express');
const {
  postBlog,
  getAllBlog,
  getMyBlogs,
  updateBlog,
  deleteMyBlog,
  getBlogCategory,
  getBlogDetails,
  myBlogs,
  createComment,
  getAllComments,
  deleteComments,
} = require('../controllers/blogController');
const isAuth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/allblogs', getAllBlog);
router.get('/', isAuth, myBlogs);
router.get('/:id', getBlogDetails);
router.put('/myblog/:id', isAuth, updateBlog);
router.delete('/myblog/:id', isAuth, deleteMyBlog);
router.post('/postblog', isAuth, postBlog);
router.put('/comment', isAuth, createComment);
router.delete('/comment', isAuth, deleteComments);
router.get('/comment/comments', getAllComments);

module.exports = router;
