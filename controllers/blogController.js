const asyncHandler = require('express-async-handler');
const cloudinary = require('../utils/cloudinary');
const Blog = require('../models/blogModel');

// Create Blog

const postBlog = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;

  // Validation
  if (!title || !description || !category) {
    res.status(400);
    throw new Error('Please fill in all fields!');
  }

  // Handle Image Upload
  let fileData = {};
  if (req.body.image) {
    // Save Image to cloudinary
    let uploadedFile;

    try {
      uploadedFile = await cloudinary.uploader.upload(req.body.image, {
        folder: 'Blog-Post',
        resource_type: 'image',
      });
    } catch (error) {
      res.status(500);
      throw new Error('Image could not be uploaded');
    }

    fileData = {
      public_id: uploadedFile.public_id,
      url: uploadedFile.secure_url,
    };
  }

  // Create Blog
  const blog = await Blog.create({
    author: req.user.id,
    title,
    description,
    category,
    image: fileData,
  });

  res.status(201).json({
    success: true,
    blog,
  });
});

// Get All Blog
const getAllBlog = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) - 1 || 0;
  const limit = parseInt(req.query.limit) || 5;
  const search = req.query.search || '';
  let sort = req.query.sort || 'createdAt';
  let category = req.query.category || 'All';

  const categories = await Blog.find().distinct('category');

  category === 'All'
    ? (category = [...categories])
    : (category = req.query.category.split(','));

  req.query.sort ? (sort = req.query.sort.split(',')) : (sort = [sort]);

  let sortBy = {};
  if (sort[1]) {
    sortBy[sort[0]] = sort[1];
  } else {
    sortBy[sort[0]] = 'asc';
  }

  const blogs = await Blog.find({ title: { $regex: search, $options: 'i' } })
    .where('category')
    .in([...category])
    .sort(sortBy)
    .skip(page * limit)
    .limit(limit)
    .populate('author', ['name', 'avataar', 'bio'])
    .populate('comments.user', ['avataar']);

  const total = await Blog.countDocuments({
    category: { $in: [...categories] },
    title: { $regex: search, $options: 'i' },
  });

  res.status(200).json({
    success: true,
    total,
    page: page + 1,
    limit,
    blogCounts: blogs.length,
    blogs,
    categories,
  });
});

// Get All Blog
const getBlogDetails = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id)
    .populate('author', ['avataar', 'bio', 'name'])
    .populate('comments.user', ['avataar']);

  res.status(200).json({
    success: true,
    blog,
  });
});

// Get All Blogs created by author
const myBlogs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) - 1 || 0;
  const limit = parseInt(req.query.limit) || 5;
  const search = req.query.search || '';
  let sort = req.query.sort || 'createdAt';
  let category = req.query.category || 'All';

  const categories = await Blog.find().distinct('category');

  category === 'All'
    ? (category = [...categories])
    : (category = req.query.category.split(','));

  req.query.sort ? (sort = req.query.sort.split(',')) : (sort = [sort]);

  let sortBy = {};
  if (sort[1]) {
    sortBy[sort[0]] = sort[1];
  } else {
    sortBy[sort[0]] = 'asc';
  }

  const blogs = await Blog.find({
    author: req.user._id,
    title: { $regex: search, $options: 'i' },
  })
    .where('category')
    .in([...category])
    .sort(sortBy)
    .skip(page * limit)
    .limit(limit)
    .populate('comments.user', ['avataar'])
    .populate('author', ['name', 'avataar', 'bio']);

  const total = await Blog.countDocuments({
    category: { $in: [...categories] },
    title: { $regex: search, $options: 'i' },
  });

  res.status(200).json({
    success: true,
    total,
    page: page + 1,
    limit,
    blogCounts: blogs.length,
    blogs,
    categories,
  });
});

// Update Blog
const updateBlog = asyncHandler(async (req, res) => {
  const { title, description, category } = req.body;

  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found!');
  }

  // Match Blog to its author
  if (blog.author.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized!');
  }

  if (req.body.image !== '') {
    await cloudinary.uploader.destroy(blog.image.public_id, {
      folder: 'Blog-Post',
    });
  }

  // Handle Image Upload
  let fileData = {};
  if (req.body.image) {
    // Save Image to cloudinary
    let uploadedFile;

    try {
      uploadedFile = await cloudinary.uploader.upload(req.body.image, {
        folder: 'Blog-Post',
        resource_type: 'image',
      });
    } catch (error) {
      res.status(500);
      throw new Error('Image could not be uploaded');
    }

    fileData = {
      public_id: uploadedFile.public_id || blog.image.public_id,
      url: uploadedFile.secure_url || blog.image.url,
    };
  }

  // Update Blogs
  const updateBlog = await Blog.findByIdAndUpdate(
    { _id: req.params.id },
    {
      title,
      description,
      category,
      image: Object.keys(fileData).length === 0 ? blog?.image : fileData,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(201).json({
    success: true,
    updateBlog,
  });
});

// Delete Blogs
const deleteMyBlog = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);

  // If Blog doesn't exists
  if (!blog) {
    res.status(404);
    throw new Error('Blog not found!');
  }

  if (blog.author.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized!');
  }

  await cloudinary.uploader.destroy(blog.image.public_id, {
    folder: 'Blog-Post',
  });

  await blog.remove();
  res.status(200).json({
    success: true,
    message: 'Blog deleted successfully',
  });
});

// Create Comments
const createComment = asyncHandler(async (req, res) => {
  const { comment, blogId } = req.body;

  const commentObj = {
    user: req.user._id,
    name: req.user.name,
    comment,
  };

  const blog = await Blog.findById(blogId);

  const isCommented = blog.comments.find(
    (com) => com.user.toString() === req.user._id.toString()
  );

  if (isCommented) {
    blog.comments.forEach((com) => {
      if (com.user.toString() === req.user._id.toString())
        com.comment = comment;
    });
  } else {
    blog.comments.push(commentObj);
    blog.numOfComments = blog.comments.length;
  }

  await blog.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Your comment saved.',
  });
});

// Get All Comments
const getAllComments = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.query.id).populate('comments.user', [
    'avataar',
  ]);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found.');
  }

  res.status(200).json({
    success: true,
    comments: blog.comments,
  });
});

// Delete Comments
const deleteComments = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.query.blogId);

  if (!blog) {
    res.status(404);
    throw new Error('Blog not found!');
  }

  const comments = blog.comments.filter(
    (com) => com._id.toString() !== req.query.id.toString()
  );

  const numOfComments = comments.length;

  await Blog.findByIdAndUpdate(
    req.query.blogId,
    {
      comments,
      numOfComments,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Comment deleted successfully.',
  });
});

module.exports = {
  postBlog,
  getAllBlog,
  getBlogDetails,
  myBlogs,
  updateBlog,
  deleteMyBlog,
  createComment,
  getAllComments,
  deleteComments,
};
