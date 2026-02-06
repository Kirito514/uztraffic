import { motion } from 'framer-motion';

const stats = [
    { label: "Svetoforlar", value: "1,240+", desc: "Markaziy boshqaruvda" },
    { label: "O'rtacha Tezlik", value: "35%", desc: "Oshdi" },
    { label: "Tirbandlik", value: "-20%", desc: "Kamaydi" },
    { label: "Tez Yordam", value: "2x", desc: "Tezroq yetib boradi" }
];

export default function Stats() {
    return (
        <section className="py-20 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {stats.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            viewport={{ once: true }}
                            className="text-center"
                        >
                            <h4 className="text-4xl lg:text-5xl font-bold text-white mb-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
                                {stat.value}
                            </h4>
                            <p className="text-blue-400 font-medium mb-1">{stat.label}</p>
                            <p className="text-gray-500 text-sm">{stat.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
