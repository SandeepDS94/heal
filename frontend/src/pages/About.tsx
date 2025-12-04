import React from 'react';
import { motion } from 'framer-motion';
import { Users, Award, Globe, Heart } from 'lucide-react';

const About = () => {
    return (
        <div className="pt-20 pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6"
                    >
                        Revolutionizing Orthopedic Care
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-400 max-w-3xl mx-auto"
                    >
                        OrthoAI combines cutting-edge artificial intelligence with medical expertise to provide faster, more accurate diagnoses for bone and joint disorders.
                    </motion.p>
                </div>

                {/* Mission & Vision */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-secondary/50 p-8 rounded-2xl border border-white/10"
                    >
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Globe className="text-accent" /> Our Mission
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            To democratize access to high-quality orthopedic diagnostics by leveraging the power of AI. We aim to support healthcare professionals worldwide with reliable, instant second opinions, reducing diagnostic errors and improving patient outcomes.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-secondary/50 p-8 rounded-2xl border border-white/10"
                    >
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Heart className="text-accent" /> Our Vision
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            A world where early detection of bone and joint disorders is accessible to everyone, regardless of location. We envision OrthoAI as the standard assistant in every radiology department, enhancing human expertise with machine precision.
                        </p>
                    </motion.div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24">
                    {[
                        { icon: <Users />, label: "Expert Doctors", value: "50+" },
                        { icon: <Award />, label: "Awards Won", value: "12" },
                        { icon: <Globe />, label: "Countries", value: "30+" },
                        { icon: <Heart />, label: "Lives Impacted", value: "100k+" },
                    ].map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="text-center p-6 bg-white/5 rounded-xl border border-white/10"
                        >
                            <div className="flex justify-center mb-4 text-accent">
                                {React.cloneElement(stat.icon as React.ReactElement, { size: 32 })}
                            </div>
                            <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                            <div className="text-gray-400">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Team Section */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-12">Meet Our Team</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { name: "Dr. Sarah Chen", role: "Chief Medical Officer", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80" },
                            { name: "James Wilson", role: "Lead AI Engineer", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80" },
                            { name: "Dr. Michael Ross", role: "Orthopedic Specialist", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80" },
                        ].map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="group relative overflow-hidden rounded-2xl"
                            >
                                <div className="aspect-w-3 aspect-h-4">
                                    <img
                                        src={member.image}
                                        alt={member.name}
                                        className="object-cover w-full h-96 group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                                    <p className="text-accent">{member.role}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
