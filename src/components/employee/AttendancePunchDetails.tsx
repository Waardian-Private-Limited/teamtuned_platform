import React, { useState } from 'react';

interface AttendancePunchDetailsProps {
    type: 'In' | 'Out';
    time: string | null;
    siteName: string | null;
    lat: number | null;
    lng: number | null;
    image: string | null;
}

const AttendancePunchDetails: React.FC<AttendancePunchDetailsProps> = ({
    type,
    time,
    siteName,
    lat,
    lng,
    image,
}) => {
    const hasLocation = lat && lng;
    const formattedTime = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex h-40">
                {/* Info Section (Left) */}
                <div className="w-1/3 p-4 flex flex-col justify-center border-r border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${type === 'In' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            Punch {type}
                        </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
                        {formattedTime}
                    </div>
                    <div className="text-xs text-gray-500 font-medium line-clamp-2" title={siteName || 'Unknown Site'}>
                        {siteName || 'Unknown Site'}
                    </div>
                    {hasLocation && (
                        <div className="mt-auto pt-2 text-[10px] text-gray-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                            {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                        </div>
                    )}
                </div>

                {/* Map Section (Middle) */}
                <div className="w-1/3 relative group border-r border-gray-100">
                    {hasLocation ? (
                        <div className="absolute inset-0 bg-gray-100">
                            <iframe
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0, opacity: isHovered ? 1 : 0.9, transition: 'opacity 0.3s' }}
                                src={`https://www.google.com/maps?q=${lat},${lng}&output=embed&z=15`}
                                allowFullScreen
                            />
                            {/* Overlay to prevent interaction until needed, can remove if full interaction desired */}
                            <div className="absolute inset-0 bg-transparent pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]"></div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <span className="text-xs">No Location</span>
                        </div>
                    )}
                </div>

                {/* Image Section (Right) */}
                <div className="w-1/3 relative bg-gray-100 cursor-pointer overflow-hidden group">
                    {image ? (
                        <>
                            <img
                                src={image}
                                alt={`Punch ${type}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <span className="text-xs">No Photo</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendancePunchDetails;

