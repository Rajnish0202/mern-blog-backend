const express = require('express');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const userRoute = require('./routes/userRoute');
const blogRoute = require('./routes/blogRoute');
const contactRoute = require('./routes/contactRoute');
const fileUpload = require('express-fileupload');

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://mernblog-app.vercel.app'],
    credentials: true,
  })
);
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
  })
);

// Router Middleware
app.use('/api/users', userRoute);
app.use('/api/blogs', blogRoute);
app.use('/api/contact', contactRoute);

// Routes
app.get('/', (req, res) => {
  res.send('Home Page');
});

// Error Middleware
app.use(errorHandler);

// Connect to DB and start server

const PORT = process.env.PORT || 5000;

mongoose
  .connect(
    process.env.MONGODB_URI.replace('<PASSWORD>', process.env.MONGODB_PASSWORD)
  )
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server Running on Port: ${PORT}`);
    });
  })
  .catch((err) => console.log(err));
