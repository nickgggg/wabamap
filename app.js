// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Initialize Leaflet map
const map = L.map('map').setView(MAP_CENTER, 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Active markers tracking
const activeMarkers = {};

// Parse Olo timestamp
function parseOloTimestamp(timestamp) {
    // "YYYYMMDD HH:MM" format
    const [datePart, timePart] = timestamp.split(' ');
    const year = datePart.slice(0, 4);
    const month = datePart.slice(4, 6) - 1;  // JavaScript months are 0-indexed
    const day = datePart.slice(6);
    const [hours, minutes] = timePart.split(':');
    return new Date(year, month, day, hours, minutes);
}

// Check if order is still active
function isOrderActive(order) {
    const currentTime = new Date();
    const readyTime = parseOloTimestamp(order.timeReady);
    return currentTime < readyTime;
}

// Create map marker
function createOrderMarker(order) {
    const marker = L.marker([order.latitude, order.longitude], {
        icon: L.divIcon({
            className: 'order-marker',
            html: `<div class="marker-pulse"></div>`
        })
    });

    marker.bindPopup(`
        <strong>${order.storeName}</strong><br>
        Order Placed: ${order.timePlaced}<br>
        Ready By: ${order.timeReady}
    `);

    marker.addTo(map);
    return marker;
}

// Real-time orders subscription
function subscribeToOrders() {
    const orderChannel = supabase
        .channel('active-orders')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'orders' }, 
            (payload) => {
                const order = payload.new;
                if (isOrderActive(order)) {
                    const marker = createOrderMarker(order);
                    activeMarkers[order.id] = marker;
                    updateOrderStats();
                }
            }
        )
        .subscribe();
}

// Update active order statistics
function updateOrderStats() {
    const totalOrders = Object.keys(activeMarkers).length;
    document.getElementById('total-orders').textContent = totalOrders;
}

// Periodic marker cleanup
function cleanupExpiredMarkers() {
    Object.entries(activeMarkers).forEach(([id, marker]) => {
        const orderRef = supabase.from('orders').select('*').eq('id', id).single();
        orderRef.then(({ data, error }) => {
            if (error) return;
            if (!isOrderActive(data)) {
                map.removeLayer(marker);
                delete activeMarkers[id];
                updateOrderStats();
            }
        });
    });
}

// Initialize application
function init() {
    subscribeToOrders();
    setInterval(cleanupExpiredMarkers, 60000);  // Check every minute
}

// Start the application
init();