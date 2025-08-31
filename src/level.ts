import * as ex from 'excalibur'
import { Spider } from './spider'
import { Shape, ShapeType } from './shape'
import { UI } from './ui'
import { Arrow } from './arrow'
import { get_level_index, get_level_scene_name, levels } from './level-select'

export class Level extends ex.Scene {
    backgroundColor = ex.Color.White
    default_camera_zoom = 0.62
    max_difficulty = 4
    seed: number
    difficulty: number
    randomizer: ex.Random
    start_platform!: Shape
    finish_platform!: Shape
    spider!: Spider

    constructor(seed: number, difficulty: number) {
        super()
        this.seed = seed
        this.randomizer = new ex.Random(seed)
        this.difficulty = ex.clamp(difficulty, 1, this.max_difficulty)
    }

    override onActivate(context: ex.SceneActivationContext<unknown>): void {
        this.randomizer = new ex.Random(this.seed)

        const world_size = {
            width: this.randomizer.integer(2000 * this.difficulty, 4000 * this.difficulty),
            height: this.randomizer.integer(2000 * this.difficulty, 4000 * this.difficulty),
        }

        this.start_platform = new Shape({
            type: ShapeType.circle,
            centroid_circumcircle: {
                center: ex.vec(0, 0),
                radius: 300,
            },
            color: ex.Color.LightGray,
            z_index: 50,
        })

        const starting_platform_label = new ex.Label({
            text: 'Find the exit!',
            x: this.start_platform.center.x,
            y: this.start_platform.center.y + this.start_platform.centroid_circumcircle.radius + 20,
            font: new ex.Font({
                size: 40,
                color: ex.Color.Black,
                textAlign: ex.TextAlign.Center,
                bold: true,
                family: 'monospace',
            }),
        })

        this.add(starting_platform_label)
        this.add(this.start_platform)

        const number_of_platforms = Math.round(40 / (0.25 * this.difficulty))

        const finish_platform_radius = 200
        this.finish_platform = new Shape({
            type: ShapeType.circle,
            centroid_circumcircle: {
                center: ex.vec(
                    world_size.width - finish_platform_radius * 2,
                    world_size.height - finish_platform_radius * 2,
                ),
                radius: finish_platform_radius,
            },
            color: ex.Color.fromHSL(0.2, 1, 0.5),
            z_index: number_of_platforms + 1,
        })

        const finish_platform_label = new ex.Label({
            text: 'Exit',
            x: this.finish_platform.center.x,
            y: this.finish_platform.center.y + this.finish_platform.centroid_circumcircle.radius + 20,
            font: new ex.Font({
                size: 40,
                color: ex.Color.Black,
                textAlign: ex.TextAlign.Center,
                bold: true,
                family: 'monospace',
            }),
        })

        this.add(finish_platform_label)
        this.add(this.finish_platform)

        for (let i = 0; i < number_of_platforms; i += 1) {
            const shape = new Shape({
                type: this.randomizer.pickOne([
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
                    // ShapeType.cardioid,
                    // ShapeType.nephroid,
                    // ShapeType.deltoid,
                    // ShapeType.astroid,
                    // ShapeType.lemniscate,
                ]),
                z_index: i + 1,
                centroid_circumcircle: {
                    center: ex.vec(
                        this.randomizer.integer(-0.1 * world_size.width, world_size.width),
                        this.randomizer.integer(-0.1 * world_size.height, world_size.height),
                    ),
                    radius: this.randomizer.integer(150 - 100 * this.difficulty, 350 - 200 * this.difficulty),
                },
                angular_offset: this.randomizer.floating(0, ex.TwoPI),
                angular_velocity: this.randomizer.floating(
                    (-Math.PI / 8) * this.difficulty,
                    (Math.PI / 8) * this.difficulty,
                ),
                linear_velocity: ex.vec(
                    this.randomizer.floating(-15 * this.difficulty, 15 * this.difficulty),
                    this.randomizer.floating(-15 * this.difficulty, 15 * this.difficulty),
                ),
                color: ex.Color.fromHSL(this.randomizer.floating(0, 1), 0.6, this.randomizer.floating(0.55, 0.85)),
            })
            this.add(shape)
        }

        this.spider = new Spider({ x: this.start_platform.center.x, y: this.start_platform.center.y, level: this })
        this.spider.enter_platform(this.start_platform)
        this.add(this.spider)

        this.finish_platform.on('collisionstart', (event) => {
            if (event.other.owner === this.spider) {
                this.trigger_level_clear()
            }
        })

        const arrow = new Arrow(
            this.spider.center,
            this.finish_platform.center,
            this.finish_platform.centroid_circumcircle.radius * 1.2,
        )
        this.add(arrow)
        this.spider.on('postupdate', (event) => {
            if (event.self instanceof Spider) {
                const safe_distance = Math.min(event.self.width * 1.1, arrow.pos.distance(arrow.north_point))
                arrow.pos = event.self.pos.add(arrow.direction.scale(safe_distance))
            }
        })

        this.camera.clearAllStrategies()
        this.camera.zoom = this.default_camera_zoom
        this.camera.strategy.elasticToActor(this.spider, 0.2, 0.4)

        UI.classList.add('level-overlay')
        UI.innerHTML = ''
        const jump_strength_meter = document.createElement('div')
        jump_strength_meter.className = 'jump-strength-meter'
        UI.appendChild(jump_strength_meter)
    }

    override onDeactivate(context: ex.SceneActivationContext): void {
        UI.classList.remove('level-overlay', 'game-over-overlay', 'level-clear-overlay')
        UI.innerHTML = ''
        this.spider.finish_death()
        this.spider.kill()
        this.clear()
    }

    update_jump_strength_meter(percentage: number) {
        const meter = UI.querySelector('.jump-strength-meter')
        if (meter instanceof HTMLElement) {
            meter.style.setProperty('--percentage', ex.clamp(percentage, 0, 1).toFixed(3))
        }
    }

    level_clear_messages = ['You are a real ninja!', 'Congratulations!', "You've got the moves!", 'Sweeeet!']

    async trigger_level_clear() {
        if (!UI.classList.contains('level-clear-overlay')) {
            UI.classList.add('level-clear-overlay')
            const container = document.createElement('div')
            container.className = 'container'

            const level_clear_heading = document.createElement('header')
            level_clear_heading.id = 'level-clear-message'
            level_clear_heading.innerHTML = 'Level clear'
            container.appendChild(level_clear_heading)

            const level_clear_message = document.createElement('p')
            level_clear_message.id = 'level-clear-message'
            level_clear_message.innerHTML = this.randomizer.pickOne(this.level_clear_messages)
            container.appendChild(level_clear_message)

            const current_index = get_level_index(this)
            const next_level = document.createElement('button')
            next_level.onclick = () => {
                container.classList.remove('shown')
                if (current_index) {
                    this.engine.goToScene(get_level_scene_name(current_index + 1))
                }
            }
            next_level.id = 'next-level'
            next_level.innerHTML = 'Next level'
            if (current_index) {
                next_level.disabled = current_index >= levels.length - 1
            }
            container.appendChild(next_level)

            const return_to_main_menu = document.createElement('button')
            return_to_main_menu.onclick = () => {
                container.classList.remove('shown')
                this.engine.goToScene('level-select')
            }
            return_to_main_menu.id = 'return-to-main-menu'
            return_to_main_menu.innerHTML = 'Return to menu'
            container.appendChild(return_to_main_menu)

            UI.appendChild(container)
            await this.camera.zoomOverTime(0.2, 1000)
            container.classList.add('shown')
        }
    }

    async trigger_game_over() {
        if (!UI.classList.contains('game-over-overlay')) {
            UI.classList.add('game-over-overlay')
            const container = document.createElement('div')
            container.className = 'container'

            const game_over_message = document.createElement('header')
            game_over_message.id = 'game-over-message'
            game_over_message.innerHTML = 'Game over'
            container.appendChild(game_over_message)

            const current_index = get_level_index(this)
            const restart_level = document.createElement('button')
            restart_level.onclick = () => {
                container.classList.remove('shown')
                if (current_index) {
                    this.engine.goToScene(get_level_scene_name(current_index))
                }
            }
            restart_level.id = 'restart-level'
            restart_level.innerHTML = 'Restart level'
            container.appendChild(restart_level)

            const return_to_main_menu = document.createElement('button')
            return_to_main_menu.onclick = () => {
                container.classList.remove('shown')
                this.engine.goToScene('select_level')
            }
            return_to_main_menu.id = 'return-to-main-menu'
            return_to_main_menu.innerHTML = 'Return to menu'
            container.appendChild(return_to_main_menu)

            UI.appendChild(container)
            await this.camera.zoomOverTime(1, 1000)
            container.classList.add('shown')
        }
    }
}
