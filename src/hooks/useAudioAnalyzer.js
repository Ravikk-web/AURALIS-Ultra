import { useState, useRef, useCallback } from 'react';

const FFT_SIZE = 2048;
const SMOOTHING_TIME_CONSTANT = 0.8;

export const useAudioAnalyzer = () => {
    const [analyser, setAnalyser] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);

    const initAudio = useCallback(async (sourceType = 'mic') => {
        try {
            // Cleanup previous context and streams
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            const analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = FFT_SIZE;
            analyserNode.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

            let stream;
            if (sourceType === 'mic') {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } else {
                // System/Browser Audio
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: true, // Audio-only displayMedia is not fully supported in all browsers, requesting video ensures prompt
                    audio: {
                        echoCancellation: false,
                        autoGainControl: false,
                        noiseSuppression: false,
                    }
                });
            }
            streamRef.current = stream;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyserNode);
            // Do not connect to destination to avoid feedback loops/double audio

            setAnalyser(analyserNode);
            setIsInitialized(true);
            return true;

        } catch (err) {
            console.error("Error initializing audio:", err);
            alert("Audio access denied or failed. Please allow microphone/system audio permissions.");
            return false;
        }
    }, []);

    const getFrequencyData = () => {
        if (!analyser) return new Uint8Array(0);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        return dataArray;
    };

    const getWaveformData = () => {
        if (!analyser) return new Uint8Array(0);
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);
        return dataArray;
    };

    return { initAudio, getFrequencyData, getWaveformData, isInitialized, analyser };
};
