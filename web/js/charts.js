/**
 * Grafiklar - Chart.js
 */

// Grafik o'zgaruvchilari
let congestionChart = null;
let speedChart = null;

// Ma'lumotlar
const MAX_DATA_POINTS = 30;
const chartData = {
    congestion: [],
    speed: [],
    labels: []
};

// Grafiklarni ishga tushirish
function initCharts() {
    // Tirbandlik grafigi
    const congestionCtx = document.getElementById('congestionChart').getContext('2d');
    congestionChart = new Chart(congestionCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Tirbandlik %',
                data: [],
                borderColor: '#ff3366',
                backgroundColor: 'rgba(255, 51, 102, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: getChartOptions('Tirbandlik darajasi', 0, 100)
    });

    // Tezlik grafigi
    const speedCtx = document.getElementById('speedChart').getContext('2d');
    speedChart = new Chart(speedCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Tezlik km/h',
                data: [],
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0
            }]
        },
        options: getChartOptions('O\'rtacha tezlik', 0, 80)
    });

    // Boshlang'ich ma'lumotlar
    for (let i = 0; i < 10; i++) {
        addCongestionDataPoint(40 + Math.random() * 20);
        addSpeedDataPoint(40 + Math.random() * 15);
    }

    console.log('📊 Grafiklar tayyor');
}

// Grafik opsiyalari
function getChartOptions(title, min, max) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(26, 26, 46, 0.9)',
                titleColor: '#fff',
                bodyColor: '#a0a0b0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false,
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#6b6b7b',
                    maxTicksLimit: 5,
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                display: true,
                min: min,
                max: max,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                    color: '#6b6b7b',
                    font: {
                        size: 10
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        animation: {
            duration: 300
        }
    };
}

// Vaqt formati
function getTimeLabel() {
    const now = new Date();
    return now.toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Tirbandlik ma'lumotini qo'shish
function addCongestionDataPoint(value) {
    if (!congestionChart) return;

    const time = getTimeLabel();

    congestionChart.data.labels.push(time);
    congestionChart.data.datasets[0].data.push(value);

    // Limit data points
    if (congestionChart.data.labels.length > MAX_DATA_POINTS) {
        congestionChart.data.labels.shift();
        congestionChart.data.datasets[0].data.shift();
    }

    // Rang o'zgartirish
    const color = getCongestionChartColor(value);
    congestionChart.data.datasets[0].borderColor = color;
    congestionChart.data.datasets[0].backgroundColor = color.replace('1)', '0.1)');

    congestionChart.update('none');
}

// Tirbandlik rang
function getCongestionChartColor(level) {
    if (level < 25) return 'rgba(0, 255, 136, 1)';
    if (level < 50) return 'rgba(255, 238, 0, 1)';
    if (level < 75) return 'rgba(255, 149, 0, 1)';
    return 'rgba(255, 51, 102, 1)';
}

// Tezlik ma'lumotini qo'shish
function addSpeedDataPoint(value) {
    if (!speedChart) return;

    const time = getTimeLabel();

    speedChart.data.labels.push(time);
    speedChart.data.datasets[0].data.push(value);

    // Limit data points
    if (speedChart.data.labels.length > MAX_DATA_POINTS) {
        speedChart.data.labels.shift();
        speedChart.data.datasets[0].data.shift();
    }

    speedChart.update('none');
}

// Grafiklarni tozalash
function clearCharts() {
    if (congestionChart) {
        congestionChart.data.labels = [];
        congestionChart.data.datasets[0].data = [];
        congestionChart.update();
    }

    if (speedChart) {
        speedChart.data.labels = [];
        speedChart.data.datasets[0].data = [];
        speedChart.update();
    }
}

// Export
window.initCharts = initCharts;
window.addCongestionDataPoint = addCongestionDataPoint;
window.addSpeedDataPoint = addSpeedDataPoint;
window.clearCharts = clearCharts;
