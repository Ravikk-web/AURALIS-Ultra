import React, { useRef, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { PictureInPicture2 } from 'lucide-react';

const CanvasRenderer = forwardRef(({ visualizer, analyser, settings = { sensitivity: 1 } }, ref) => {
    const canvasRef = useRef(null);
    const videoRef = useRef(null); // Hidden video for PiP
    const animationRef = useRef(null);
    const settingsRef = useRef(settings);
    const [isPiPActive, setIsPiPActive] = useState(false);

    // Keep settings ref updated
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // Pre-allocate buffers
    const buffersRef = useRef({
        frequency: new Uint8Array(0),
        waveform: new Uint8Array(0)
    });

    // Expose PiP functionality
    useImperativeHandle(ref, () => ({
        togglePiP: async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas) return;

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPiPActive(false);
            } else {
                try {
                    if (video.srcObject == null) {
                        const stream = canvas.captureStream(60); // 60 FPS
                        video.srcObject = stream;
                        // Determine if audio track exists from analyser? 
                        // Canvas stream has no audio. 
                        // If we want audio in PiP (tab muting might handle it), usually separate.
                        // PiP window usually just video.
                        await video.play();
                    }
                    await video.requestPictureInPicture();
                    setIsPiPActive(true);
                } catch (err) {
                    console.error("PiP Error:", err);
                }
            }
        }
    }));

    useEffect(() => {
        const handleLeavePiP = () => {
            setIsPiPActive(false);
        };
        const video = videoRef.current;
        if (video) {
            video.addEventListener('leavepictureinpicture', handleLeavePiP);
        }
        return () => {
            if (video) video.removeEventListener('leavepictureinpicture', handleLeavePiP);
        }
    }, []);

    useEffect(() => {
        if (analyser) {
            buffersRef.current.frequency = new Uint8Array(analyser.frequencyBinCount);
            buffersRef.current.waveform = new Uint8Array(analyser.fftSize);
        }
    }, [analyser]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const ctx = canvas.getContext('2d', { alpha: false });

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        };

        resize();
        window.addEventListener('resize', resize);

        const render = (time) => {
            if (!analyser) {
                ctx.fillStyle = "#000";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                animationRef.current = requestAnimationFrame(render);
                return;
            }

            analyser.getByteFrequencyData(buffersRef.current.frequency);
            analyser.getByteTimeDomainData(buffersRef.current.waveform);

            // Apply Noise Threshold / Calibration
            const threshold = settingsRef.current?.noiseThreshold || 0;
            if (threshold > 0) {
                for (let i = 0; i < buffersRef.current.frequency.length; i++) {
                    if (buffersRef.current.frequency[i] < threshold) {
                        buffersRef.current.frequency[i] = 0;
                    }
                }
            }

            if (visualizer) {
                visualizer({
                    ctx,
                    canvas,
                    width: canvas.width,
                    height: canvas.height,
                    frequencyData: buffersRef.current.frequency,
                    waveformData: buffersRef.current.waveform,
                    time,
                    dpr,
                    settings: settingsRef.current
                });
            }

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationRef.current);
        };
    }, [visualizer, analyser]);

    return (
        <>
            <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full block bg-black touch-none" />
            <video ref={videoRef} className="hidden" muted playsInline />

            {/* PiP Optimization Overlay */}
            {isPiPActive && (
                <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-4 animate-pulse opacity-50">
                        <PictureInPicture2 size={64} className="text-zinc-500" />
                        <span className="text-zinc-500 font-mono tracking-[0.2em] text-sm uppercase">PiP Enabled</span>
                    </div>
                </div>
            )}
        </>
    );
});

CanvasRenderer.displayName = 'CanvasRenderer';

export default CanvasRenderer;
