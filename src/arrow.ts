import * as ex from 'excalibur'

export class Arrow extends ex.Actor {
    north_point: ex.Vector
    safe_distance: number

    constructor(pos: ex.Vector, north_point: ex.Vector, safe_distance: number) {
        super({
            name: 'Arrow',
            pos,
            z: 2000,
        })
        this.north_point = north_point
        this.safe_distance = safe_distance
    }

    override onInitialize(engine: ex.Engine): void {
        const arrow_graphic = new ex.Polygon({
            points: [ex.vec(-20, 0), ex.vec(0, 20), ex.vec(20, 0)],
            color: ex.Color.fromHSL(0.95, 1.0, 0.5),
            strokeColor: ex.Color.fromHSL(0.95, 1.0, 0.7),
            lineWidth: 2,
            padding: 2,
        })

        this.graphics.add(arrow_graphic)
    }

    public get direction() {
        return this.north_point.sub(this.center).normalize()
    }

    public onPostUpdate() {
        this.rotation = this.direction.normal().toAngle()

        if (this.pos.distance(this.north_point) < this.safe_distance) {
            this.actions.fade(0, 200)
        }
    }
}
