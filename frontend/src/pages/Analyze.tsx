import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Activity, CheckCircle, Loader, PenTool, Eraser, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Analyze = () => {
    const [file, setFile] = useState<File | null>(null);
    const [patientId, setPatientId] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [preview, setPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch user info for doctor name
    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch('http://localhost:8000/users/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const user = await res.json();
                        setDoctorName(user.full_name || user.username);
                    }
                } catch (e) {
                    console.error("Failed to fetch user", e);
                }
            }
        };
        fetchUser();
    }, []);

    // Annotation state
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const selectedFile = e.dataTransfer.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
        }
    };

    const clearFile = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Canvas drawing logic
    useEffect(() => {
        if (preview && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = preview;
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx?.drawImage(img, 0, 0);

                // Draw damage location if available
                if (result?.damage_location) {
                    const { x, y, width, height } = result.damage_location;
                    if (ctx) {
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 5;
                        // Handle normalized coordinates (0-1)
                        // If values are already > 1 (legacy support/safety), treat as pixels
                        const isNormalized = x <= 1 && y <= 1 && width <= 1 && height <= 1;

                        const drawX = isNormalized ? x * canvas.width : x;
                        const drawY = isNormalized ? y * canvas.height : y;
                        const drawW = isNormalized ? width * canvas.width : width;
                        const drawH = isNormalized ? height * canvas.height : height;

                        // ctx.strokeRect(drawX, drawY, drawW, drawH);
                        // Draw Circle instead of Ellipse
                        ctx.beginPath();
                        // Use max dimension to ensure it covers the area, and keep the 1.2x scaling
                        const maxDim = Math.max(drawW, drawH);
                        const radius = (maxDim / 2) * 1.2;

                        // circle(x, y, radius, startAngle, endAngle)
                        ctx.arc(drawX + drawW / 2, drawY + drawH / 2, radius, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                }
            };
        }
    }, [preview, result]);

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = tool === 'pen' ? '#ef4444' : 'rgba(0,0,0,0)';
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const data = await response.json();
            setResult({
                disorder: data.disorder,
                confidence: data.confidence,
                heatmap: preview,
                severity: data.severity,
                notes: data.notes,
                detailed_analysis: data.detailed_analysis,
                recommendations: data.recommendations,
                damage_location: data.damage_location
            });
        } catch (error) {
            console.error('Error analyzing image:', error);
            alert('Failed to analyze image. Please ensure backend is running.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!file || !result) return;

        let fileToSend = file;
        let isAnnotated = false;

        // Use canvas blob if available (annotated view)
        if (canvasRef.current) {
            try {
                const blob = await new Promise<Blob | null>(resolve => canvasRef.current?.toBlob(resolve, 'image/png'));
                if (blob) {
                    fileToSend = new File([blob], "annotated_image.png", { type: 'image/png' });
                    isAnnotated = true;
                }
            } catch (e) {
                console.error("Failed to get canvas blob", e);
            }
        }

        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('patient_id', patientId || 'Anonymous');
        formData.append('doctor_name', doctorName);
        formData.append('disorder', result.disorder);
        formData.append('confidence', result.confidence.toString());
        formData.append('severity', result.severity);
        formData.append('notes', result.notes);
        formData.append('is_annotated_image', isAnnotated.toString());

        if (result.detailed_analysis) formData.append('detailed_analysis', result.detailed_analysis);
        if (result.recommendations) formData.append('recommendations', JSON.stringify(result.recommendations));
        if (result.damage_location) formData.append('damage_location', JSON.stringify(result.damage_location));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/report', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'medical_report.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report');
        }
    };

    const handleSaveReport = async () => {
        if (!file || !result) return;

        let fileToSend = file;
        let isAnnotated = false;

        // Use canvas blob if available (annotated view)
        if (canvasRef.current) {
            try {
                const blob = await new Promise<Blob | null>(resolve => canvasRef.current?.toBlob(resolve, 'image/png'));
                if (blob) {
                    fileToSend = new File([blob], "annotated_image.png", { type: 'image/png' });
                    isAnnotated = true;
                }
            } catch (e) {
                console.error("Failed to get canvas blob", e);
            }
        }

        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('patient_id', patientId || 'Anonymous');
        formData.append('doctor_name', doctorName);
        formData.append('disorder', result.disorder);
        formData.append('confidence', result.confidence.toString());
        formData.append('severity', result.severity);
        formData.append('notes', result.notes);
        formData.append('is_annotated_image', isAnnotated.toString());

        if (result.detailed_analysis) formData.append('detailed_analysis', result.detailed_analysis);
        if (result.recommendations) formData.append('recommendations', JSON.stringify(result.recommendations));
        if (result.damage_location) formData.append('damage_location', JSON.stringify(result.damage_location));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/report?save_only=true', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (response.ok) {
                alert('Report saved successfully!');
            } else {
                throw new Error('Failed to save report');
            }
        } catch (error) {
            console.error('Error saving report:', error);
            alert('Failed to save report');
        }
    };

    return (
        <div className="pt-20 pb-16 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Analyze Medical Image</h1>
                    <p className="text-gray-400">Upload, Annotate, and Analyze</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Upload & Annotation Section */}
                    <div className="space-y-6">
                        <div className="bg-secondary/50 p-8 rounded-2xl border border-white/10">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Patient ID</label>
                                    <input
                                        type="text"
                                        value={patientId}
                                        onChange={(e) => setPatientId(e.target.value)}
                                        placeholder="Enter Patient ID"
                                        className="w-full bg-primary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Doctor Name</label>
                                    <input
                                        type="text"
                                        value={doctorName}
                                        onChange={(e) => setDoctorName(e.target.value)}
                                        placeholder="Enter Doctor Name"
                                        className="w-full bg-primary border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                            </div>

                            <div
                                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors relative ${preview ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-accent/50'
                                    }`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <AnimatePresence mode="wait">
                                    {preview ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="relative"
                                        >
                                            <canvas
                                                ref={canvasRef}
                                                onMouseDown={startDrawing}
                                                onMouseUp={stopDrawing}
                                                onMouseMove={draw}
                                                onMouseLeave={stopDrawing}
                                                className="max-h-[400px] mx-auto rounded-lg shadow-lg cursor-crosshair"
                                                style={{ maxWidth: '100%' }}
                                            />

                                            <div className="absolute top-2 left-2 flex space-x-2 bg-black/50 p-2 rounded-lg">
                                                <button
                                                    onClick={() => setTool('pen')}
                                                    className={`p-2 rounded ${tool === 'pen' ? 'bg-accent text-primary' : 'text-white hover:bg-white/10'}`}
                                                >
                                                    <PenTool className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setTool('eraser')}
                                                    className={`p-2 rounded ${tool === 'eraser' ? 'bg-accent text-primary' : 'text-white hover:bg-white/10'}`}
                                                >
                                                    <Eraser className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <button
                                                onClick={clearFile}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </motion.div >
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="py-12"
                                        >
                                            <div className="bg-accent/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Upload className="h-10 w-10 text-accent" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-2">
                                                Drag & Drop your scan here
                                            </h3>
                                            <p className="text-gray-400 mb-6">or click to browse files</p>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-colors"
                                            >
                                                Select File
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div >

                            <button
                                onClick={handleAnalyze}
                                disabled={!file || isAnalyzing}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center space-x-2 ${!file || isAnalyzing
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-accent hover:bg-accent/90 text-primary shadow-lg shadow-accent/20'
                                    }`}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader className="h-5 w-5 animate-spin" />
                                        <span>Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Activity className="h-5 w-5" />
                                        <span>Analyze Image</span>
                                    </>
                                )}
                            </button>
                        </div >

                        {/* Results Section */}
                        <div className="bg-secondary/50 rounded-2xl border border-white/10 p-8">
                            <h2 className="text-2xl font-bold text-white mb-6">Analysis Results</h2>

                            <AnimatePresence mode="wait">
                                {result ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-8"
                                    >
                                        <div className="flex items-center space-x-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                            <CheckCircle className="h-8 w-8 text-green-500" />
                                            <div>
                                                <h3 className="text-green-500 font-semibold">Analysis Complete</h3>
                                                <p className="text-green-400/80 text-sm">Confidence Score: {(result.confidence * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-gray-400 text-sm">Detected Disorder</label>
                                                <div className="text-3xl font-bold text-white mt-1">{result.disorder}</div>
                                            </div>

                                            <div>
                                                <label className="text-gray-400 text-sm">Severity Level</label>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-yellow-500"
                                                            style={{ width: '60%' }}
                                                        />
                                                    </div>
                                                    <span className="text-yellow-500 font-medium">{result.severity}</span>
                                                </div>
                                            </div>

                                            {result.detailed_analysis && (
                                                <div>
                                                    <label className="text-gray-400 text-sm">Detailed Analysis</label>
                                                    <p className="text-gray-300 mt-1 text-sm">{result.detailed_analysis}</p>
                                                </div>
                                            )}

                                            {result.recommendations && result.recommendations.length > 0 && (
                                                <div>
                                                    <label className="text-gray-400 text-sm">Recommendations</label>
                                                    <ul className="list-disc list-inside text-gray-300 mt-1 text-sm">
                                                        {result.recommendations.map((rec: string, index: number) => (
                                                            <li key={index}>{rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            <div>
                                                <label className="text-gray-400 text-sm">Clinical Notes</label>
                                                <p className="text-gray-300 mt-1">{result.notes}</p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/10 flex space-x-4">
                                            <button
                                                onClick={handleSaveReport}
                                                className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                            >
                                                <Save className="h-5 w-5" />
                                                <span>Save Report</span>
                                            </button>
                                            <button
                                                onClick={handleDownloadReport}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                            >
                                                <FileText className="h-5 w-5" />
                                                <span>Download PDF</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                                        <Activity className="h-16 w-16 text-gray-600 mb-4" />
                                        <h3 className="text-xl font-semibold text-gray-400">No Analysis Yet</h3>
                                        <p className="text-gray-500 max-w-sm mt-2">
                                            Upload an image, mark affected areas, and click "Analyze".
                                        </p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analyze;
