import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const links = [
        { name: 'Analyze', path: '/analyze' },
        { name: 'About Us', path: '/about' },
    ];

    return (
        <nav className="fixed w-full z-50 bg-primary/80 backdrop-blur-md border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/dashboard" className="flex items-center space-x-2">
                        <Brain className="h-8 w-8 text-accent" />
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            OrthoAI
                        </span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {links.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${location.pathname === link.path
                                        ? 'text-accent bg-white/5'
                                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <Link
                                to="/dashboard"
                                className="bg-accent hover:bg-accent/90 text-primary px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Saved Reports
                            </Link>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-300 hover:text-white p-2"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-primary border-b border-white/10"
                    >
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {links.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${location.pathname === link.path
                                        ? 'text-accent bg-white/5'
                                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <Link
                                to="/dashboard"
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center bg-accent text-primary px-4 py-2 rounded-md text-base font-medium mt-4"
                            >
                                Saved Reports
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
