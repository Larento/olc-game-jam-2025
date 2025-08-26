import * as ex from 'excalibur'
import { create_hsl_color } from './utils'

// okay, this is way too many shapes.
// probably don't want concave shapes, since it would require building a complex collision box.
// all shapes (except for the circle maybe) will probably have to be built with polygons.
export enum ShapeType {
    // circle-like
    circle,
    ellipse,
    semi_circle,
    cresent_moon,
    // polygons
    triangle,
    square,
    rectangle,
    rhombus,
    trapezoid,
    parallelogram,
    pentagon,
    hexagon,
    star,
    // weird math stuff
    reuleaux_trinagle,
    cardioid,
    nephroid,
    lemniscate,
}

export type ShapeConstructorParams = {
    x: number
    y: number
    width: number
    height: number
    type: ShapeType
    color: ex.Color
}

export class Shape extends ex.Actor {
    constructor({ x, y, width, height, color }: ShapeConstructorParams) {
        console.log(color.h)
        super({
            name: 'Shape',
            pos: ex.vec(x, y),
            width,
            height,
            color,
        })
        this.other_color = color
    }

    override onInitialize(engine: ex.Engine): void {
        const polygon = new ex.Polygon({
            points: [ex.vec(0, 0), ex.vec(this.width, 0), ex.vec(this.width, this.height), ex.vec(0, this.height)],
            color: create_hsl_color(this.other_color.h, this.other_color.s, this.other_color.l, 0.6),
            strokeColor: create_hsl_color(this.other_color.h, this.other_color.s, this.other_color.l, 0.8),
            lineWidth: 5,
        })
        this.graphics.add(polygon)
    }
}
