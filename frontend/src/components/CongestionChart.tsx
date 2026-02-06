import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CongestionChartProps {
    data: number[];
    labels: string[];
}

export default function CongestionChart({ data, labels }: CongestionChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // Tirbandlik rangini olish
    const getColor = (level: number) => {
        if (level < 25) return 'rgba(0, 255, 136, 1)';
        if (level < 50) return 'rgba(255, 238, 0, 1)';
        if (level < 75) return 'rgba(255, 149, 0, 1)';
        return 'rgba(255, 51, 102, 1)';
    };

    useEffect(() => {
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Oldingi chartni tozalash
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const lastValue = data[data.length - 1] || 50;
        const color = getColor(lastValue);

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tirbandlik %',
                    data: data,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.1)'),
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 26, 46, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#a0a0b0'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false },
                        ticks: { color: '#6b6b7b', maxTicksLimit: 5, font: { size: 10 } }
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#6b6b7b', font: { size: 10 } }
                    }
                },
                animation: { duration: 300 }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, labels]);

    return (
        <div className="bg-[#1a1b21] border border-white/5 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">📈 Tirbandlik dinamikasi</h3>
            <div className="h-32">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
}
