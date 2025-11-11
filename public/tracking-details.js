// Get tracking number from URL
const urlParams = new URLSearchParams(window.location.search);
const trackingNumber = urlParams.get('tracking');

// Sample tracking data (in a real app, this would come from your backend)
const trackingData = {};

// Load tracking information
function loadTrackingInfo() {
  if (!trackingNumber) {
    document.getElementById('trackingNumberDisplay').textContent = 'No tracking number provided';
    return;
  }

  document.getElementById('trackingNumberDisplay').textContent = trackingNumber;

  // First, try to fetch from backend
  fetch(`/api/shipments/${trackingNumber}`)
    .then(response => response.json())
    .then(result => {
      if (result.success && result.shipment) {
        // Use data from backend
        displayShipmentData(result.shipment);
      } else {
        // If not found, display an error message
        document.getElementById('tracking-details-container').innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h2 style="color: #dc3545;">Tracking Number Not Found</h2>
            <p>The tracking number "${trackingNumber}" does not exist in our system. Please check the number and try again.</p>
            <a href="index.html" class="button" style="text-decoration: none; display: inline-block; margin-top: 20px;">Track Another Parcel</a>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching shipment:', error);
      // If fetch fails, display an error message
      document.getElementById('tracking-details-container').innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <h2 style="color: #dc3545;">Error Connecting to Server</h2>
          <p>Could not retrieve tracking information. Please check your connection and try again.</p>
          <a href="index.html" class="button" style="text-decoration: none; display: inline-block; margin-top: 20px;">Go Back</a>
        </div>
      `;
    });
}

// Display shipment data
function displayShipmentData(data) {
  // Update status badge - always show Postnet Express
  const statusBadge = document.getElementById('statusBadge');
  statusBadge.textContent = 'POSTNET EXPRESS TRACKING PORTAL';
  statusBadge.style.background = '#dc3545';

  // Update package info
  document.getElementById('packageContents').textContent = data.contents || data.packageContents;

  // Update locations
  document.getElementById('originLocation').textContent = data.origin;
  document.getElementById('destinationLocation').textContent = data.destination;

  // Update timing
  document.getElementById('transitTime').textContent = new Date(data.statusTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('estimatedArrival').textContent = new Date(data.estimatedArrival).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Update timeline
  if (data.timeline) {
    updateTimeline(data.timeline);
  } else {
    // Generate timeline based on status
    const generatedTimeline = generateTimeline(data);
    updateTimeline(generatedTimeline);
  }
}

// Generate timeline based on shipment data
function generateTimeline(shipment) {
  const today = new Date();
  const timeline = [];
  
  // Add current status
  timeline.push({
    time: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - ' + today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    status: shipment.status,
    description: getStatusDescription(shipment.status)
  });
  
  // Add previous statuses based on current status
  if (shipment.status === 'In Transit') {
    // If In Transit, first show Out for Delivery
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    timeline.push({
      time: yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 8:00 AM',
      status: 'Out for Delivery',
      description: 'Package is out for delivery'
    });
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    timeline.push({
      time: twoDaysAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 6:45 PM',
      status: 'Picked Up',
      description: 'Package picked up by receiver'
    });
  } else if (shipment.status !== 'Picked Up') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    timeline.push({
      time: yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 8:00 AM',
      status: 'Out for Delivery',
      description: 'Package is out for delivery'
    });
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    timeline.push({
      time: twoDaysAgo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 6:45 PM',
      status: 'Picked Up',
      description: 'Package picked up by receiver'
    });
  }
  
  return timeline;
}

// Get status description
function getStatusDescription(status) {
  const descriptions = {
    'Picked Up': 'Package picked up by receiver',
    'In Transit': 'Package is on the way to destination',
    'Out for Delivery': 'Package is out for delivery',
    'Collected from Postnet': 'Package collected from Postnet',
    'Delivered': 'Package has been delivered'
  };
  return descriptions[status] || 'Package status updated';
}

// Update timeline with tracking history
function updateTimeline(timeline) {
  const timelineContainer = document.getElementById('trackingTimeline');
  const currentTime = Date.now();
  
  // Define the desired order (most important first)
  const statusOrder = {
    'Collected from Postnet': 1,
    'In Transit': 2,
    'Out for Delivery': 3,
    'Picked Up': 4,
    'Delivered': 5
  };
  
  // Sort timeline by predefined order (not by timestamp)
  const sortedTimeline = [...timeline].sort((a, b) => {
    const orderA = statusOrder[a.status] || 999;
    const orderB = statusOrder[b.status] || 999;
    return orderA - orderB;
  });
  
  timelineContainer.innerHTML = sortedTimeline.map((item, index) => {
    // Check if the status time has passed
    const eventTime = item.timestamp || 0;
    const hasStarted = currentTime >= eventTime;
    
    // All statuses get beeping green dots when their time has been reached
    const completedClass = hasStarted ? 'completed' : '';
    const activeClass = (index === 0 && hasStarted) ? 'active' : '';
    
    return `
      <div class="timeline-item">
        <div class="timeline-dot ${activeClass} ${completedClass}"></div>
        <div class="timeline-content">
          <div class="timeline-time">${item.time}</div>
          <div class="timeline-status">${item.status}</div>
          <div style="color: #6c757d; font-size: 0.875rem;">${item.description}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Refresh timeline every 30 seconds to check if In Transit time has been reached
  if (timeline.some(item => item.status.toLowerCase().includes('transit') && item.timestamp > currentTime)) {
    setTimeout(() => updateTimeline(timeline), 30000);
  }
}

// Generate default data for unknown tracking numbers
function generateDefaultData(trackingNum) {
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle'];
  const randomOrigin = cities[Math.floor(Math.random() * cities.length)];
  let randomDestination = cities[Math.floor(Math.random() * cities.length)];
  while (randomDestination === randomOrigin) {
    randomDestination = cities[Math.floor(Math.random() * cities.length)];
  }

  const today = new Date();
  const arrivalDate = new Date(today);
  arrivalDate.setDate(arrivalDate.getDate() + Math.floor(Math.random() * 5) + 1);

  return {
    status: 'In Transit',
    packageContents: 'General Merchandise',
    weight: `${(Math.random() * 5 + 0.5).toFixed(1)} kg`,
    dimensions: '30x20x15 cm',
    origin: `${randomOrigin}, USA`,
    destination: `${randomDestination}, USA`,
    transitTime: '3-5 Business Days',
    estimatedArrival: arrivalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    timeline: [
      {
        time: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 2:30 PM',
        status: 'In Transit',
        description: 'Package is on the way to destination'
      },
      {
        time: today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 8:00 AM',
        status: 'Out for Delivery',
        description: 'Package is out for delivery'
      },
      {
        time: new Date(today.setDate(today.getDate() - 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' - 6:45 PM',
        status: 'Picked Up',
        description: 'Package picked up by receiver'
      }
    ]
  };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadTrackingInfo);
