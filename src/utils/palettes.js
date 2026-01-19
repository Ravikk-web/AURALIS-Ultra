
export const PALETTES = [
    { id: 'neon_cyber', name: 'Cyberpunk', colors: ['#f0f', '#0ff', '#f00'], type: 'gradient' },
    { id: 'rainbow_flow', name: 'Rainbow Flow 🌈', colors: [], type: 'dynamic' }, // New Animated Palette
    { id: 'sunset', name: 'Sunset Blvd', colors: ['#ff4e50', '#f9d423'], type: 'gradient' },
    { id: 'oceanic', name: 'Deep Ocean', colors: ['#2E3192', '#1BFFFF'], type: 'gradient' },
    { id: 'matrix', name: 'The Matrix', colors: ['#000000', '#0f0'], type: 'gradient' },
    { id: 'fire_ice', name: 'Fire & Ice', colors: ['#f12711', '#f5af19', '#00c6ff', '#0072ff'], type: 'complex' },
    { id: 'pastel', name: 'Pastel Dream', colors: ['#ff9a9e', '#fad0c4', '#fad0c4'], type: 'gradient' },
    { id: 'monochrome', name: 'Monochrome', colors: ['#fff', '#888', '#222'], type: 'gradient' },
    { id: 'golden', name: 'Golden Hour', colors: ['#CAC531', '#F3F9A7'], type: 'gradient' },
    { id: 'royal', name: 'Royal Violet', colors: ['#7F00FF', '#E100FF'], type: 'gradient' },
    { id: 'toxic', name: 'Toxic Lime', colors: ['#DCE35B', '#45B649'], type: 'gradient' },
    { id: 'cherry', name: 'Cherry Bomb', colors: ['#EB3349', '#F45C43'], type: 'gradient' },
    { id: 'space', name: 'Deep Space', colors: ['#000000', '#434343'], type: 'gradient' },
    { id: 'rainbow', name: 'Rainbow Road', colors: ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'], type: 'spectrum' },
    { id: 'cotton', name: 'Cotton Candy', colors: ['#D9AFD9', '#97D9E1'], type: 'gradient' },
    { id: 'midnight', name: 'Midnight City', colors: ['#232526', '#414345'], type: 'gradient' },
];

export const getColor = (paletteId, value, index, total) => {
    const palette = PALETTES.find(p => p.id === paletteId) || PALETTES[0];
    if (palette.type === 'spectrum') {
        return `hsl(${(index / total) * 360}, 100%, 50%)`;
    }
    return palette.colors[index % palette.colors.length];
};

export const getPaletteGradient = (ctx, width, height, paletteId, time = 0) => {
    // Dynamic handling for rainbow flow in gradient mode
    if (paletteId === 'rainbow_flow') {
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        const t = time * 0.05; // speed
        gradient.addColorStop(0, `hsl(${t % 360}, 100%, 50%)`);
        gradient.addColorStop(0.5, `hsl(${(t + 90) % 360}, 100%, 50%)`);
        gradient.addColorStop(1, `hsl(${(t + 180) % 360}, 100%, 50%)`);
        return gradient;
    }

    const palette = PALETTES.find(p => p.id === paletteId) || PALETTES[0];
    // Safe fallback if active palette has no colors array (like rainbow_flow if caught here generic)
    if (!palette.colors || palette.colors.length === 0) return '#fff';

    const gradient = ctx.createLinearGradient(0, height, 0, 0); // Bottom to top
    palette.colors.forEach((c, i) => {
        gradient.addColorStop(i / (palette.colors.length - 1), c);
    });
    return gradient;
}
