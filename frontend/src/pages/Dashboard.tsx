import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Activity, FileText, Search, Bell, Settings, LogOut, Download } from 'lucide-react';

const Dashboard = () => {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setReports(data);
            }
        } catch (error) {
            console.error('Error fetching reports:', error);
        }
    };

    const handleDownload = async (reportId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/reports/${reportId}/download`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report_${reportId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to download report');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Error downloading report');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/';
    };

    const uniquePatients = new Set(reports.map(r => r.patient_id)).size;
    const totalScans = reports.length;

    return (
        <div className="pt-20 pb-16 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Saved Reports</h1>
                        <p className="text-gray-400">Welcome back, Dr. Smith</p>
                    </div>
                    <div className="flex items-center space-x-4">

                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        { label: "Total Patients", value: uniquePatients.toString(), icon: <Users className="text-accent" />, change: "+0%" },
                        { label: "Scans Analyzed", value: totalScans.toString(), icon: <Activity className="text-green-500" />, change: "+0%" },
                        { label: "Remaining", value: "0", icon: <FileText className="text-yellow-500" />, change: "0%" },
                    ].map((stat, index) => (
                        <div key={index} className="bg-secondary/50 p-6 rounded-xl border border-white/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    {stat.icon}
                                </div>
                                <span className={`text-sm ${stat.change.startsWith('+') ? 'text-green-500' : 'text-gray-500'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-gray-400 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-secondary/50 rounded-xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Recent Analyses</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search patient..."
                                className="bg-primary border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Patient ID</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium">Disorder</th>
                                    <th className="px-6 py-4 font-medium">Confidence</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {/* Empty state for now as requested */}
                                {reports.length > 0 ? (
                                    reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-white">{report.patient_id}</td>
                                            <td className="px-6 py-4 text-gray-400">
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-white">{report.disorder}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-xs font-medium border border-green-500/20">
                                                    {(report.confidence * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full text-xs font-medium border border-blue-500/20">
                                                    Saved
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleDownload(report.id)}
                                                    className="text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No recent analyses found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
