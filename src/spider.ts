import * as ex from 'excalibur'
import { Resources } from './resources'

export type SpiderConstructorParams = {
    /** Initial X coordinate of spider. */
    x: number
    /** Initial Y coordinate of spider. */
    y: number
}

export enum SpiderMovement {
    none = 0,
    walk_forwards = 1 << 0,
    run_forwards = 1 << 1,
    walk_backwards = 1 << 2,
    rotate_clockwise = 1 << 3,
    rotate_anti_clockwise = 1 << 4,
    jump = 1 << 5,
}

export class Spider extends ex.Actor {
    /** Flag that tells if the spider is currently moving. */
    public is_moving = false
    spritesheet!: ex.SpriteSheet
    sprite_index = 0

    constructor({ x, y }: SpiderConstructorParams) {
        super({
            name: 'Spider',
            pos: ex.vec(x, y),
            width: 100,
            height: 100,
        })
    }

    override onInitialize(engine: ex.Engine): void {
        const spritesheet_source = Resources.spider_walk_animation_spritesheet
        this.spritesheet = ex.SpriteSheet.fromImageSource({
            image: spritesheet_source,
            grid: {
                columns: 10,
                rows: 1,
                spriteWidth: 128,
                spriteHeight: 128,
            },
        })

        for (let sprite_index = 0; sprite_index < this.spritesheet.columns; sprite_index += 1) {
            const sprite = this.spritesheet.getSprite(sprite_index, 0)
            this.graphics.add(`walk-${sprite_index}`, sprite)
        }

        this.graphics.use(`walk-${this.sprite_index}`)
    }

    private getMovementFromInput(engine: ex.Engine): SpiderMovement {
        let movement: SpiderMovement = SpiderMovement.none
        movement |= engine.input.keyboard.isHeld(ex.Keys.KeyW)
            ? engine.input.keyboard.isHeld(ex.Keys.ShiftLeft)
                ? SpiderMovement.run_forwards
                : SpiderMovement.walk_forwards
            : SpiderMovement.none
        movement |= engine.input.keyboard.isHeld(ex.Keys.KeyS) ? SpiderMovement.walk_backwards : SpiderMovement.none
        movement |= engine.input.keyboard.isHeld(ex.Keys.KeyD) ? SpiderMovement.rotate_clockwise : SpiderMovement.none
        movement |= engine.input.keyboard.isHeld(ex.Keys.KeyA)
            ? SpiderMovement.rotate_anti_clockwise
            : SpiderMovement.none
        movement |= engine.input.keyboard.isHeld(ex.Keys.Space) ? SpiderMovement.jump : SpiderMovement.none
        return movement
    }

    override onPostUpdate(engine: ex.Engine, elapsed: number): void {
        const movement = this.getMovementFromInput(engine)

        if (movement & SpiderMovement.walk_forwards) {
            this.pos = this.pos.add(ex.vec(0, -6).rotate(this.rotation))
            this.sprite_index = (this.sprite_index + 1) % this.spritesheet.columns
            this.graphics.use(`walk-${this.sprite_index}`)
        }
        if (movement & SpiderMovement.run_forwards) {
            this.pos = this.pos.add(ex.vec(0, -9).rotate(this.rotation))
            this.sprite_index = (this.sprite_index + 1) % this.spritesheet.columns
            this.graphics.use(`walk-${this.sprite_index}`)
        }
        if (movement & SpiderMovement.walk_backwards) {
            this.pos = this.pos.add(ex.vec(0, 3).rotate(this.rotation))
        }
        if (movement & SpiderMovement.rotate_clockwise) {
            this.rotation = this.rotation + 0.07
        }
        if (movement & SpiderMovement.rotate_anti_clockwise) {
            this.rotation = this.rotation - 0.07
        }
        if (movement & SpiderMovement.jump) {
            this.scale = ex.vec(1.1, 1.1)
        } else {
            this.scale = ex.vec(1, 1)
        }
    }
}
