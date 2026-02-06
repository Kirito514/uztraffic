import { motion, AnimatePresence } from 'framer-motion';
import { Siren, X, MapPin, Clock, Truck } from 'lucide-react';

interface EmergencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId?: string;
    vehicleType?: string;
    eta?: string;
}

export default function EmergencyModal({
    isOpen,
    onClose,
    vehicleId = 'AMB-001',
    vehicleType = 'Tez yordam',
    eta = '~3 daqiqa'
}: EmergencyModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="bg-[#1a1b21] border-2 border-red-500 rounded-2xl max-w-md w-full mx-4 overflow-hidden shadow-2xl shadow-red-500/20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Siren className="w-6 h-6 text-white animate-pulse" />
                                <h3 className="text-lg font-bold text-white">FAVQULODDA SIGNAL</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 text-center">
                            <div className="text-6xl mb-4">🚑</div>
                            <p className="text-xl text-white mb-4">Tez yordam yaqinlashmoqda!</p>

                            <div className="bg-[#14151a] rounded-xl p-4 space-y-3 text-left">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Truck className="w-5 h-5 text-red-400" />
                                    <span className="text-gray-500">Transport:</span>
                                    <span className="font-semibold">{vehicleId}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <MapPin className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-500">Yo'nalish:</span>
                                    <span className="font-semibold">Shimol → Janub</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-300">
                                    <Clock className="w-5 h-5 text-green-400" />
                                    <span className="text-gray-500">ETA:</span>
                                    <span className="font-semibold">{eta}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={onClose}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors"
                            >
                                Tushundim
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
