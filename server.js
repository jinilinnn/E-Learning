// ==============================
// E-Learning API (Fixed + GET /api/users)
// Node.js + Express + MongoDB Atlas
// ==============================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ====== Schemas ======
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['student', 'instructor'], default: 'student' }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  price: { type: Number, default: 0 },
  published: { type: Boolean, default: false }
}, { timestamps: true });

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  progress: { type: Number, default: 0 },
  enrolledAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

// ====== Routes ======
app.get('/', (req, res) => res.send('E-Learning API Ready!'));

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'Registered', user });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// GET ALL USERS - THIS WAS MISSING!
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-__v');
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get one user
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-__v');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get all published courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find({ published: true })
      .populate('instructor', 'name')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get one course
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name');
    if (!course || !course.published) return res.status(404).json({ error: 'Not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create course
app.post('/api/courses', async (req, res) => {
  try {
    const course = new Course({ ...req.body, instructor: req.body.instructorId });
    await course.save();
    res.status(201).json(course);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Enroll
app.post('/api/enroll', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    const existing = await Enrollment.findOne({ student: studentId, course: courseId });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });
    const enrollment = new Enrollment({ student: studentId, course: courseId });
    await enrollment.save();
    res.status(201).json({ message: 'Enrolled!', enrollment });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// My courses
app.get('/api/my-courses/:studentId', async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.params.studentId })
      .populate('course');
    res.json(enrollments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update progress
app.patch('/api/enrollments/:id', async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndUpdate(
      req.params.id,
      { progress: req.body.progress },
      { new: true }
    );
    res.json(enrollment);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ====== Connect DB & Start ======
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('DB Error:', err));