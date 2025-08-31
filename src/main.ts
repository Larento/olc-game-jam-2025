import * as ex from 'excalibur'
import { loader } from './resources'
import { level_scenes, LevelSelect } from './level-select'

// Goal is to keep main.ts small and just enough to configure the engine

const game = new ex.Engine({
    width: 1280, // Logical width and height in game pixels
    height: 720,
    displayMode: ex.DisplayMode.Fixed, // Display mode tells excalibur how to fill the window
    pixelRatio: 1,
    pixelArt: true, // pixelArt will turn on the correct settings to render pixel art without jaggies or shimmering artifacts
    scenes: {
        select_level: LevelSelect,
        ...level_scenes,
    },
    canvasElementId: 'game',
    pointerScope: ex.PointerScope.Canvas,
    // fixedUpdateFps: 60,
    configurePerformanceCanvas2DFallback: {
        allow: true, // opt-out of the fallback
        showPlayerMessage: true, // opt-in to a player pop-up message
        threshold: { fps: 20, numberOfFrames: 100 }, // configure the threshold to trigger the fallback
    },
    // physics: {
    //     solver: ex.SolverStrategy.Realistic,
    //     substep: 5, // Sub step the physics simulation for more robust simulations
    // },
    // fixedUpdateTimestep: 16, // Turn on fixed update timestep when consistent physic simulation is important
})

game.start('select_level', {
    // name of the start scene 'start'
    loader, // Optional loader (but needed for loading images/sounds)
    inTransition: new ex.FadeInOut({
        // Optional in transition
        duration: 1000,
        direction: 'in',
        color: ex.Color.ExcaliburBlue,
    }),
}).then(() => {
    // Do something after the game starts
})
