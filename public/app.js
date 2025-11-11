// Tracking application state
let events = [];
let stats = {
  totalEvents: 0,
  activeUsers: 0,
  pageViews: 0
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
  setupEventListeners();
  updateStats();
});

// Setup event listeners
function setupEventListeners() {
  const trackingForm = document.getElementById('trackingForm');
  trackingForm.addEventListener('submit', handleTrackEvent);
}

// Load initial data
async function loadInitialData() {
  try {
    const response = await fetch('/api/events');
    const data = await response.json();
    
    if (data.success) {
      events = data.events || [];
      stats = data.stats || stats;
      updateUI();
    }
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}

// Handle track event form submission
async function handleTrackEvent(e) {
  e.preventDefault();
  
  const trackingNumber = document.getElementById('eventName').value.trim();
  
  if (!trackingNumber) {
    showNotification('Please enter a tracking number', 'error');
    return;
  }
  
  // Validate tracking number exists in the system
  try {
    const response = await fetch(`/api/shipments/${encodeURIComponent(trackingNumber)}`);
    const data = await response.json();
    
    if (!data.success || !data.shipment) {
      showNotification('Invalid tracking number. Please check and try again.', 'error');
      return;
    }
    
    // Tracking number is valid, open details page
    window.open(`tracking-details.html?tracking=${encodeURIComponent(trackingNumber)}`, '_blank');
    
    // Log the tracking event
    await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: trackingNumber,
        category: 'shipment',
        timestamp: new Date().toISOString()
      })
    });
    
    // Clear the form
    e.target.reset();
    
  } catch (error) {
    console.error('Failed to validate tracking number:', error);
    showNotification('Error validating tracking number. Please try again.', 'error');
  }
}

// Update UI with current data
function updateUI() {
  updateStats();
  updateEventsList();
}

// Update statistics display
function updateStats() {
  document.getElementById('totalEvents').textContent = stats.totalEvents;
  document.getElementById('activeUsers').textContent = stats.activeUsers;
  document.getElementById('pageViews').textContent = stats.pageViews;
}

// Update events list display
function updateEventsList() {
  const eventsList = document.getElementById('eventsList');
  
  if (events.length === 0) {
    eventsList.innerHTML = '<p class="empty-state">No events tracked yet</p>';
    return;
  }
  
  eventsList.innerHTML = events.map(event => `
    <div class="event-item">
      <div class="event-header">
        <span class="event-name">${escapeHtml(event.name)}</span>
        <span class="event-category">${escapeHtml(event.category)}</span>
      </div>
      <div class="event-details">
        <span>⏰ ${formatTimestamp(event.timestamp)}</span>
        ${event.value ? `<span>💰 Value: ${event.value}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// Format timestamp for display
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#28a745' : '#dc3545'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Track page view on load
window.addEventListener('load', () => {
  stats.pageViews++;
  updateStats();
});

