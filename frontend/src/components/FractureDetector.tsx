import React, { useState, useRef } from 'react';
import axios from 'axios';

interface Detection {
    bbox: [number, number, number, number];
    confidence: number;
    class: string;
    class_id: number;
}

const FractureDetector: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [detections, setDetections] = useState<Detection[]>([]);
    const [maskData, setMaskData] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setDetections([]);
            setMaskData(null);
            setError(null);
        }
    };

    const handleDetect = async () => {
        if (!selectedImage) return;

        setLoading(true);
        setError(null);
        setMaskData(null);
        const formData = new FormData();
        formData.append('file', selectedImage);

        try {
            const token = localStorage.getItem('token');
            const headers: any = {
                'Content-Type': 'multipart/form-data',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Use the new /segment endpoint which returns both detections AND a mask
            const response = await axios.post('http://localhost:8000/segment', formData, {
                headers: headers
            });

            if (response.data.detections) {
                setDetections(response.data.detections);
            }
            if (response.data.mask) {
                setMaskData(response.data.mask);
            }
        } catch (err: any) {
            console.error(err);
            setError('Failed to detect/segment fractures. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Fracture Segmentation (U-Net)</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Upload X-Ray Image
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                    />
                </div>

                {previewUrl && (
                    <div className="relative inline-block border rounded-lg overflow-hidden">
                        <img
                            ref={imageRef}
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full h-auto block"
                            style={{ maxHeight: '500px' }}
                        />

                        {/* Segmentation Mask Overlay */}
                        {maskData && (
                            <img
                                src={maskData}
                                alt="Segmentation Mask"
                                className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-60 mix-blend-multiply"
                            />
                        )}

                        {detections.map((det, index) => {
                            if (!imageRef.current) return null;
                            const imgElement = imageRef.current;
                            const scaleX = imgElement.width / imgElement.naturalWidth;
                            const scaleY = imgElement.height / imgElement.naturalHeight;

                            const [x1, y1, x2, y2] = det.bbox;

                            const width = (x2 - x1) * scaleX;
                            const height = (y2 - y1) * scaleY;

                            // Make it a circle (use max dimension) and slightly bigger (1.2x)
                            const size = Math.max(width, height) * 1.2;

                            // Center the circle on the original box center
                            const centerX = x1 * scaleX + width / 2;
                            const centerY = y1 * scaleY + height / 2;

                            const style = {
                                left: `${centerX - size / 2}px`,
                                top: `${centerY - size / 2}px`,
                                width: `${size}px`,
                                height: `${size}px`,
                                position: 'absolute' as 'absolute',
                                border: '3px solid red',
                                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                borderRadius: '50%',
                            };

                            return (
                                <div key={index} style={style}>
                                    <span className="bg-red-600 text-white text-xs px-1 absolute -top-5 left-0">
                                        {det.class} ({Math.round(det.confidence * 100)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-4">
                    <button
                        onClick={handleDetect}
                        disabled={!selectedImage || loading}
                        className={`bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors ${(!selectedImage || loading) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                    >
                        {loading ? 'Analyzing...' : 'Segment Damage Area'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 text-red-600">
                        {error}
                    </div>
                )}
            </div>

            {
                (detections.length > 0 || maskData) && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
                        {detections.length > 0 ? (
                            <ul>
                                {detections.map((det, idx) => (
                                    <li key={idx} className="mb-2 border-b pb-2 last:border-0">
                                        <span className="font-semibold text-blue-600">{det.class}</span> - Confidence: {(det.confidence * 100).toFixed(1)}%
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-600">No objects detected by YOLO, but mask generation attempted.</p>
                        )}
                    </div>
                )
            }
        </div >
    );
};

export default FractureDetector;
