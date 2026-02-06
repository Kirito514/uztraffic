import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeft, Siren, MapPin, Clock, Eye, EyeOff, Thermometer } from 'lucide-react';
import { useState, lazy, Suspense } from 'react';
import Map from '../components/Map';
import StatsPanel from '../components/StatsPanel';
import useTrafficData from '../hooks/useTrafficData';

// Lazy load heavy components
const CongestionChart = lazy(() => import('../components/CongestionChart'));
const SpeedChart = lazy(() => import('../components/SpeedChart'));
const EventsPanel = lazy(() => import('../components/EventsPanel'));
const EmergencyModal = lazy(() => import('../components/EmergencyModal'));

// Loading skeleton for charts
const ChartSkeleton = () => (
    <div className="h-48 bg-white/5 rounded-2xl animate-pulse flex items-center justify-center">
        <div className="text-gray-500 text-sm">Yuklanmoqda...</div>
    </div>
);

export default function Dashboard() {
    const navigate = useNavigate();
    const {
        vehicles,
        stats,
        isConnected,
        events,
        chartData,
        showEmergencyModal,
        triggerEmergency,
        closeEmergencyModal
    } = useTrafficData();

    // Toggle states
    const [showVehicles, setShowVehicles] = useState(true);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showSignals, setShowSignals] = useState(true);
    const [showRoads, setShowRoads] = useState(true);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    return (
        <div className="flex h-screen bg-[#0f1014] text-white overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className={`transition-all duration-500 ease-in-out border-r border-white/5 bg-[#14151a] flex flex-col p-4 ${isMapExpanded ? 'w-0 opacity-0 -translate-x-full p-0 border-none' : 'w-20 md:w-64 opacity-100 translate-x-0'
                }`}>
                <div className={`flex items-center gap-3 px-2 mb-8 ${isMapExpanded ? 'hidden' : 'flex'}`}>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold hidden md:block">Boshqaruv Paneli</span>
                </div>

                <div className={`${isMapExpanded ? 'hidden' : 'block'} flex-1 flex flex-col`}>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white mb-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="hidden md:block">Bosh sahifaga</span>
                    </button>

                    {/* Toggle Buttons */}
                    <div className="hidden md:block mt-4 space-y-2">
                        <button
                            onClick={() => setShowVehicles(!showVehicles)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${showVehicles ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            {showVehicles ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            <span className="text-sm">Transport {showVehicles ? 'ko\'rsatish' : 'yashirish'}</span>
                        </button>
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${showHeatmap ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <Thermometer className="w-4 h-4" />
                            <span className="text-sm">Tirbandlik xaritasi</span>
                        </button>
                        <button
                            onClick={() => setShowSignals(!showSignals)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${showSignals ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">Svetoforlar</span>
                        </button>
                        <button
                            onClick={() => setShowRoads(!showRoads)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${showRoads ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            <span className="text-sm">Yo'l tarmog'i</span>
                        </button>
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${isEditMode ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-white' : 'bg-gray-600'}`} />
                            <span className="text-sm">Tahrirlash rejimi</span>
                        </button>
                    </div>

                    {/* Yo'l holati */}
                    <div className="hidden md:block mt-6 p-4 rounded-lg bg-gray-800 border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Yo'l holati
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-gray-300">Erkin</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                <span className="text-gray-300">Yengil tirbandlik</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                <span className="text-gray-300">O'rtacha</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span className="text-gray-300">Qattiq tirbandlik</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/40">
                            <h3 className="text-sm font-semibold text-red-400 mb-2 hidden md:block">Favqulodda Boshqaruv</h3>
                            <button
                                onClick={triggerEmergency}
                                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2"
                            >
                                <Siren className="w-5 h-5" />
                                <span className="hidden md:block">Tez yordam chaqirish</span>
                            </button>
                        </div>

                        <div className="mt-4 px-2 py-2 flex items-center gap-2 text-xs text-gray-500 justify-center md:justify-start">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <span className="hidden md:block">{isConnected ? 'Tizim faol' : 'Demo rejim'}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <div className={`flex flex-col flex-1 h-full ${isMapExpanded ? 'p-0' : 'p-4'}`}>
                    <header className={`flex items-center justify-between ${isMapExpanded ? 'hidden' : 'mb-4'}`}>
                        <div>
                            <h1 className="text-2xl font-bold">🚦 Trafik Monitoringi</h1>
                            <p className="text-gray-400 text-sm">Real vaqtda kuzatuv • Toshkent shahri</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                            <Clock className="w-5 h-5 text-gray-500" />
                            <div>
                                <p className="text-xl font-mono relative top-1">
                                    {new Date().toLocaleTimeString('uz-UZ', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                        </div>
                    </header>

                    <div className={`${isMapExpanded ? 'hidden' : 'mb-4'}`}>
                        <StatsPanel stats={stats} />
                    </div>

                    {/* Map and Events Row */}
                    <div className={`flex-1 grid gap-4 min-h-0 ${isMapExpanded ? 'grid-cols-1 m-0' : 'grid-cols-1 lg:grid-cols-4 mb-4'}`}>
                        <div className={`relative ${isMapExpanded ? 'h-full w-full' : 'lg:col-span-3'}`}>
                            <Map
                                vehicles={showVehicles ? vehicles : []}
                                showSignals={showSignals}
                                showRoads={showRoads}
                                isEditMode={isEditMode}
                                isExpanded={isMapExpanded}
                                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
                            />
                        </div>
                        <div className={`lg:block ${isMapExpanded ? 'hidden' : 'block'}`}>
                            <EventsPanel events={events} />
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isMapExpanded ? 'hidden' : 'block'}`}>
                        <Suspense fallback={<ChartSkeleton />}>
                            <CongestionChart data={chartData.congestion} labels={chartData.labels} />
                        </Suspense>
                        <Suspense fallback={<ChartSkeleton />}>
                            <SpeedChart data={chartData.speed} labels={chartData.labels} />
                        </Suspense>
                    </div>
                </div>
            </main>

            {/* Emergency Modal */}
            <EmergencyModal
                isOpen={showEmergencyModal}
                onClose={closeEmergencyModal}
            />
        </div>
    );
}
