import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Clock, Brain, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {

    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch User
                const userRes = await fetch('http://localhost:8000/users/me', { headers });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUser(userData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary z-0" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-10 z-0 mix-blend-overlay" />

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        {user && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xl md:text-2xl text-accent mb-4 font-medium"
                            >
                                Welcome back, {user.full_name || user.username}
                            </motion.p>
                        )}
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-gray-400 bg-clip-text text-transparent">
                            AI-Powered Orthopedic <br /> Diagnostics
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
                            Advanced deep learning models for instant detection and classification of bone and joint disorders from X-rays and MRI scans.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/analyze"
                                className="group bg-accent hover:bg-accent/90 text-primary px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                            >
                                <span>Start Analysis</span>
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/about"
                                className="px-8 py-4 rounded-full text-lg font-semibold text-white border border-white/20 hover:bg-white/10 transition-all duration-300"
                            >
                                Learn More
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-secondary/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose OrthoAI?</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Our state-of-the-art technology provides accurate, fast, and reliable diagnostics to assist medical professionals.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Brain className="h-10 w-10 text-accent" />,
                                title: "Advanced AI Models",
                                description: "Powered by ResNet50 and VGG16 for high-accuracy detection of fractures, arthritis, and more."
                            },
                            {
                                icon: <Clock className="h-10 w-10 text-accent" />,
                                title: "Instant Results",
                                description: "Get detailed diagnostic reports and visual heatmaps in seconds, not hours."
                            },
                            {
                                icon: <Shield className="h-10 w-10 text-accent" />,
                                title: "Clinical Grade",
                                description: "Designed to assist healthcare professionals with reliable second opinions and automated reporting."
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-accent/50 transition-colors"
                            >
                                <div className="bg-primary/50 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-400">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-primary border-y border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { number: "98%", label: "Accuracy Rate" },
                            { number: "50k+", label: "Scans Analyzed" },
                            { number: "200+", label: "Hospitals" },
                            { number: "24/7", label: "Availability" }
                        ].map((stat, index) => (
                            <div key={index}>
                                <div className="text-4xl md:text-5xl font-bold text-accent mb-2">{stat.number}</div>
                                <div className="text-gray-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
