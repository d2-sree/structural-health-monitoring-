// Initialize Sensor Chart
const sensorCtx = document.getElementById('sensorChart').getContext('2d');
let sensorChart = new Chart(sensorCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: false
            }
        }
    }
});

// Get structure ID from URL
const urlParams = new URLSearchParams(window.location.search);
const structureId = urlParams.get('id');

// Fetch and display structure details
async function loadStructureDetails() {
    if (!structureId) {
        window.location.href = '/';
        return;
    }

    try {
        // Fetch structure details
        const response = await fetch(`http://localhost:5000/api/structure/${structureId}`);
        const structure = await response.json();
        
        // Fetch sensor data
        const sensorResponse = await fetch(`http://localhost:5000/api/sensor-data/${structureId}`);
        const sensorData = await sensorResponse.json();
        
        // Update UI
        updateStructureDetail(structure, sensorData);
    } catch (error) {
        console.error('Error loading structure details:', error);
    }
}

// Update structure detail view
function updateStructureDetail(structure, sensorData) {
    // Update basic info
    document.getElementById('structure-name').textContent = structure.name;
    document.getElementById('structure-type').textContent = `Type: ${structure.type}`;
    document.getElementById('structure-age').textContent = `Age: ${structure.age} years`;
    document.getElementById('structure-location').textContent = `Location: ${structure.location}`;
    document.getElementById('last-inspection').textContent = `Last Inspection: ${structure.last_inspection}`;
    
    // Update sensor data
    const sensorGrid = document.getElementById('sensor-grid');
    sensorGrid.innerHTML = '';
    
    const currentData = sensorData.current || {};
    const sensors = structure.sensors || [];
    
    // Prepare data for chart
    const chartLabels = [];
    const chartDatasets = [];
    const colors = ['#1976d2', '#d32f2f', '#388e3c', '#f57c00', '#7b1fa2'];
    
    sensors.forEach((sensor, index) => {
        // Create sensor card
        const sensorCard = document.createElement('div');
        sensorCard.className = 'sensor-card';
        sensorCard.innerHTML = `
            <div class="sensor-header">
                <h3>${sensor.replace('_', ' ').toUpperCase()}</h3>
                <span class="sensor-value">${currentData[sensor] || 'N/A'}</span>
            </div>
            <div class="sensor-status">
                <span class="status-indicator"></span>
                <span class="status-text">Loading...</span>
            </div>
        `;
        sensorGrid.appendChild(sensorCard);
        
        // Prepare chart dataset for this sensor
        const sensorHistory = sensorData.history || [];
        const sensorValues = sensorHistory.map(entry => entry[sensor]);
        
        chartDatasets.push({
            label: sensor,
            data: sensorValues.slice(-10), // Last 10 readings
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            tension: 0.1,
            fill: false
        });
    });
    
    // Update chart
    chartLabels.push(...Array.from({ length: 10 }, (_, i) => `Reading ${i + 1}`));
    
    sensorChart.data.labels = chartLabels;
    sensorChart.data.datasets = chartDatasets;
    sensorChart.update();
    
    // Check for anomalies
    if (sensorData.analysis && sensorData.analysis.anomaly_detected) {
        const affectedSensors = sensorData.analysis.affected_sensors || [];
        
        affectedSensors.forEach(sensor => {
            const sensorCards = document.querySelectorAll('.sensor-card');
            sensorCards.forEach(card => {
                if (card.querySelector('h3').textContent.includes(sensor.toUpperCase())) {
                    const indicator = card.querySelector('.status-indicator');
                    const statusText = card.querySelector('.status-text');
                    
                    indicator.style.backgroundColor = '#d32f2f';
                    statusText.textContent = 'Anomaly Detected';
                    statusText.style.color = '#d32f2f';
                    
                    // Add animation for critical sensors
                    card.style.animation = 'pulse 2s infinite';
                }
            });
        });
    } else {
        // Set all to normal if no anomaly
        document.querySelectorAll('.sensor-card').forEach(card => {
            const indicator = card.querySelector('.status-indicator');
            const statusText = card.querySelector('.status-text');
            
            indicator.style.backgroundColor = '#388e3c';
            statusText.textContent = 'Normal';
            statusText.style.color = '#388e3c';
        });
    }
}

// Initialize
loadStructureDetails();
setInterval(loadStructureDetails, 10000); // Refresh every 10 seconds