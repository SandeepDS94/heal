import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Lock, User, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    full_name: fullName,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                let errorMessage = 'Registration failed';
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMessage = data.detail;
                    } else if (Array.isArray(data.detail)) {
                        errorMessage = data.detail.map((err: any) => err.msg).join(', ');
                    } else {
                        errorMessage = JSON.stringify(data.detail);
                    }
                }
                throw new Error(errorMessage);
            }

            // const data = await response.json();
            // localStorage.setItem('token', data.access_token);
            alert('Registration successful! Please log in.');
            navigate('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-primary">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/50 p-8 rounded-2xl border border-white/10 w-full max-w-md backdrop-blur-sm"
            >
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Brain className="h-12 w-12 text-accent" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
                    <p className="text-gray-400">Join OrthoAI to start analyzing scans</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="text"
                                required
                                className="w-full bg-primary border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="Dr. John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="text"
                                required
                                className="w-full bg-primary border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="password"
                                required
                                className="w-full bg-primary border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-3 rounded-lg transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Loader className="h-5 w-5 animate-spin" /> : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link to="/" className="text-accent hover:text-accent/80 font-medium">
                        Sign in here
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
