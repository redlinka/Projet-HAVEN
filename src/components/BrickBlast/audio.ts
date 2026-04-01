export const playSFX = (src: string, volume: number = 1) => {
    const sound = new Audio(src);
    sound.volume = volume;

    sound.play().catch((err) => console.warn("Audio blocked by browser:", err));
};

let bgm: HTMLAudioElement | null = null;

export const toggleBGM = (src: string, volume: number = 0.3, forceMute?: boolean) => {
    // 1. Initialize the track if it doesn't exist yet
    if (!bgm) {
        bgm = new Audio(src);
        bgm.loop = true; // 🔥 This forces it to loop infinitely
        bgm.volume = volume;
    }

    // 2. If a specific state is requested (like from a save file or button state)
    if (forceMute !== undefined) {
        if (forceMute) {
            bgm.pause();
        } else {
            bgm.play().catch(e => console.warn("BGM autoplay blocked:", e));
        }
        return;
    }

    // 3. Otherwise, just flip it
    if (bgm.paused) {
        bgm.play().catch(e => console.warn("BGM autoplay blocked:", e));
    } else {
        bgm.pause();
    }
};