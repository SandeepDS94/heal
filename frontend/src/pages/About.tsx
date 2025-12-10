import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Award, Globe, Heart, X, Stethoscope, GraduationCap, Building2, Calendar, CheckCircle } from 'lucide-react';

const About = () => {
    const [selectedMember, setSelectedMember] = useState<any>(null);

    const team = [
        {
            name: "Dr. Sarah Chen",
            role: "Chief Medical Officer",
            image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80",
            bio: "Dr. Chen is a pioneer in AI-assisted radiology with over 15 years of clinical experience. She leads our medical validation team ensuring every algorithm meets rigorous clinical standards.",
            specialties: ["Musculoskeletal Radiology", "AI in Medicine", "Trauma Imaging"],
            education: "MD from Johns Hopkins, Fellowship at Mayo Clinic"
        },
        {
            name: "James Wilson",
            role: "Lead AI Engineer",
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80",
            bio: "James brings a decade of experience in computer vision and deep learning. Previously at Google Brain, he now architects our core diagnostic models.",
            specialties: ["Deep Learning", "Computer Vision", "Medical Image Processing"],
            education: "PhD in CS from Stanford University"
        },
        {
            name: "Dr. Michael Ross",
            role: "Orthopedic Specialist",
            image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80",
            bio: "Dr. Ross specializes in complex fracture management. His insights are crucial in tuning our models to detect subtle hairline fractures often missed by the human eye.",
            specialties: ["Orthopedic Surgery", "Sports Medicine", "Fracture Management"],
            education: "MD from Harvard Medical School"
        },
    ];

    // Generate slots for next 2 days
    useEffect(() => {
        const fetchSlots = async () => {
            if (selectedMember) {
                try {
                    // Fetch booked slots
                    const res = await fetch(`http://localhost:8000/appointments/booked?doctor_name=${encodeURIComponent(selectedMember.name)}`);
                    const bookedData = await res.json();

                    const slots = [];
                    const today = new Date();
                    // Mock times: 9 AM, 11 AM, 2 PM, 4 PM
                    const allTimes = ["09:00", "11:00", "14:00", "16:00"];

                    for (let i = 1; i <= 2; i++) {
                        const date = new Date(today);
                        date.setDate(today.getDate() + i);
                        const dateString = date.toISOString().split('T')[0];

                        // Filter out booked times
                        const availableTimes = allTimes.filter(time =>
                            !bookedData.some((b: any) => b.date === dateString && b.time === time)
                        );

                        if (availableTimes.length > 0) {
                            slots.push({
                                date: dateString,
                                times: availableTimes
                            });
                        }
                    }
                    setAvailableSlots(slots);
                } catch (error) {
                    console.error("Error fetching booked slots:", error);
                }
            }
        };

        fetchSlots();
    }, [selectedMember]);

    const handleBookClick = () => {
        setBookingStage('schedule');
    };

    const handleConfirmBooking = async () => {
        if (!selectedDate || !selectedTime || !selectedMember) return;
        setIsBooking(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/book_appointment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    doctor_name: selectedMember.name,
                    appointment_date: selectedDate,
                    appointment_time: selectedTime
                })
            });

            if (response.ok) {
                setBookingStage('confirmation');
            } else {
                alert('Failed to book appointment. Please try again.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        } finally {
            setIsBooking(false);
        }
    };

    const resetModal = () => {
        setSelectedMember(null);
        setBookingStage('profile');
        setSelectedDate('');
        setSelectedTime('');
    };

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
                                {React.cloneElement(stat.icon as any, { size: 32 })}
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
                        {team.map((member, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                onClick={() => setSelectedMember(member)}
                                className="group relative overflow-hidden rounded-2xl cursor-pointer ring-offset-2 focus:ring-2 ring-accent/50 outline-none"
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
                                    <p className="text-gray-400 text-sm mt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">
                                        Click to view profile
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Doctor Details Modal - Removed as per request */}
            <AnimatePresence>
                {selectedMember && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => setSelectedMember(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-secondary border border-white/10 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                            >
                                <X size={24} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <div className="h-64 md:h-full relative">
                                    <img
                                        src={selectedMember.image}
                                        alt={selectedMember.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-secondary to-transparent md:hidden" />
                                </div>

                                <div className="p-8">
                                    <h2 className="text-3xl font-bold text-white mb-2">{selectedMember.name}</h2>
                                    <p className="text-accent text-lg mb-6">{selectedMember.role}</p>

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                                <Users size={18} className="text-accent" /> Biography
                                            </h3>
                                            <p className="text-gray-400 leading-relaxed">
                                                {selectedMember.bio}
                                            </p>
                                        </div>

                                        <div>
                                            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                                <Stethoscope size={18} className="text-accent" /> Specialties
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedMember.specialties.map((s: string, i: number) => (
                                                    <span key={i} className="bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-full text-sm">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                                <GraduationCap size={18} className="text-accent" /> Education
                                            </h3>
                                            <p className="text-gray-400">
                                                {selectedMember.education}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-6 text-sm text-gray-500 italic">
                                        * Consultations are currently managed directly via clinic front desk.
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default About;
