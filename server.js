require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const teamRoutes = require('./routes/teams');
const shelterRoutes = require('./routes/shelters');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' })); // generous limit in case of base64 image metadata

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/shelters', shelterRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'raksha-backend' }));

// Optionally serve the built frontend as static files (uncomment if you
// deploy frontend + backend together instead of running the frontend separately)
// app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`RAKSHA backend listening on http://localhost:${PORT}`);
});
