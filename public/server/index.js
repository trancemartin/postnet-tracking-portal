const express = require('express');
const path = require('path');
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;

// In-memory data storage
let eventsData = [];
let shipmentsData = [];
let statsData = {
  totalEvents: 0,
  activeUsers: 1,
  pageViews: 0
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes

// Get all events and stats
app.get('/api/events', (req, res) => {
  res.json({
    success: true,
    events: eventsData,
    stats: statsData
  });
});

// Track new event
app.post('/api/track', (req, res) => {
  try {
    const { name, category, value, timestamp } = req.body;
    
    // Validate required fields
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Event name and category are required'
      });
    }
    
    // Create event object
    const event = {
      id: Date.now().toString(),
      name,
      category,
      value: value || null,
      timestamp: timestamp || new Date().toISOString()
    };
    
    // Store event
    eventsData.unshift(event);
    
    // Keep only last 100 events
    if (eventsData.length > 100) {
      eventsData = eventsData.slice(0, 100);
    }
    
    // Update stats
    statsData.totalEvents++;
    if (category === 'page') {
      statsData.pageViews++;
    }
    
    console.log(`Event tracked: ${name} (${category})`);
    
    res.json({
      success: true,
      event,
      stats: statsData
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track event'
    });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: statsData
  });
});

// Shipment management endpoints

// Get all shipments
app.get('/api/shipments', (req, res) => {
  console.log(`GET /api/shipments - Returning ${shipmentsData.length} shipments`);
  res.json({
    success: true,
    shipments: shipmentsData
  });
});

// Get single shipment by tracking number
app.get('/api/shipments/:trackingNumber', (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const shipment = shipmentsData.find(s => s.trackingNumber === trackingNumber);
    
    if (shipment) {
      res.json({
        success: true,
        shipment
      });
    } else {
      res.json({
        success: false,
        message: 'Shipment not found'
      });
    }
  } catch (error) {
    console.error('Error fetching shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment'
    });
  }
});

// Add new shipment
app.post('/api/shipments', (req, res) => {
  try {
    const shipment = req.body;
    shipmentsData.push(shipment);
    
    res.json({
      success: true,
      shipment
    });
  } catch (error) {
    console.error('Error adding shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add shipment'
    });
  }
});

// Update shipment
app.put('/api/shipments/:trackingNumber', (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const updatedShipment = req.body;
    
    const index = shipmentsData.findIndex(s => s.trackingNumber === trackingNumber);
    if (index !== -1) {
      shipmentsData[index] = { ...shipmentsData[index], ...updatedShipment };
      res.json({
        success: true,
        shipment: shipmentsData[index]
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Shipment not found'
      });
    }
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update shipment'
    });
  }
});

// Delete shipment
app.delete('/api/shipments/:trackingNumber', (req, res) => {
  try {
    const { trackingNumber } = req.params;
    console.log(`Deleting shipment: ${trackingNumber}`);
    console.log(`Shipments before delete:`, shipmentsData.map(s => s.trackingNumber));
    
    shipmentsData = shipmentsData.filter(s => s.trackingNumber !== trackingNumber);
    
    console.log(`Shipments after delete:`, shipmentsData.map(s => s.trackingNumber));
    
    res.json({
      success: true,
      message: 'Shipment deleted'
    });
  } catch (error) {
    console.error('Error deleting shipment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete shipment'
    });
  }
});

// Clear all shipments
app.delete('/api/shipments', (req, res) => {
  try {
    shipmentsData = [];
    res.json({
      success: true,
      message: 'All shipments cleared'
    });
  } catch (error) {
    console.error('Error clearing shipments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear shipments'
    });
  }
});

// Clear all events
app.delete('/api/events', (req, res) => {
  eventsData = [];
  statsData = {
    totalEvents: 0,
    activeUsers: statsData.activeUsers,
    pageViews: 0
  };
  
  res.json({
    success: true,
    message: 'All events cleared'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   Tracking Server Started            ║
╠══════════════════════════════════════╣
║   Port: ${PORT}                       
║   URL:  http://localhost:${PORT}     
║   Time: ${new Date().toLocaleString()}
╚══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
