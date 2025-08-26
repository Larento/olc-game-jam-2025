import * as ex from 'excalibur'
import { Spider } from './spider'
import { Shape, ShapeType } from './shape'
import { create_hsl_color } from './utils'

export class MyLevel extends ex.Scene {
    backgroundColor = ex.Color.White

    override onInitialize(engine: ex.Engine): void {
        const seed = 122345
        const randomizer = new ex.Random(seed)
        const shapes = []
        for (let i = 0; i < 10; i += 1) {
            const shape = new Shape({
                x: Math.random() * 800,
                y: Math.random() * 600,
                width: Math.random() * 200 + 100,
                height: Math.random() * 200 + 100,
                type: randomizer.pickOne(Object.values(ShapeType)),
                color: create_hsl_color(randomizer.floating(0, 1), 0.6, 0.5),
            })
            shapes.push(shape)
            this.add(shape)
        }

        const spider = new Spider({ x: 50, y: 50 })
        this.add(spider)

        this.camera.clearAllStrategies()
        this.camera.strategy.elasticToActor(spider, 0.05, 0.1)
    }
}
