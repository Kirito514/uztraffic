import { ScrollText } from 'lucide-react';

export interface TrafficEvent {
    id: string;
    type: 'info' | 'warning' | 'emergency';
    message: string;
    time: string;
}

interface EventsPanelProps {
    events: TrafficEvent[];
}

import { memo } from 'react';

export default memo(function EventsPanel({ events }: EventsPanelProps) {
    const getEventStyle = (type: string) => {
        switch (type) {
            case 'emergency':
                return 'border-l-red-500 bg-red-500/5';
            case 'warning':
                return 'border-l-orange-500 bg-orange-500/5';
            default:
                return 'border-l-blue-500 bg-blue-500/5';
        }
    };

    return (
        <div className="bg-[#1a1b21] border border-white/5 rounded-2xl p-4 flex flex-col h-full">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <ScrollText className="w-4 h-4" />
                Hodisalar
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {events.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-4">
                        Hodisalar yo'q
                    </div>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            className={`p-2 rounded-lg border-l-4 ${getEventStyle(event.type)}`}
                        >
                            <span className="text-xs text-gray-500 block">{event.time}</span>
                            <span className="text-sm text-gray-300">{event.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});
