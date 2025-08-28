import * as ex from 'excalibur'
import { modify_alpha } from './utils'

// okay, this is way too many shapes.
// probably don't want concave shapes, since it would require building a complex collision box.
// all shapes (except for the circle maybe) will probably have to be built with polygons.
export enum ShapeType {
    // circle-like
    circle,
    ellipse,
    semi_circle,
    cresent_moon,
    // regular polygons
    triangle,
    square,
    pentagon,
    hexagon,
    // irregular polygons
    rectangle,
    rhombus,
    trapezoid,
    parallelogram,
    star,
    // weird math stuff
    cardioid,
    nephroid,
    lemniscate,
    // Reuleaux is cookin'!
    reuleaux_trinagle,
    reuleaux_square,
    reuleaux_pentagon,
    reuleaux_hexagon,
}

export type ShapeConstructorParams = {
    centroid_circumcircle: ShapeCentroidCircumcircleParams
    aspect_ratio?: number
    variance?: number
    angular_offset?: number
    type: ShapeType
    color: ex.Color
}

export class Shape extends ex.Actor {
    /** Circle escribed about the shape. Serves a basic definition for all shapes. */
    centroid_circumcircle: ShapeCentroidCircumcircleParams

    /** Angular offset of shape. */
    angular_offset: number

    /** Type of shape. */
    type: ShapeType

    /** Shape's fill color. */
    fill_color: ex.Color

    /** Shape's stroke color. */
    stroke_color: ex.Color

    constructor(params: ShapeConstructorParams) {
        super({
            name: 'Shape',
            pos: params.centroid_circumcircle.center,
            color: params.color,
        })

        this.centroid_circumcircle = params.centroid_circumcircle
        this.angular_offset = params.angular_offset ?? 0
        this.type = params.type
        this.fill_color = modify_alpha(params.color, 0.6)
        this.stroke_color = modify_alpha(this.fill_color, 0.8).darken(0.4).desaturate(0.1)
    }

    override onInitialize(engine: ex.Engine): void {
        const styleOptions = {
            color: this.fill_color,
            strokeColor: this.stroke_color,
            lineWidth: 3,
            lineCap: 'round',
        } satisfies ex.RasterOptions

        if (this.type === ShapeType.circle) {
            const circle = new ex.Circle({
                radius: this.centroid_circumcircle.radius,
                ...styleOptions,
            })
            this.graphics.add(circle)
        } else {
            const polygons = ShapePolygonApproximator[this.type](this.centroid_circumcircle)
            for (const points of polygons) {
                const polygon = new ex.Polygon({
                    points: points,
                    rotation: this.angular_offset,
                    padding: 5,
                    ...styleOptions,
                })
                this.graphics.add(polygon)
            }
        }
    }
}

/**
 * Parameters, describing an escribed circle for shape.
 */
export type ShapeCentroidCircumcircleParams = {
    center: ex.Vector
    radius: number
}

export type ShapePolygonApproximationPoints = ex.Vector[][]

export type ShapePolygonApproximationMethods = Record<
    ShapeType,
    (args: ShapeCentroidCircumcircleParams) => ShapePolygonApproximationPoints
>

export type ParametricCurvePolygonPointsCreatorParams = {
    x: (t: number) => number
    y: (t: number) => number
    precision: number
}

export function get_parametric_curve_points({
    x: x_func,
    y: y_func,
    precision,
}: ParametricCurvePolygonPointsCreatorParams): ShapePolygonApproximationPoints {
    const angle_step = ex.TwoPI / precision
    const points = []

    for (let point_index = 0; point_index < precision; point_index += 1) {
        const current_angle = angle_step * point_index
        const point = ex.vec(x_func(current_angle), y_func(current_angle))
        points.push(point)
    }

    return [points]
}

export function get_regular_polygon_points(
    centroid_circumcircle: ShapeCentroidCircumcircleParams,
    number_of_vertices: number,
): ShapePolygonApproximationPoints {
    const { radius: r } = centroid_circumcircle
    return get_parametric_curve_points({
        precision: number_of_vertices,
        x: (t) => r * Math.cos(t),
        y: (t) => r * Math.sin(t),
    })
}

export function get_reuleaux_polygon_points(
    centroid_circumcircle: ShapeCentroidCircumcircleParams,
    number_of_vertices: number,
): ShapePolygonApproximationPoints {
    const n = number_of_vertices
    const { radius: r } = centroid_circumcircle
    const { cos, sin, PI, floor: f } = Math
    const { TwoPI } = ex
    return get_parametric_curve_points({
        precision: 100,
        x: (t) => {
            const a = (PI / n) * (2 * f((n * t) / TwoPI) + 1)
            const x = 2 * cos(PI / (2 * n)) * cos(0.5 * (t + a)) - cos(a)
            return r * x
        },
        y: (t) => {
            const a = (PI / n) * (2 * f((n * t) / TwoPI) + 1)
            const y = 2 * cos(PI / (2 * n)) * sin(0.5 * (t + a)) - sin(a)
            return r * y
        },
    })
}

const ShapePolygonApproximator: ShapePolygonApproximationMethods = {
    [ShapeType.triangle](circumcircle) {
        return get_regular_polygon_points(circumcircle, 3)
    },
    [ShapeType.square](circumcircle) {
        return get_regular_polygon_points(circumcircle, 4)
    },
    [ShapeType.pentagon](circumcircle) {
        return get_regular_polygon_points(circumcircle, 5)
    },
    [ShapeType.hexagon](circumcircle) {
        return get_regular_polygon_points(circumcircle, 6)
    },
    [ShapeType.cardioid](circumcircle) {
        const { radius: r } = circumcircle
        return get_parametric_curve_points({
            x: (t) => r * (1 - Math.cos(t)) * Math.cos(t),
            y: (t) => r * (1 - Math.cos(t)) * Math.sin(t),
            precision: 100,
        })
    },
    [ShapeType.lemniscate](circumcircle) {
        const { cos, sin } = Math
        const { radius: r } = circumcircle
        return get_parametric_curve_points({
            precision: 100,
            x: (t) => (r * cos(t)) / (1 + sin(t) ** 2),
            y: (t) => (r * cos(t) * sin(t)) / (1 + sin(t) ** 2),
        })
    },
    [ShapeType.reuleaux_trinagle](circumcircle) {
        return get_reuleaux_polygon_points(circumcircle, 3)
    },
    [ShapeType.reuleaux_square](circumcircle) {
        return get_reuleaux_polygon_points(circumcircle, 4)
    },
    [ShapeType.reuleaux_pentagon](circumcircle) {
        return get_reuleaux_polygon_points(circumcircle, 5)
    },
    [ShapeType.reuleaux_hexagon](circumcircle) {
        return get_reuleaux_polygon_points(circumcircle, 6)
    },
}
