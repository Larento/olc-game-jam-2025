import * as ex from 'excalibur'
import { Level } from './level'
import { UI } from './ui'
import { Shape, ShapeType } from './shape'

export const levels = [
    new Level(347567867234, 1),
    new Level(2355634562134, 1),
    new Level(12356345634123, 1),
    new Level(1243453412, 1),
    new Level(9994593423445, 1),
    new Level(453459023983, 2),
    new Level(23323518, 2),
    new Level(34903450697, 2),
    new Level(34095067, 2),
    new Level(30498459060, 3),
    new Level(3405903479, 3),
    new Level(23459345098, 3),
    new Level(99999888822323, 4),
    new Level(110101010110, 4),
]

export const level_scenes: Record<`level-${number}`, Level> = Object.fromEntries(
    levels.map((level, index) => [`level-${index}`, level]),
)

export function get_level_index(target_level: Level) {
    const index = levels.findIndex((level) => level === target_level)
    return index === -1 ? undefined : index
}

export function get_level_scene_name(index: number) {
    return `level-${index}`
}

export class LevelSelect extends ex.Scene {
    backgroundColor = ex.Color.White

    override onInitialize(engine: ex.Engine): void {
        const number_of_platforms = 30
        const randomizer = new ex.Random()

        for (let i = 0; i < number_of_platforms; i += 1) {
            const shape = new Shape({
                type: randomizer.pickOne([
                    // ShapeType.circle,
                    ShapeType.ellipse,
                    ShapeType.triangle,
                    ShapeType.square,
                    // ShapeType.pentagon,
                    ShapeType.hexagon,
                    // ShapeType.reuleaux_trinagle,
                    // ShapeType.reuleaux_square,
                    // ShapeType.reuleaux_pentagon,
                    // ShapeType.reuleaux_hexagon,
                    ShapeType.cardioid,
                    // ShapeType.nephroid,
                    // ShapeType.deltoid,
                    // ShapeType.astroid,
                    // ShapeType.lemniscate,
                ]),
                z_index: i + 1,
                centroid_circumcircle: {
                    center: ex.vec(randomizer.integer(-1280, 1280), randomizer.integer(-720, 720)),
                    radius: randomizer.integer(50, 150),
                },
                angular_offset: randomizer.floating(0, ex.TwoPI),
                angular_velocity: randomizer.floating(-Math.PI / 8, Math.PI / 8),
                linear_velocity: ex.vec(randomizer.floating(-5, 5), randomizer.floating(-5, 5)),
                color: ex.Color.fromHSL(randomizer.floating(0, 1), 0.6, randomizer.floating(0.55, 0.85)),
            })
            this.add(shape)
        }
    }

    override onActivate(context: ex.SceneActivationContext<unknown>): void {
        UI.classList.add('level-select')
        UI.innerHTML = ''
        const container = document.createElement('div')
        container.className = 'level-select-container'

        const logo = document.createElement('img')
        logo.src = '/logo.png'
        logo.id = 'logo'

        const heading = document.createElement('header')
        heading.innerHTML = 'Select level'

        const grid = document.createElement('div')
        grid.className = 'level-grid'

        for (const [index] of levels.entries()) {
            const card = document.createElement('div')
            card.className = 'card'
            card.innerHTML = `Level ${index + 1}`
            card.onclick = () => {
                context.engine.goToScene(get_level_scene_name(index))
            }
            grid.appendChild(card)
        }

        container.appendChild(logo)
        container.appendChild(heading)
        container.appendChild(grid)
        UI.appendChild(container)
        container.classList.add('shown')
    }

    override onDeactivate(context: ex.SceneActivationContext): void {
        UI.innerHTML = ''
    }
}
