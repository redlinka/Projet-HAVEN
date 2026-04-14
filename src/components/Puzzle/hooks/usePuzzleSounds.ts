import { useEffect, useState } from "react";
import useSound from "use-sound";

import bgMusic from "/sounds/puzzle/bg2.mp3";
import dropSound from "/sounds/puzzle/drop2.mp3";
import dragSound from "/sounds/puzzle/drag.wav";
import wrongPlacementSound from "/sounds/puzzle/wrong.mp3";

export interface PuzzleSounds {
    isPlayingMusic: boolean;
    isPlayingEffect: boolean;
    setIsPlayingEffect: React.Dispatch<React.SetStateAction<boolean>>;
    toggleMusic: () => void;
    playOnDrag: () => void;
    playOnDrop: () => void;
    playWrongPlacement: () => void;
}

export function usePuzzleSound(): PuzzleSounds {
    const [isPlayingMusic, setIsPlayingMusic] = useState(true);
    const [isPlayingEffect, setIsPlayingEffect] = useState(true);

    const [playGameMusic, { stop: stopMusic, pause: pauseMusic }] = useSound(
        bgMusic,
        { volume: 0.05, loop: true, interrupt: true },
    );

    const [playOnDrag] = useSound(dragSound, { volume: 0.2 });
    const [playOnDrop] = useSound(dropSound, { volume: 0.05 });
    const [playWrongPlacement] = useSound(wrongPlacementSound, { volume: 0.1 });

    useEffect(() => {
        if (isPlayingMusic) playGameMusic();
        return () => {stopMusic();};
    }, [playGameMusic, stopMusic]);

    const toggleMusic = () => {
        setIsPlayingMusic((prev) => {
        if (prev) pauseMusic();
        else playGameMusic();
        return !prev;
        });
    };

    return {
        isPlayingMusic,
        isPlayingEffect,
        setIsPlayingEffect,
        toggleMusic,

        playOnDrag: () => { if (isPlayingEffect) playOnDrag(); },
        playOnDrop: () => { if (isPlayingEffect) playOnDrop(); },
        playWrongPlacement: () => { if (isPlayingEffect) playWrongPlacement(); },
    };
}