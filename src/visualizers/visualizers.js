import { PALETTES, getPaletteGradient } from '../utils/palettes';

// Helper to apply common styles
const applyCommonContext = (ctx, settings) => {
    ctx.lineWidth = settings?.lineWidth || 2;
    ctx.shadowBlur = settings?.glow || 0;
    ctx.shadowColor = settings?.glow > 0 ? (ctx.strokeStyle || ctx.fillStyle || '#fff') : 'transparent';
};

// Helper: Get Frequency Data subset based on range and density
const getProcessedData = (frequencyData, settings) => {
    if (!frequencyData || frequencyData.length === 0) return [];

    // 1. Cut frequency Range (simple slicing for now)
    const rangePercent = settings?.freqRange ? settings.freqRange / 100 : 1;
    const endBin = Math.floor(frequencyData.length * rangePercent);
    const rangeData = frequencyData.slice(0, endBin);

    // 2. Sample to Density
    const targetDensity = settings?.density || 64;
    const step = Math.max(1, Math.floor(rangeData.length / targetDensity));

    const result = [];
    for (let i = 0; i < targetDensity; i++) {
        const idx = i * step;
        if (idx < rangeData.length) {
            result.push(rangeData[idx]);
        }
    }
    return result;
}

// Helper for dynamic coloring
const getDynamicColor = (paletteId, time, index, total) => {
    if (paletteId === 'rainbow_flow') {
        const offset = (time * 0.1);
        // Cycle hue over time AND position
        const hue = (index / total * 360 + offset) % 360;
        return `hsl(${hue}, 100%, 50%)`;
    }
    if (paletteId === 'rainbow') {
        return `hsl(${(index / total) * 360}, 100%, 50%)`;
    }
    return null; // Fallback to gradient
};

export default [
    {
        id: 1,
        name: "Radial Ring",
        description: "Circular equalizer bars with neon border.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.15 * (settings?.scale || 1);

            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time); // Pass time for flow

            // Neon Inner Border
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
            ctx.strokeStyle = paletteId === 'rainbow_flow' ? `hsl(${(time * 0.1) % 360}, 100%, 50%)` : '#0ff';
            ctx.lineWidth = 2; // Fixed anchor width
            ctx.shadowBlur = settings?.glow ? settings.glow + 10 : 15;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.stroke();
            ctx.restore();

            const sensitivity = settings?.sensitivity || 1;
            const lineWidth = settings?.lineWidth || 4;

            const data = getProcessedData(frequencyData, settings);
            const bars = data.length;

            applyCommonContext(ctx, settings);

            for (let i = 0; i < bars; i++) {
                const value = data[i] * sensitivity;
                const rad = (Math.PI * 2 / bars) * i - (Math.PI / 2);
                const barHeight = (value / 255) * (Math.min(width, height) * 0.3);
                const x1 = cx + Math.cos(rad) * radius;
                const y1 = cy + Math.sin(rad) * radius;
                const x2 = cx + Math.cos(rad) * (radius + barHeight);
                const y2 = cy + Math.sin(rad) * (radius + barHeight);

                ctx.strokeStyle = getDynamicColor(paletteId, time, i, bars) || gradient;

                ctx.lineWidth = lineWidth;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    },
    {
        id: 2,
        name: "Classic Equalizer",
        description: "High-fidelity vertical frequency bars (Centered).",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            const sensitivity = settings?.sensitivity || 1;
            const padding = settings?.padding || 2;
            const paletteId = settings?.palette || 'neon_cyber';

            const data = getProcessedData(frequencyData, settings);
            const barsToRender = data.length;

            // Calculate width
            let barW;
            if (settings?.barWidth > 0) {
                barW = settings.barWidth;
            } else {
                // Auto width calculation
                barW = ((width / barsToRender) * 0.8) - (padding / 2);
            }

            const sliceWidth = width / barsToRender;
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            // For solid fill gradients, shadowColor needs to be set per bar for best effect? 
            // Or just let context handle global shadow if set.
            if (settings?.glow > 0 && paletteId !== 'rainbow_flow') ctx.shadowColor = typeof gradient === 'string' ? gradient : '#fff';

            for (let i = 0; i < barsToRender; i++) {
                const val = data[i] * sensitivity;
                const h = (val / 255) * height;

                const x = i * sliceWidth + (sliceWidth - barW) / 2;
                const y = height - h;

                const dynamic = getDynamicColor(paletteId, time, i, barsToRender);
                ctx.fillStyle = dynamic || gradient;

                if (dynamic && settings?.glow > 0) ctx.shadowColor = dynamic;

                ctx.fillRect(x, y, barW, h);
            }
        }
    },
    {
        id: 3,
        name: "White Oscilloscope",
        description: "Clean, thin-line raw time-domain waveform.",
        run: ({ ctx, width, height, waveformData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            const paletteId = settings?.palette || 'monochrome';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            ctx.lineWidth = settings?.lineWidth || 2;
            ctx.strokeStyle = (paletteId === 'rainbow_flow') ? getDynamicColor(paletteId, time, 0, 1) || '#fff' : (paletteId === 'monochrome' ? '#fff' : gradient);
            applyCommonContext(ctx, settings);

            ctx.beginPath();
            // Waveform doesn't usually use density settings as it's time domain, but we can skip if needed
            // Keeping full resolution for smooth waves
            const sliceWidth = width * 1.0 / waveformData.length;
            let x = 0;
            for (let i = 0; i < waveformData.length; i++) {
                const v = waveformData[i] / 128.0;
                const y = v * height / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.stroke();
        }
    },
    {
        id: 4,
        name: "Peak-Drop",
        description: "Vertical bars with floating caps.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;

            const data = getProcessedData(frequencyData, settings);
            const bars = data.length;
            const w = width / bars; // Slice width
            const padding = settings?.padding || 2;

            let barW;
            if (settings?.barWidth > 0) {
                barW = settings.barWidth;
            } else {
                barW = w - padding * 2;
            }

            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            for (let i = 0; i < bars; i++) {
                const val = data[i] * sensitivity;
                const h = (val / 255) * height * 0.8;

                const dynamic = getDynamicColor(paletteId, time, i, bars);
                ctx.fillStyle = dynamic || gradient;

                if (dynamic && settings?.glow > 0) ctx.shadowColor = dynamic;

                // Center in slice
                const x = i * w + (w - barW) / 2;

                ctx.fillRect(x, height - h, barW, h);

                // Cap
                ctx.fillStyle = '#fff';
                ctx.fillRect(x, height - h - 10, barW, 4);
            }
        }
    },
    {
        id: 5,
        name: "Mirrored Dual-Side",
        description: "Symmetrical bars.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;
            const data = getProcessedData(frequencyData, settings);
            const bars = data.length;
            const w = width / bars;
            const cy = height / 2;
            const padding = settings?.padding || 1;

            let barW;
            if (settings?.barWidth > 0) {
                barW = settings.barWidth;
            } else {
                barW = w - padding * 2;
            }

            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            for (let i = 0; i < bars; i++) {
                const val = data[i] * sensitivity;
                const h = (val / 255) * (height / 2);

                const dynamic = getDynamicColor(paletteId, time, i, bars);
                ctx.fillStyle = dynamic || gradient;

                if (dynamic && settings?.glow > 0) ctx.shadowColor = dynamic;

                const x = i * w + (w - barW) / 2;

                ctx.fillRect(x, cy - h, barW, h); // Up
                ctx.fillRect(x, cy, barW, h);     // Down
            }
        }
    },
    {
        id: 6,
        name: "Futuristic Layered Waves",
        description: "Overlapping transparent neon waves.",
        run: ({ ctx, width, height, waveformData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const speed = settings?.speed || 1;

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            // Only fallback if paletteObj is missing, else use colors
            // For rainbow flow, colors is empty, so we need special handling
            const isFlow = paletteId === 'rainbow_flow';

            applyCommonContext(ctx, settings);

            for (let layer = 0; layer < 3; layer++) {
                ctx.beginPath();
                ctx.lineWidth = settings?.lineWidth || 3;

                if (isFlow) {
                    ctx.strokeStyle = `hsl(${(time * 0.1 + layer * 60) % 360}, 100%, 50%)`;
                } else if (paletteObj && paletteObj.colors.length > 0) {
                    ctx.strokeStyle = paletteObj.colors[layer % paletteObj.colors.length];
                } else {
                    ctx.strokeStyle = layer === 0 ? '#f0f' : layer === 1 ? '#0ff' : '#ff0';
                }

                ctx.globalAlpha = 0.5;
                const offset = layer * 1000;
                for (let i = 0; i < width; i += 10) {
                    const idx = Math.floor((i / width) * waveformData.length);
                    const v = (waveformData[idx] / 128.0) - 1;
                    const y = height / 2 + v * 200 + Math.sin(i * 0.01 + time * 0.002 * speed + offset) * 50;
                    if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        }
    },
    {
        id: 7,
        name: "Particle Frequency Grid",
        description: "Dots reacting to local frequency.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;

            const cols = Math.floor(Math.sqrt(settings?.density || 200) * 1.5);
            const rows = Math.floor(settings?.density / cols) || 10;

            const cellW = width / cols;
            const cellH = height / rows;

            const step = Math.floor(frequencyData.length / (cols * rows));

            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    const idx = (x + y * cols) * step;
                    if (idx >= frequencyData.length) continue;

                    const val = frequencyData[idx] * sensitivity;
                    const size = (val / 255) * (Math.min(cellW, cellH) * 0.8) * (settings?.scale || 1);

                    const dynamic = getDynamicColor(paletteId, time, x + y * cols, cols * rows);
                    ctx.fillStyle = dynamic || gradient;

                    ctx.globalAlpha = Math.min(1, val / 255);
                    ctx.beginPath();
                    ctx.arc(x * cellW + cellW / 2, y * cellH + cellH / 2, Math.max(0, size), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                }
            }
        }
    },
    {
        id: 8,
        name: "The Mandala",
        description: "8-way kaleido.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;
            const speed = settings?.speed || 1;
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) * 0.4 * (settings?.scale || 1);

            applyCommonContext(ctx, settings);

            const paletteId = settings?.palette || 'neon_cyber';

            for (let s = 0; s < 8; s++) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((Math.PI * 2 / 8) * s + time * 0.0002 * speed);
                ctx.beginPath();

                const points = settings?.density || 100;

                for (let i = 0; i < points; i++) {
                    const idx = i * 2; // skip
                    if (idx >= frequencyData.length) break;

                    const val = frequencyData[idx] * sensitivity;
                    const r = (i / points) * radius;
                    const offset = (val / 255) * 40;

                    const x = Math.cos(i * 0.1) * (r + offset);
                    const y = Math.sin(i * 0.1) * (r + offset);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }

                if (paletteId === 'rainbow' || paletteId === 'rainbow_flow') {
                    ctx.strokeStyle = `hsl(${(time * 0.1 + s * 40) % 360}, 70%, 60%)`;
                } else {
                    ctx.strokeStyle = PALETTES.find(p => p.id === paletteId)?.colors[s % 2] || '#fff';
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    },
    {
        id: 9,
        name: "Frequency Ribbon",
        description: "Continuous flowing path.",
        run: ({ ctx, width, height, frequencyData, settings, time }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;
            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            const points = settings?.density || 200;

            for (let i = 0; i < points; i++) {
                const val = (frequencyData[i * 2] || 0) * sensitivity;
                const y = height / 2 - (val / 255) * 300;
                ctx.lineTo((i / points) * width, y);
            }
            ctx.lineTo(width, height);
            ctx.lineTo(0, height);
            ctx.closePath();

            if (paletteId === 'rainbow' || paletteId === 'rainbow_flow') {
                ctx.fillStyle = `hsla(${(time * 0.1) % 360}, 70%, 50%, 0.5)`;
            } else {
                ctx.fillStyle = gradient;
                ctx.globalAlpha = 0.5;
            }
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        }
    },
    {
        id: 10,
        name: "DNA Helix",
        description: "Intertwined sine waves.",
        run: ({ ctx, width, height, time, frequencyData, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;
            const speed = settings?.speed || 1;
            const bass = (frequencyData[5] * sensitivity) / 255;

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            let c1 = paletteObj?.colors[0] || '#f0f';
            let c2 = paletteObj?.colors[1] || '#0ff';

            if (paletteId === 'rainbow_flow') {
                c1 = `hsl(${(time * 0.1) % 360}, 100%, 50%)`;
                c2 = `hsl(${(time * 0.1 + 180) % 360}, 100%, 50%)`;
            }

            applyCommonContext(ctx, settings);

            const step = Math.max(5, 50 - (settings?.density ? settings.density / 10 : 20));

            for (let i = 0; i < width; i += step) {
                const angle = i * 0.02 + time * 0.002 * speed;
                const y1 = height / 2 + Math.sin(angle) * (50 + bass * 100);
                const y2 = height / 2 + Math.sin(angle + Math.PI) * (50 + bass * 100);
                const size = settings?.barWidth || (settings?.lineWidth ? settings.lineWidth + 2 : 5);

                ctx.fillStyle = c1;
                ctx.beginPath(); ctx.arc(i, y1, size, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = c2;
                ctx.beginPath(); ctx.arc(i, y2, size, 0, Math.PI * 2); ctx.fill();

                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.moveTo(i, y1); ctx.lineTo(i, y2); ctx.stroke();
            }
        }
    },
    {
        id: 11,
        name: "Digital Rainfall",
        description: "Matrix style.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(0, 0, width, height);

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            ctx.fillStyle = paletteObj?.colors[0] || (paletteId === 'rainbow_flow' ? `hsl(${(time * 0.1) % 360},100%,50%)` : '#0f0');

            const sensitivity = settings?.sensitivity || 1;

            const densityMult = (settings?.density / 128) || 1;
            const colWidth = 20 / densityMult;
            const cols = Math.floor(width / colWidth);

            ctx.font = `${Math.max(10, colWidth - 4)}px monospace`;

            for (let i = 0; i < cols; i++) {
                if (Math.random() > 0.95) {
                    const val = frequencyData[i % frequencyData.length] * sensitivity;
                    // const y = (time * (0.2 + val/255)) % height;
                    ctx.fillText(String.fromCharCode(0x30A0 + Math.random() * 96), i * colWidth, Math.random() * height);
                }
            }
        }
    },
    {
        id: 12,
        name: "Concentric Pulses",
        description: "Expanding circles on bass.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const cx = width / 2; const cy = height / 2;
            const sensitivity = settings?.sensitivity || 1;
            const bass = frequencyData[3] * sensitivity;

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            const isFlow = paletteId === 'rainbow_flow';
            const c1 = isFlow ? `hsl(${(time * 0.1) % 360}, 100%, 50%)` : (paletteObj?.colors[0] || '#fff');
            const c2 = isFlow ? `hsl(${(time * 0.1 + 90) % 360}, 100%, 50%)` : (paletteObj?.colors[1] || '#f00');

            ctx.strokeStyle = c1;

            applyCommonContext(ctx, settings);

            if (bass > 200) {
                ctx.lineWidth = 10;
                ctx.beginPath(); ctx.arc(cx, cy, 100 + Math.random() * 50, 0, Math.PI * 2); ctx.stroke();
            }

            const count = Math.ceil((settings?.density || 64) / 10);

            for (let i = 0; i < count; i++) {
                const r = ((time * 0.2) + i * 100) % (Math.min(width, height) / 2);
                const op = 1 - (r / (Math.min(width, height) / 2));
                ctx.globalAlpha = op;
                ctx.strokeStyle = c2;

                ctx.lineWidth = 2 + (bass / 255) * 10;
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    },
    {
        id: 13,
        name: "RGB Glitch Wave",
        description: "Chromatic aberration.",
        run: ({ ctx, width, height, waveformData, settings, time }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);

            const paletteId = settings?.palette || 'neon_cyber';
            const isFlow = paletteId === 'rainbow_flow';

            let colors = ['#f00', '#0f0', '#00f'];
            if (isFlow) {
                colors = [
                    `hsl(${(time * 0.1) % 360}, 100%, 50%)`,
                    `hsl(${(time * 0.1 + 120) % 360}, 100%, 50%)`,
                    `hsl(${(time * 0.1 + 240) % 360}, 100%, 50%)`
                ];
            }

            applyCommonContext(ctx, settings);

            const offsets = [-5, 0, 5];
            for (let c = 0; c < 3; c++) {
                ctx.strokeStyle = colors[c];
                ctx.globalCompositeOperation = 'screen';
                ctx.beginPath();

                const step = Math.max(1, Math.floor(waveformData.length / (settings?.density || 256)));

                for (let i = 0; i < waveformData.length; i += step) {
                    const v = waveformData[i] / 128.0;
                    const y = v * height / 2;
                    const x = (i / waveformData.length) * width + offsets[c];
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
        }
    },
    {
        id: 14,
        name: "Honeycomb Cells",
        description: "Hex grid opacity.",
        run: ({ ctx, width, height, frequencyData, settings, time }) => {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, width, height);

            const baseSize = 30;
            const densityScale = 64 / (settings?.density || 64);
            const size = Math.max(10, baseSize * densityScale);

            const h = size * Math.sqrt(3);
            const w = size * 2 * 0.75;
            const rows = Math.ceil(height / h) + 1;
            const cols = Math.ceil(width / w) + 1;
            const sensitivity = settings?.sensitivity || 1;

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            const isFlow = paletteId === 'rainbow_flow';
            const baseColor = isFlow ? `hsl(${(time * 0.1) % 360}, 100%, 50%)` : (paletteObj?.colors[0] || '#ffc800');

            applyCommonContext(ctx, settings);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const idx = (r * cols + c) % frequencyData.length;
                    const val = (frequencyData[idx] * sensitivity) / 255;
                    const x = c * w;
                    const y = r * h + (c % 2 === 1 ? h / 2 : 0);

                    ctx.fillStyle = baseColor;
                    ctx.globalAlpha = Math.min(1, val * 0.8);

                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const ang = Math.PI / 3 * i;
                        const px = x + Math.cos(ang) * size;
                        const py = y + Math.sin(ang) * size;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = '#333';
                    ctx.stroke();
                }
            }
        }
    },
    {
        id: 15,
        name: "Vortex Spinner",
        description: "Rotating arcs.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, width, height);
            const cx = width / 2; const cy = height / 2;
            const vol = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
            const sensitivity = settings?.sensitivity || 1;
            const speed = 0.001 + (vol * sensitivity / 255) * 0.02;

            applyCommonContext(ctx, settings);

            const count = Math.min(50, (settings?.density || 20) / 2);

            for (let i = 0; i < count; i++) {
                const r = i * (width / 2 / count);
                const start = (time * speed * (i % 2 === 0 ? 1 : -1)) + i;
                const end = start + Math.PI + (vol * sensitivity / 255);
                ctx.strokeStyle = `hsl(${i * 15 + (time * 0.1)}, 100%, 50%)`; // Always dynamic ish? or use scale
                ctx.lineWidth = settings?.lineWidth || 5;
                ctx.beginPath();
                ctx.arc(cx, cy, r, start, end);
                ctx.stroke();
            }
        }
    },
    {
        id: 16,
        name: "Ghost Spectrum",
        description: "Fading trails area.",
        run: ({ ctx, width, height, frequencyData, settings, time }) => {
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;

            const paletteId = settings?.palette || 'neon_cyber';
            const gradient = getPaletteGradient(ctx, width, height, paletteId, time);

            applyCommonContext(ctx, settings);

            const data = getProcessedData(frequencyData, settings);

            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let i = 0; i < data.length; i++) {
                const val = (data[i] * sensitivity) / 255;
                const x = (i / data.length) * width;
                const y = height - val * height * 0.8;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(width, height);

            const isFlow = paletteId === 'rainbow_flow';
            ctx.fillStyle = (paletteId === 'rainbow' || isFlow) ? (isFlow ? `hsl(${(time * 0.1) % 360},100%,50%)` : '#fff') : gradient;

            ctx.globalAlpha = 0.5;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    },
    {
        id: 17,
        name: "Starwarp",
        description: "Starfield tunnel.",
        run: ({ ctx, width, height, frequencyData, time, settings }) => {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;
            const beat = (frequencyData[10] * sensitivity) / 255;
            const speed = 1 + beat * 20 * (settings?.speed || 1);
            const cx = width / 2;
            const cy = height / 2;
            ctx.fillStyle = '#fff';

            const starCount = (settings?.density || 200) * 2;

            for (let i = 0; i < starCount; i++) {
                let r = ((i * 1337) + (time * speed)) % width;
                let angle = (i * 997) % (Math.PI * 2);
                const dist = (r % (Math.min(width, height) / 2));
                const x = cx + Math.cos(angle) * dist;
                const y = cy + Math.sin(angle) * dist;
                const size = (dist / (width / 2)) * (settings?.barWidth || 3);
                ctx.globalAlpha = dist / (width / 2);
                ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }
    },
    {
        id: 18,
        name: "Block Matrix",
        description: "Grid pops on frequency.",
        run: ({ ctx, width, height, frequencyData, settings, time }) => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);
            const sensitivity = settings?.sensitivity || 1;

            const densityMult = (settings?.density || 64) / 64;
            const cols = Math.floor(16 * densityMult);
            const rows = Math.floor(12 * densityMult);

            const w = width / cols;
            const h = height / rows;

            const paletteId = settings?.palette || 'neon_cyber';
            const paletteObj = PALETTES.find(p => p.id === paletteId);
            const isFlow = paletteId === 'rainbow_flow';
            const baseColor = isFlow ? `hsl(${(time * 0.1) % 360}, 100%, 50%)` : (paletteObj?.colors[1] || '#0f0');

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = (x + y * cols) * 2;
                    if (idx >= frequencyData.length) break;
                    const val = (frequencyData[idx] * sensitivity) / 255;

                    const padding = (settings?.padding || 2);

                    ctx.fillStyle = baseColor;
                    ctx.globalAlpha = val;
                    if (w > padding * 2 && h > padding * 2)
                        ctx.fillRect(x * w + padding, y * h + padding, w - padding * 2, h - padding * 2);
                    ctx.globalAlpha = 1;
                }
            }
        }
    }
];
