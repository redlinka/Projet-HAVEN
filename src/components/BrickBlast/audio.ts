export const playSFX = (src: string, volume: number = 1) => {
    const sound = new Audio(src);
    sound.volume = volume;

    sound.play().catch((err) => console.warn("Audio blocked by browser:", err));
};

let bgm: HTMLAudioElement | null = null;

export const toggleBGM = (src: string, volume: number = 0.3, forceMute?: boolean) => {
    //Initialize the track if it doesn't exist yet
    if (!bgm) {
        bgm = new Audio(src);
        bgm.loop = true;
        bgm.volume = volume;
    }

    //If a specific state is requested
    if (forceMute !== undefined) {
        if (forceMute) {
            bgm.pause();
        } else {
            bgm.play().catch(e => console.warn("BGM autoplay blocked:", e));
        }
        return;
    }

    //Otherwise, just flip it
    if (bgm.paused) {
        bgm.play().catch(e => console.warn("BGM autoplay blocked:", e));
    } else {
        bgm.pause();
    }
};

export const stopBGM = () => {
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
    }
};