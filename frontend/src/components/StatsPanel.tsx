import { Activity, Car, Gauge, AlertTriangle } from 'lucide-react';
import { memo } from 'react';
import type { TrafficStats } from '../hooks/useTrafficData';

interface StatsPanelProps {
    stats: TrafficStats;
}

export default memo(function StatsPanel({ stats }: StatsPanelProps) {
    const items = [
        {
            label: 'Faol Transport',
            value: stats.vehicle_count,
            icon: Car,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10'
        },
        {
            label: "O'rtacha Tezlik",
            value: `${stats.avg_speed.toFixed(1)} km/s`,
            icon: Gauge,
            color: 'text-green-400',
            bg: 'bg-green-500/10'
        },
        {
            label: 'Tirbandlik',
            value: `${stats.congestion_level}%`,
            icon: Activity,
            color: stats.congestion_level > 70 ? 'text-red-400' : 'text-purple-400',
            bg: stats.congestion_level > 70 ? 'bg-red-500/10' : 'bg-purple-500/10'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {items.map((item, idx) => (
                <div key={idx} className="bg-[#1a1b21] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${item.bg}`}>
                        <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm font-medium">{item.label}</p>
                        <p className="text-2xl font-bold text-white">{item.value}</p>
                    </div>
                </div>
            ))}

            {stats.emergency_active && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-red-500/20">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <p className="text-red-300 text-sm font-medium">FAVQULODDA REJIM</p>
                        <p className="text-xl font-bold text-white">EVP FAOL</p>
                    </div>
                </div>
            )}
        </div>
    );
});
