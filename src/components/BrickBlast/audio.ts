export const playSFX = (src: string, volume: number = 1) => {
    const sound = new Audio(src);
    sound.volume = volume;
    sound.play().catch((err) => console.warn("SFX blocked:", err));
};

let bgm: HTMLAudioElement | null = null;
let isWaitingForInteraction = false;
let intendedToPlay = false;

export const toggleBGM = (src: string, volume: number = 0.3, forceMute?: boolean) => {
    // Initialize the track if it doesn't exist
    if (!bgm) {
        bgm = new Audio(src);
        bgm.loop = true;
        bgm.volume = volume;
    }

    if (forceMute !== undefined) {
        intendedToPlay = !forceMute;
    } else {
        intendedToPlay = bgm.paused;
    }

    if (!intendedToPlay) {
        bgm.pause();
        return;
    }

    // Attempt to play the music
    const playPromise = bgm.play();

    if (playPromise !== undefined) {
        playPromise.catch(() => {

            if (!isWaitingForInteraction) {
                isWaitingForInteraction = true;

                const unlockAudio = () => {
                    isWaitingForInteraction = false;
                    window.removeEventListener("pointerdown", unlockAudio);
                    window.removeEventListener("keydown", unlockAudio);

                    // Only play if the user hasn't clicked the mute button in the meantime!
                    if (intendedToPlay && bgm) {
                        bgm.play().catch(() => {});
                    }
                };

                // Listen for absolutely any interaction
                window.addEventListener("pointerdown", unlockAudio);
                window.addEventListener("keydown", unlockAudio);
            }
        });
    }
};

export const stopBGM = () => {
    if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
        intendedToPlay = false;
    }
};