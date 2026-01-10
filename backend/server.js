const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resume_extractor', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Import routes and services
const emailRoutes = require('./routes/emailRoutes');
const emailService = require('./services/emailService');

// Routes
app.use('/api/resumes', emailRoutes); // Using same endpoint for compatibility
app.use('/api/emails', emailRoutes);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to email service
app.set('io', io);

// Start email monitoring
emailService.startMonitoring(io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  Port ${PORT} is already in use!`);
    console.error(`Another server instance is already running on port ${PORT}.`);
    console.error(`\nTo fix this:`);
    console.error(`1. Find the process using: netstat -ano | findstr :${PORT}`);
    console.error(`2. Kill it using: taskkill /PID <process_id> /F`);
    console.error(`3. Or use a different port by setting PORT in .env file\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});
