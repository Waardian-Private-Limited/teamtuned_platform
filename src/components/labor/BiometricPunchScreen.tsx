"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Script from "next/script";
import { Camera, MapPin, RefreshCw, AlertCircle, User, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { FaceDetection as FaceDetectionType, Results } from "@mediapipe/face_detection";
import toast from "react-hot-toast";

interface BiometricPunchScreenProps {
    siteId: string | number | null;
    siteName?: string | null;
    isKiosk?: boolean;
    onLogout?: () => void;
}

export default function BiometricPunchScreen({
    siteId,
    siteName,
    isKiosk = false,
    onLogout
}: BiometricPunchScreenProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [status, setStatusState] = useState<"idle" | "capturing" | "processing" | "success" | "error">("idle");
    const statusRef = useRef<"idle" | "capturing" | "processing" | "success" | "error">("idle");

    const setStatus = useCallback((newStatus: "idle" | "capturing" | "processing" | "success" | "error") => {
        setStatusState(newStatus);
        statusRef.current = newStatus;
    }, []);

    const [message, setMessage] = useState("Position your face in the frame");
    const [lastPunch, setLastPunch] = useState<{ name: string; type: string; time: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const captureInterval = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);
    const isProcessing = useRef(false);
    const faceDetectionRef = useRef<FaceDetectionType | null>(null);
    const faceSteadyStart = useRef<number | null>(null);
    const requestRef = useRef<number | null>(null);
    const [progress, setProgress] = useState(0);
    const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
    const captureAndPunchRef = useRef<(() => Promise<void>) | null>(null);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setStream(mediaStream);
            setStatus("capturing");
            setError(null);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Could not access camera. Please check permissions.");
            setStatus("error");
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (captureInterval.current) {
            clearInterval(captureInterval.current);
            captureInterval.current = null;
        }
        if (cooldownTimerRef.current) {
            clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }
    }, [stream]);

    const captureAndPunch = useCallback(async () => {
        // Prevent multiple captures and captures during cooldown/success/error states
        if (!videoRef.current || !canvasRef.current || isProcessing.current || status === "success" || status === "error") {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        // Optimization: Use a fixed smaller resolution for faster processing and upload
        // 480x480 is ample for face recognition and results in very small payloads
        const size = 480;
        canvas.width = size;
        canvas.height = size;

        // Square crop from the center of the video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const minDim = Math.min(videoWidth, videoHeight);
        const startX = (videoWidth - minDim) / 2;
        const startY = (videoHeight - minDim) / 2;

        context.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);

        const imageData = canvas.toDataURL("image/jpeg", 0.6); // Slightly lower quality for throughput

        // Lock immediately
        isProcessing.current = true;
        faceSteadyStart.current = null;

        setStatus("processing");
        setProgress(100);
        setMessage("RECOGNIZING...");

        try {
            const response = await apiClient.post("/labor/attendance/biometric/punch", {
                image: imageData,
                site_id: siteId,
                site_name: siteName || "Web Portal",
                device_temperature: 0
            }, {
                withAuth: true,
                tokenKey: 'biometric_token'
            });

            if (!isMounted.current) return;

            if (response?.success) {
                const { laborer, punch } = response;
                setLastPunch({
                    name: laborer.name,
                    type: punch.type,
                    time: new Date(punch.time).toLocaleTimeString()
                });
                setStatus("success");
                setMessage(`${punch.type} SUCCESS`);

                playBeep(true);

                // Clear any existing cooldown timer
                if (cooldownTimerRef.current) {
                    clearTimeout(cooldownTimerRef.current);
                }

                // Reset after cooldown period
                cooldownTimerRef.current = setTimeout(() => {
                    if (isMounted.current) {
                        isProcessing.current = false;
                        setStatus("capturing");
                        setMessage("LOOK AT CAMERA");
                        setProgress(0);
                        faceSteadyStart.current = null;
                        cooldownTimerRef.current = null;
                    }
                }, 5000); // Increased to 5 seconds for better UX
            } else {
                throw new Error(response?.message || "NOT RECOGNIZED");
            }
        } catch (err: any) {
            if (!isMounted.current) return;
            console.error("Punch error:", err);

            playBeep(false);
            setProgress(0);
            setStatus("error");

            // If it's a 401/403, we show it clearly as Unauthorized
            // If it's a 504 (Timeout), we show the specific system message
            if (err.status === 401 || err.status === 403) {
                setMessage("UNAUTHORIZED: INVALID SITE KEY");
            } else if (err.status === 504) {
                setMessage("CONNECTION BUSY: PLEASE RE-SCAN");
            } else {
                setMessage(err.message || "FACE NOT FOUND");
            }

            // Clear any existing cooldown timer
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }

            // Reset after cooldown period
            cooldownTimerRef.current = setTimeout(() => {
                if (isMounted.current) {
                    isProcessing.current = false;
                    setStatus("capturing");
                    setMessage("LOOK AT CAMERA");
                    setProgress(0);
                    faceSteadyStart.current = null;
                    setError(null);
                    cooldownTimerRef.current = null;
                }
            }, 4000);

            if (!err.message?.includes("RECOGNIZED") && !err.message?.includes("FOUND")) {
                toast.error(err.message || "An error occurred");
            }
        }
    }, [siteId, siteName, status]);

    // Keep the ref updated for the stable callback
    useEffect(() => {
        captureAndPunchRef.current = captureAndPunch;
    }, [captureAndPunch]);

    const playBeep = (ok: boolean) => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

            const trigger = (freq: number, duration: number, startTime: number) => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0.1, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            if (ok) {
                // Success: One long beep (500ms)
                trigger(880, 0.5, audioCtx.currentTime);
            } else {
                // Failure: Two short beeps (300ms on, 100ms off)
                trigger(440, 0.3, audioCtx.currentTime);
                trigger(440, 0.3, audioCtx.currentTime + 0.4);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    const [isScriptLoaded, setIsScriptLoaded] = useState(false);

    const initMediaPipe = useCallback(async () => {
        if (!isMounted.current || !isScriptLoaded) return;

        try {
            const FaceDetectionClass = (window as any).FaceDetection;
            if (!FaceDetectionClass) {
                console.warn("FaceDetection class not yet available on window");
                return;
            }

            const faceDetection = new FaceDetectionClass({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
            });

            faceDetection.setOptions({
                model: "short",
                minDetectionConfidence: 0.7,
            });

            faceDetection.onResults((results: Results) => {
                // Don't process if we're in cooldown, processing, success, or error state
                if (!isMounted.current || isProcessing.current || status === "success" || status === "error" || status === "processing") {
                    return;
                }

                const now = Date.now();
                const STEADY_DURATION = 750; // 0.75 seconds (High-Speed Attendance)

                if (results.detections && results.detections.length === 1) {
                    const detection = results.detections[0];
                    const box = detection.boundingBox;

                    // Face Framing Validation (Ensuring face is centered and not too small)
                    // MediaPipe coords are 0-1. We want the face in the middle 60%
                    const isCentered = box.xCenter > 0.2 && box.xCenter < 0.8 && box.yCenter > 0.2 && box.yCenter < 0.8;
                    const isCorrectSize = box.width > 0.15 && box.height > 0.15;

                    if (isCentered && isCorrectSize) {
                        if (!faceSteadyStart.current) {
                            faceSteadyStart.current = now;
                        }

                        const elapsed = now - faceSteadyStart.current;
                        const newProgress = Math.min((elapsed / STEADY_DURATION) * 100, 100);
                        setProgress(newProgress);

                        if (elapsed >= STEADY_DURATION) {
                            if (captureAndPunchRef.current) captureAndPunchRef.current();
                        } else {
                            setMessage("HOLD STEADY...");
                        }
                    } else if (!isCentered) {
                        faceSteadyStart.current = null;
                        setProgress(0);
                        setMessage("CENTER YOUR FACE");
                    } else {
                        faceSteadyStart.current = null;
                        setProgress(0);
                        setMessage("MOVE CLOSER");
                    }
                } else if (results.detections && results.detections.length > 1) {
                    faceSteadyStart.current = null;
                    setProgress(0);
                    setMessage("MULTIPLE FACES DETECTED");
                } else {
                    faceSteadyStart.current = null;
                    setProgress(0);
                    setMessage("LOOK AT CAMERA");
                }
            });

            faceDetectionRef.current = faceDetection;
            startCamera();
        } catch (err) {
            console.error("Failed to initialize MediaPipe:", err);
            setError("Face detection engine failed to start.");
        }
    }, [isScriptLoaded]); // Stable initialization

    // 1. Initialize MediaPipe - ONCE on script load
    useEffect(() => {
        if (!isScriptLoaded) return;
        
        let detectorTimer = setTimeout(initMediaPipe, 200);

        return () => {
            clearTimeout(detectorTimer);
            if (faceDetectionRef.current) {
                console.log("Cleanup: Closing FaceDetection engine");
                try {
                    faceDetectionRef.current.close();
                    faceDetectionRef.current = null;
                } catch (e) {
                    console.error("Error closing detector:", e);
                }
            }
        };
    }, [isScriptLoaded, initMediaPipe]);

    // 2. Lifecycle & Camera Cleanup
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Note: Camera stopping is handled by the stopCamera call, 
            // but we ensure it happens on unmount if not already.
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (cooldownTimerRef.current) {
                clearTimeout(cooldownTimerRef.current);
            }
        };
    }, [stream]);

    // Detection Loop
    useEffect(() => {
        if (stream && videoRef.current) {
            const detectLoop = async () => {
                // Only run detection if video is playing and we have an engine
                if (!isMounted.current || !faceDetectionRef.current || !videoRef.current) {
                    requestRef.current = requestAnimationFrame(detectLoop);
                    return;
                }

                // Skip processing if we are in a non-capturing state (success/error/processing)
                if (statusRef.current !== "capturing" || isProcessing.current) {
                    requestRef.current = requestAnimationFrame(detectLoop);
                    return;
                }

                try {
                    // Final safety: check if engine still exists right before sending
                    if (faceDetectionRef.current && statusRef.current === "capturing") {
                        await faceDetectionRef.current.send({ image: videoRef.current });
                    }
                } catch (e) {
                    console.error("Detection loop error", e);
                }
                requestRef.current = requestAnimationFrame(detectLoop);
            };

            requestRef.current = requestAnimationFrame(detectLoop);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [stream]); // Only restart loop if stream changes

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getStatusColor = () => {
        if (status === 'success') return 'text-green-500';
        if (status === 'error') return 'text-red-500';
        return 'text-cyan-400';
    };

    return (
        <div className="relative w-full h-screen bg-[#0B0B0D] overflow-hidden flex flex-col">
            <Script
                src="https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"
                strategy="afterInteractive"
                onLoad={() => setIsScriptLoaded(true)}
            />
            {/* Header / Top Bar (Matching Machine UI) */}
            <div className="absolute top-0 left-0 w-full h-16 bg-[#141416]/80 backdrop-blur-md border-b border-[#2B2D31] z-50 flex items-center px-6 justify-between">
                <div className="flex items-center gap-6">
                    <Image
                        src="/assets/LogoWhiteText.png"
                        alt="TeamTuned Logo"
                        width={140}
                        height={40}
                        className="h-9 w-auto object-contain"
                        priority
                    />
                    <div className="h-8 w-[1px] bg-[#2B2D31]" />
                    <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <MapPin size={16} />
                        <span className="text-sm truncate max-w-[200px]">{siteName || "Kiosk Unit"}</span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-white font-mono font-bold tracking-wider text-base md:text-lg">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                    {isKiosk && onLogout && (
                        <button
                            onClick={onLogout}
                            className="px-3 py-1.5 text-[10px] md:text-xs font-bold text-gray-400 border border-[#2B2D31] rounded-lg hover:bg-white/5 transition-colors uppercase tracking-widest"
                        >
                            Logout
                        </button>
                    )}
                </div>
            </div>

            {/* Full Screen Camera View */}
            <div className="flex-1 relative w-full h-full">
                {error && status === 'error' && !stream ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-40 bg-black">
                        <AlertCircle size={64} className="text-red-500 mb-4" />
                        <p className="text-xl font-medium">{error}</p>
                        <button
                            onClick={startCamera}
                            className="mt-6 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <RefreshCw size={20} />
                            Retry Camera
                        </button>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] ${status === 'processing' || status === 'success' || status === 'error' ? 'brightness-50 grayscale-[0.5]' : ''
                                }`}
                        />

                        {/* Overlay scan line or frame */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                            {/* Scanning Animation */}
                            {status === 'capturing' && (
                                <>
                                    <svg viewBox="0 0 100 100" className="w-64 h-64 sm:w-80 sm:h-80 md:w-[450px] md:h-[450px] -rotate-90">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            className="fill-none stroke-white/5 stroke-[4]"
                                        />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="42"
                                            pathLength="100"
                                            className="fill-none stroke-cyan-500 stroke-[6] transition-all duration-200 ease-linear shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - progress}
                                        />
                                    </svg>

                                    {/* Corner Accents */}
                                    <div className="absolute w-64 h-64 sm:w-80 sm:h-80 md:w-[450px] md:h-[450px]">
                                        <div className="absolute top-0 left-0 w-8 md:w-12 h-8 md:h-12 border-t-4 border-l-4 border-cyan-500 rounded-tl-2xl md:rounded-tl-3xl shadow-[-5px_-5px_15px_rgba(6,182,212,0.3)]" />
                                        <div className="absolute top-0 right-0 w-8 md:w-12 h-8 md:h-12 border-t-4 border-r-4 border-cyan-500 rounded-tr-2xl md:rounded-tr-3xl shadow-[5px_-5px_15px_rgba(6,182,212,0.3)]" />
                                        <div className="absolute bottom-0 left-0 w-8 md:w-12 h-8 md:h-12 border-b-4 border-l-4 border-cyan-500 rounded-bl-2xl md:rounded-bl-3xl shadow-[-5px_5px_15px_rgba(6,182,212,0.3)]" />
                                        <div className="absolute bottom-0 right-0 w-8 md:w-12 h-8 md:h-12 border-b-4 border-r-4 border-cyan-500 rounded-br-2xl md:rounded-br-3xl shadow-[5px_5px_15px_rgba(6,182,212,0.3)]" />
                                    </div>
                                </>
                            )}

                            {/* Result Card (Matching py UI) */}
                            {(status === 'success' || status === 'error' || status === 'processing') && (
                                <div className={`px-8 md:px-12 py-8 md:py-10 bg-[#1B1C1F] rounded-2xl md:rounded-3xl border-4 md:border-[6px] shadow-2xl flex flex-col items-center justify-center gap-3 md:gap-4 transition-all duration-500 transform scale-100 md:scale-110 w-[85%] max-w-md ${status === 'success' ? 'border-green-500' :
                                        status === 'error' ? 'border-red-500' :
                                            'border-cyan-500 animate-pulse'
                                    }`}>
                                    {status === 'success' ? (
                                        <>
                                            <div className="w-20 md:w-24 h-20 md:h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                                                <CheckCircle2 className="text-green-500 w-12 md:w-16 h-12 md:h-16" />
                                            </div>
                                            <div className="text-3xl sm:text-4xl md:text-6xl font-black text-green-500 tracking-tighter uppercase text-center leading-tight">
                                                {lastPunch?.type || 'PUNCH'}
                                            </div>
                                            <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight text-center mb-1">
                                                {lastPunch?.name || 'Verified'}
                                            </div>
                                            <div className="text-sm md:text-lg text-gray-400 font-mono tracking-widest">{lastPunch?.time}</div>
                                        </>
                                    ) : status === 'error' ? (
                                        <>
                                            <div className="text-xl sm:text-2xl md:text-4xl font-black text-red-500 tracking-widest uppercase mb-1 md:mb-2 text-center">ACCESS DENIED</div>
                                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white text-center px-2 md:px-4">{message}</div>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="text-cyan-500 animate-spin w-12 h-12 md:w-16 md:h-16 mb-2 md:mb-4" />
                                            <div className="text-xl sm:text-2xl md:text-3xl font-black text-cyan-500 tracking-widest uppercase">VERIFYING...</div>
                                            <div className="text-xs md:text-base text-gray-400 font-medium tracking-wide">Do not move your face</div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Status Bar (Matching py UI) */}
                        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-[90%] sm:w-auto sm:min-w-[400px] md:min-w-[500px] px-6 md:px-10 py-4 md:py-6 bg-[#1B1C1F] border border-[#2B2D31] rounded-2xl shadow-2xl z-40">
                            <div className="flex flex-col items-center gap-1 md:gap-2 text-center">
                                <div className={`text-lg sm:text-xl md:text-2xl font-black tracking-widest uppercase transition-colors duration-300 ${getStatusColor()}`}>
                                    {message}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <canvas ref={canvasRef} className="hidden" />
            </div>
        </div>
    );
}