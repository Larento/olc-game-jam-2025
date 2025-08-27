import * as ex from 'excalibur'
import { Spider } from './spider'
import { Shape, ShapeType } from './shape'

export class MyLevel extends ex.Scene {
    backgroundColor = ex.Color.White

    override onInitialize(engine: ex.Engine): void {
        const seed = 122345
        const randomizer = new ex.Random(seed)
        const shapes = []
        for (let i = 0; i < 100; i += 1) {
            const shape = new Shape({
                centroid_circumcircle: {
                    center: ex.vec(randomizer.integer(-2000, 2000), randomizer.integer(-2000, 2000)),
                    radius: randomizer.integer(100, 200),
                },
                angular_offset: randomizer.floating(0, ex.TwoPI),
                type: randomizer.pickOne([
                    ShapeType.circle,
                    ShapeType.triangle,
                    ShapeType.square,
                    ShapeType.pentagon,
                    ShapeType.hexagon,
                    ShapeType.cardioid,
                    ShapeType.reuleaux_trinagle,
                    ShapeType.reuleaux_square,
                    ShapeType.reuleaux_pentagon,
                    ShapeType.reuleaux_hexagon,
                ]),
                color: ex.Color.fromHSL(randomizer.floating(0, 1), 0.6, randomizer.floating(0.55, 0.85)),
            })
            shapes.push(shape)
            this.add(shape)
        }

        const spider = new Spider({ x: 50, y: 50 })
        this.add(spider)

        this.camera.clearAllStrategies()
        this.camera.strategy.elasticToActor(spider, 0.1, 0.5)
    }
}
