import { motion } from 'framer-motion';
import { Database, Zap, Shield, Smartphone, Globe, Activity } from 'lucide-react';

const features = [
    {
        title: "AI Boshqaruv",
        desc: "Sun'iy intellekt orqali svetoforlarni 35% ga optimallashtirish.",
        icon: Zap,
        colSpan: "col-span-12 md:col-span-8",
        bg: "bg-gradient-to-br from-blue-600/20 to-indigo-600/20",
        border: "border-blue-500/20"
    },
    {
        title: "Real Vaqt",
        desc: "Har bir chorraha 24/7 nazorat ostida.",
        icon: Activity,
        colSpan: "col-span-12 md:col-span-4",
        bg: "bg-white/5",
        border: "border-white/10"
    },
    {
        title: "EVP Tizimi",
        desc: "Tez yordam va o't o'chirish mashinalari uchun yashil yo'lak.",
        icon: Shield,
        colSpan: "col-span-12 md:col-span-4",
        bg: "bg-white/5",
        border: "border-white/10"
    },
    {
        title: "Global Statistikalar",
        desc: "Shahar bo'ylab to'liq ma'lumotlar bazasi.",
        icon: Globe,
        colSpan: "col-span-12 md:col-span-8",
        bg: "bg-gradient-to-br from-purple-600/20 to-pink-600/20",
        border: "border-purple-500/20"
    }
];

export default function BentoGrid() {
    return (
        <section className="py-24 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            Kelajak Texnologiyalari
                        </span>
                    </h2>
                    <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                        Bizning tizim eng so'nggi texnologiyalar asosida qurilgan bo'lib,
                        shahar trafigini butunlay yangi darajaga olib chiqadi.
                    </p>
                </motion.div>

                <div className="grid grid-cols-12 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className={`${feature.colSpan} relative group overflow-hidden rounded-3xl p-8 ${feature.bg} border ${feature.border} backdrop-blur-sm hover:border-white/20 transition-all duration-300`}
                        >
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="p-3 bg-white/10 w-fit rounded-xl mb-6 group-hover:bg-white/20 transition-colors">
                                    <feature.icon className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                                    <p className="text-gray-400">{feature.desc}</p>
                                </div>
                            </div>

                            {/* Hover Gradient Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
