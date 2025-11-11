// Admin panel state
let shipments = [];
let stats = {
  totalShipments: 0,
  activeShipments: 0,
  deliveredToday: 0,
  totalRequests: 0
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
  loadShipments();
  updateStats();
  setupFormHandler();
  
  // Set default date to 3 days from now
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  document.getElementById('arrivalDate').value = defaultDate.toISOString().split('T')[0];
  
  // Set default status time to current time
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('statusTime').value = localDateTime;
});

// Load shipments from backend
async function loadShipments() {
  try {
    const response = await fetch('/api/shipments');
    const data = await response.json();
    
    if (data.success) {
      shipments = data.shipments || [];
      updateShipmentsList();
    }
  } catch (error) {
    console.error('Failed to load shipments:', error);
    // Don't load demo data - show empty state instead
    shipments = [];
    updateShipmentsList();
    showNotification('Failed to connect to server. Please ensure the server is running.', 'error');
  }
}

// Update shipments list
function updateShipmentsList() {
  const shipmentsList = document.getElementById('shipmentsList');
  
  if (shipments.length === 0) {
    shipmentsList.innerHTML = '<p style="text-align: center; color: #adb5bd; padding: 40px;">No shipments yet</p>';
    return;
  }
  
  shipmentsList.innerHTML = shipments.map(shipment => `
    <div class="tracking-item">
      <div class="tracking-info">
        <div class="tracking-number">📦 ${shipment.trackingNumber}</div>
        <div class="tracking-status">
          ${shipment.contents} • ${shipment.origin} → ${shipment.destination}
        </div>
        <div class="tracking-status">
          Status: <strong>${shipment.status}</strong> • ETA: ${shipment.estimatedArrival}
        </div>
      </div>
      <div class="action-buttons">
        <button class="btn btn-view" onclick="viewShipment('${shipment.trackingNumber}')">View</button>
        <button class="btn btn-edit" onclick="editShipment('${shipment.trackingNumber}')">Edit</button>
        <button class="btn btn-delete" onclick="deleteShipment('${shipment.trackingNumber}')">Delete</button>
      </div>
    </div>
  `).join('');
  
  updateStats();
}

// Update statistics
function updateStats() {
  stats.totalShipments = shipments.length;
  stats.activeShipments = shipments.filter(s => s.status !== 'Delivered').length;
  stats.deliveredToday = shipments.filter(s => {
    const today = new Date().toDateString();
    return s.status === 'Delivered' && new Date(s.createdAt).toDateString() === today;
  }).length;
  
  document.getElementById('totalShipments').textContent = stats.totalShipments;
  document.getElementById('activeShipments').textContent = stats.activeShipments;
  document.getElementById('deliveredToday').textContent = stats.deliveredToday;
  document.getElementById('totalRequests').textContent = stats.totalRequests;
}

// Show add modal
function showAddModal() {
  document.getElementById('modalTitle').textContent = 'Add New Shipment';
  document.getElementById('shipmentForm').reset();
  
  // Set default date
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 3);
  document.getElementById('arrivalDate').value = defaultDate.toISOString().split('T')[0];
  
  document.getElementById('shipmentModal').classList.add('show');
}

// Close modal
function closeModal() {
  document.getElementById('shipmentModal').classList.remove('show');
}

// Setup form handler
function setupFormHandler() {
  document.getElementById('shipmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const trackingNumber = document.getElementById('trackingNum').value.trim();
    const arrivalDateInput = document.getElementById('arrivalDate').value;
    const statusTime = new Date(document.getElementById('statusTime').value);
    const collectedFromPostnetTime = document.getElementById('collectedFromPostnetTime').value ? new Date(document.getElementById('collectedFromPostnetTime').value) : null;
    const outForDeliveryTime = document.getElementById('outForDeliveryTime').value ? new Date(document.getElementById('outForDeliveryTime').value) : null;
    const pickedUpTime = document.getElementById('pickedUpTime').value ? new Date(document.getElementById('pickedUpTime').value) : null;

    if (!trackingNumber || !arrivalDateInput || !statusTime) {
      showNotification('Please fill in all required fields!', 'error');
      return;
    }
    
    const arrivalDate = new Date(arrivalDateInput);
    const status = document.getElementById('status').value;
    
    const formData = {
      trackingNumber: trackingNumber,
      contents: document.getElementById('packageContents').value.trim(),
      origin: document.getElementById('origin').value.trim(),
      destination: document.getElementById('destination').value.trim(),
      status: status,
      statusTime: statusTime.toISOString(),
      collectedFromPostnetTime: collectedFromPostnetTime ? collectedFromPostnetTime.toISOString() : null,
      outForDeliveryTime: outForDeliveryTime ? outForDeliveryTime.toISOString() : null,
      pickedUpTime: pickedUpTime ? pickedUpTime.toISOString() : null,
      estimatedArrival: arrivalDate.toISOString(),
      transitTime: calculateTransitTime(arrivalDate),
      createdAt: new Date().toISOString(),
      timeline: generateShipmentTimeline(status, document.getElementById('origin').value, statusTime, collectedFromPostnetTime, outForDeliveryTime, pickedUpTime)
    };
    
    // Save to backend
    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        loadShipments(); // Reload all shipments from server
        closeModal();
        showNotification(`Shipment ${trackingNumber} added successfully!`);
      } else {
        showNotification(data.error || 'Failed to save shipment.', 'error');
      }
    } catch (error) {
      console.error('Failed to save to backend:', error);
      showNotification('Error connecting to server.', 'error');
    }
  });
}

// Calculate transit time
function calculateTransitTime(arrivalDate) {
  const today = new Date();
  const diffTime = Math.abs(arrivalDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) return '1 Business Day';
  if (diffDays <= 3) return '2-3 Business Days';
  if (diffDays <= 5) return '3-5 Business Days';
  return `${diffDays} Business Days`;
}

// Generate shipment timeline
function generateShipmentTimeline(status, origin, statusTime, collectedFromPostnetTime, outForDeliveryTime, pickedUpTime) {
  const timeline = [];
  const currentTime = new Date(statusTime);
  
  // Current status with exact time from form
  timeline.push({
    time: currentTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    status: status,
    description: getStatusDescription(status),
    timestamp: currentTime.getTime()
  });
  
  // Add "Collected from Postnet" event if time is provided
  if (collectedFromPostnetTime) {
    const cfpTime = new Date(collectedFromPostnetTime);
    timeline.push({
      time: cfpTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Collected from Postnet',
      description: 'Package collected from Postnet',
      timestamp: cfpTime.getTime()
    });
  }
  
  // Add "Out for Delivery" event if time is provided
  if (outForDeliveryTime) {
    const ofdTime = new Date(outForDeliveryTime);
    timeline.push({
      time: ofdTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Out for Delivery',
      description: 'Package is out for delivery',
      timestamp: ofdTime.getTime()
    });
  }
  
  // Add "Picked Up" event if time is provided
  if (pickedUpTime) {
    const puTime = new Date(pickedUpTime);
    timeline.push({
      time: puTime.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      status: 'Picked Up',
      description: 'Package picked up by receiver',
      timestamp: puTime.getTime()
    });
  }

  // Sort timeline by timestamp descending
  timeline.sort((a, b) => b.timestamp - a.timestamp);
  
  return timeline;
}

// Get status description
function getStatusDescription(status) {
  const descriptions = {
    'Picked Up': 'Package picked up by receiver',
    'In Transit': 'Package is on the way to destination',
    'Out for Delivery': 'Package is out for delivery',
    'Collected from Postnet': 'Package collected from Postnet',
    'Delivered': 'Package has been delivered successfully'
  };
  return descriptions[status] || 'Package status updated';
}

// View shipment
function viewShipment(trackingNumber) {
  window.open(`tracking-details.html?tracking=${encodeURIComponent(trackingNumber)}`, '_blank');
}

// Edit shipment
function editShipment(trackingNumber) {
  const shipment = shipments.find(s => s.trackingNumber === trackingNumber);
  if (!shipment) return;
  
  document.getElementById('modalTitle').textContent = 'Edit Shipment';
  document.getElementById('trackingNum').value = shipment.trackingNumber;
  document.getElementById('packageContents').value = shipment.contents;
  document.getElementById('origin').value = shipment.origin;
  document.getElementById('destination').value = shipment.destination;
  document.getElementById('status').value = shipment.status;
  
  document.getElementById('shipmentModal').classList.add('show');
}

// Delete shipment
async function deleteShipment(trackingNumber) {
  if (!confirm(`Are you sure you want to delete shipment ${trackingNumber}?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/shipments/${trackingNumber}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      // Remove from local array only after successful backend deletion
      shipments = shipments.filter(s => s.trackingNumber !== trackingNumber);
      updateShipmentsList();
      showNotification('Shipment deleted successfully!');
    } else {
      showNotification('Error deleting shipment. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Failed to delete shipment:', error);
    showNotification('Failed to connect to server to delete shipment.', 'error');
  }
}

// Refresh data
function refreshData() {
  loadShipments();
  showNotification('Data refreshed!');
}

// Export data
function exportData() {
  const dataStr = JSON.stringify(shipments, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `shipments-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  showNotification('Data exported successfully!');
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all shipment data? This cannot be undone.')) {
    return;
  }
  
  // Clear local data
  shipments = [];
  updateShipmentsList();
  showNotification('All data cleared!');

  // Send request to backend to clear data
  try {
    await fetch('/api/shipments', { method: 'DELETE' });
  } catch (error) {
    console.error('Failed to clear backend data:', error);
  }
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
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('shipmentModal');
  if (event.target === modal) {
    closeModal();
  }
}
