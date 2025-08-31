import * as ex from 'excalibur'
import { color_with_alpha } from './utils'
import simplify from 'simplify-js'

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
    deltoid,
    astroid,
    lemniscate,
    // Reuleaux is cookin'!
    reuleaux_trinagle,
    reuleaux_square,
    reuleaux_pentagon,
    reuleaux_hexagon,
}

export type ShapeConstructorParams = {
    type: ShapeType
    color: ex.Color
    centroid_circumcircle: CentroidCircumcircle
    z_index: number

    angular_offset?: number
    angular_velocity?: number
    linear_velocity?: ex.Vector

    aspect_ratio?: number
    variance?: number
}

export const ShapeCollisionGroup = ex.CollisionGroupManager.create('shape')

export class Shape extends ex.Actor {
    /** Circle escribed about the shape. Serves a basic definition for all shapes. */
    centroid_circumcircle: CentroidCircumcircle

    /** Angular offset of shape. */
    angular_offset: number

    /** Type of shape. */
    type: ShapeType

    /** Shape's fill color. */
    fill_color: ex.Color

    /** Shape's stroke color. */
    stroke_color: ex.Color

    get stroke_width() {
        return 2
    }

    constructor(params: ShapeConstructorParams) {
        super({
            name: 'Shape',
            pos: params.centroid_circumcircle.center,
            color: params.color,
            collisionType: ex.CollisionType.Fixed,
            collisionGroup: ShapeCollisionGroup,
            z: params.z_index,
        })

        this.type = params.type
        this.centroid_circumcircle = params.centroid_circumcircle
        this.angular_offset = params.angular_offset ?? 0

        this.rotation = this.angular_offset
        this.angularVelocity = params.angular_velocity ?? 0
        this.vel = params.linear_velocity ?? ex.vec(0, 0)

        this.fill_color = color_with_alpha(params.color, 0.6)
        this.stroke_color = color_with_alpha(this.fill_color, 0.8).darken(0.4).desaturate(0.1)
    }

    override onInitialize(engine: ex.Engine): void {
        const styleOptions = {
            color: this.fill_color,
            strokeColor: this.stroke_color,
            lineWidth: this.stroke_width,
            lineCap: 'round',
        } satisfies ex.RasterOptions

        if (this.type === ShapeType.circle) {
            const circle = new ex.Circle({
                radius: this.centroid_circumcircle.radius,
                ...styleOptions,
            })
            const collider = new ex.CircleCollider({ radius: this.centroid_circumcircle.radius })
            this.graphics.add(circle)
            this.collider.set(collider)
        } else {
            const polygon = ShapePolygonCreators[this.type]({ ...this.centroid_circumcircle, precision: 35 })

            const collider_polygon = does_shape_need_simplified_collider(this.type)
                ? simplify_polygon(polygon, 10)
                : polygon

            const polygon_graphic = new ex.Polygon({
                points: polygon.geometry[0],
                padding: this.stroke_width,
                ...styleOptions,
            })

            if (engine.isDebug) {
                const polygon_centroid_graphic = new ex.Circle({
                    radius: 5,
                    color: ex.Color.Green,
                })

                const circumcircle_graphic = new ex.Circle({
                    radius: this.centroid_circumcircle.radius - 1 + this.stroke_width,
                    color: ex.Color.fromRGB(0, 0, 0, 0.1),
                    strokeColor: ex.Color.fromRGB(0, 0, 0, 0.4),
                    lineWidth: 1,
                    lineDash: [4, 5],
                })

                const circumcircle_center_graphic = new ex.Circle({
                    radius: 2,
                    color: ex.Color.Magenta,
                })

                const graphic = new ex.GraphicsGroup({
                    useAnchor: false,
                    members: [
                        {
                            graphic: polygon_graphic,
                            offset: ex
                                .vec(polygon.bounding_box.left, polygon.bounding_box.top)
                                .sub(ex.vec(this.stroke_width, this.stroke_width)),
                        },
                        {
                            graphic: polygon_centroid_graphic,
                            offset: ex
                                .vec(polygon_centroid_graphic.width, polygon_centroid_graphic.height)
                                .scale(0.5)
                                .negate(),
                        },
                        {
                            graphic: circumcircle_graphic,
                            offset: ex.vec(circumcircle_graphic.width, circumcircle_graphic.height).scale(0.5).negate(),
                        },
                        {
                            graphic: circumcircle_center_graphic,
                            offset: ex
                                .vec(circumcircle_center_graphic.width, circumcircle_center_graphic.height)
                                .scale(0.5)
                                .negate(),
                        },
                    ],
                })

                this.graphics.add(graphic)
            } else {
                const circumcircle_center_graphic = new ex.Circle({
                    radius: 2,
                    opacity: 0,
                })

                const graphic = new ex.GraphicsGroup({
                    useAnchor: false,
                    members: [
                        {
                            graphic: polygon_graphic,
                            offset: ex
                                .vec(polygon.bounding_box.left, polygon.bounding_box.top)
                                .sub(ex.vec(this.stroke_width, this.stroke_width)),
                        },
                        {
                            graphic: circumcircle_center_graphic,
                            offset: ex
                                .vec(circumcircle_center_graphic.width, circumcircle_center_graphic.height)
                                .scale(0.5)
                                .negate(),
                        },
                    ],
                })
                this.graphics.add(graphic)
            }

            const composite_collider = new ex.CompositeCollider(
                collider_polygon.geometry.map((polygon) =>
                    new ex.PolygonCollider({ points: polygon, suppressConvexWarning: true }).triangulate(),
                ),
            )
            this.collider.set(composite_collider)
        }
    }
}

export function does_shape_need_simplified_collider(shape_type: ShapeType) {
    switch (shape_type) {
        case ShapeType.cresent_moon:
        case ShapeType.ellipse:
        case ShapeType.semi_circle:
        case ShapeType.reuleaux_trinagle:
        case ShapeType.reuleaux_square:
        case ShapeType.reuleaux_pentagon:
        case ShapeType.reuleaux_hexagon:
        case ShapeType.cardioid:
        case ShapeType.nephroid:
        case ShapeType.lemniscate:
            return true
        default:
            return false
    }
}

/**
 * Parameters, describing an escribed circle for shape.
 */
export type CentroidCircumcircle = {
    center: ex.Vector
    radius: number
}

export type PolygonGeometry = ex.Vector[][]

export type ShapePolygon = {
    centroid: ex.Vector
    geometry: PolygonGeometry
    bounding_box: PolygonBoundingBox
    centroid_circumcircle: CentroidCircumcircle
}

export type ShapePolygonCreatorParams = CentroidCircumcircle & {
    precision: number
}

export type ShapePolygonCreator = Record<ShapeType, (args: ShapePolygonCreatorParams) => ShapePolygon>

export function find_farthest_polygon_point_from_origin_point(
    polygon_geometry: PolygonGeometry,
    origin_point: ex.Vector,
): ex.Vector {
    let farthest_point = polygon_geometry[0][0]

    for (const loop of polygon_geometry) {
        for (const current_point of loop) {
            if (current_point.distance(origin_point) >= farthest_point.distance(origin_point)) {
                farthest_point = current_point
            }
        }
    }

    return farthest_point
}

export type PolygonBoundingBox = {
    left: number
    right: number
    top: number
    bottom: number
}

export function calculate_polygon_bounding_box(polygon_geometry: PolygonGeometry): PolygonBoundingBox {
    const bbox: PolygonBoundingBox = {
        left: +Infinity,
        right: -Infinity,
        top: +Infinity,
        bottom: -Infinity,
    }

    for (const loop of polygon_geometry) {
        for (const point of loop) {
            if (point.x <= bbox.left) {
                bbox.left = point.x
            }
            if (point.x >= bbox.right) {
                bbox.right = point.x
            }
            if (point.y <= bbox.top) {
                bbox.top = point.y
            }
            if (point.y >= bbox.bottom) {
                bbox.bottom = point.y
            }
        }
    }

    return bbox
}

export function calculate_polygon_centroid(polygon_geometry: PolygonGeometry): ex.Vector {
    let centroid = ex.vec(0, 0)

    for (const loop of polygon_geometry) {
        let loop_centroid = ex.vec(0, 0)
        let loop_signed_area = 0

        for (let i = 0; i < loop.length; i += 1) {
            const current_point = loop[i]
            const next_point = loop[(i + 1) % loop.length]
            const doubled_area = current_point.x * next_point.y - next_point.x * current_point.y
            loop_centroid = loop_centroid.add(current_point.add(next_point).scale(doubled_area))
            loop_signed_area += 0.5 * doubled_area
        }
        loop_centroid = loop_centroid.scale(1 / (6 * loop_signed_area))
        centroid = centroid.add(loop_centroid)
    }

    return centroid.scale(1 / polygon_geometry.length)
}

export function fit_polygon_to_centroid_circumcircle(
    polygon_geometry: PolygonGeometry,
    centroid_circumcircle: CentroidCircumcircle,
): ShapePolygon {
    const centroid = calculate_polygon_centroid(polygon_geometry)
    const offset_vector = centroid.negate()

    const farthest_polygon_point_from_centroid = find_farthest_polygon_point_from_origin_point(
        polygon_geometry,
        centroid,
    )
    const scale_factor = centroid_circumcircle.radius / centroid.distance(farthest_polygon_point_from_centroid)

    const transform_matrix = ex.Matrix.identity()
        .scale(scale_factor, scale_factor)
        .translate(offset_vector.x, offset_vector.y)

    const transformed_geometry = polygon_geometry.map((loop) => loop.map((point) => transform_matrix.multiply(point)))

    return {
        geometry: transformed_geometry,
        bounding_box: calculate_polygon_bounding_box(transformed_geometry),
        centroid,
        centroid_circumcircle,
    }
}

export function simplify_polygon(polygon: ShapePolygon, tolerance: number): ShapePolygon {
    const simplified_geometry = polygon.geometry.map((loop) =>
        simplify(loop, tolerance, false).map((point) => ex.vec(point.x, point.y)),
    )
    return {
        ...polygon,
        geometry: simplified_geometry,
        bounding_box: calculate_polygon_bounding_box(simplified_geometry),
    }
}

export type ParametricCurvePointsCreatorParams = {
    x: (t: number) => number
    y: (t: number) => number
    precision: number
}

export function get_parametric_curve_points({
    x: x_func,
    y: y_func,
    precision,
}: ParametricCurvePointsCreatorParams): PolygonGeometry {
    const angle_step = ex.TwoPI / precision
    const points = []

    for (let point_index = 0; point_index < precision; point_index += 1) {
        const current_angle = angle_step * point_index
        const point = ex.vec(x_func(current_angle), y_func(current_angle))
        points.push(point)
    }

    return [points]
}

export function get_regular_polygon(
    centroid_circumcircle: CentroidCircumcircle,
    number_of_vertices: number,
): ShapePolygon {
    const { cos, sin } = Math
    const { radius: r } = centroid_circumcircle

    const points = get_parametric_curve_points({
        precision: number_of_vertices,
        x: (t) => r * cos(t),
        y: (t) => r * sin(t),
    })
    return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
}

export function get_hypocycloid(
    { precision, ...centroid_circumcircle }: ShapePolygonCreatorParams,
    number_of_cusps: number,
): ShapePolygon {
    const { cos, sin } = Math
    const { radius: r } = centroid_circumcircle
    const n = number_of_cusps

    const points = get_parametric_curve_points({
        x: (t) => r * (n - 1) * cos(t) + r * cos((n - 1) * t),
        y: (t) => r * (n - 1) * sin(t) - r * sin((n - 1) * t),
        precision,
    })
    return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
}

export function get_reuleaux_polygon(
    { precision, ...centroid_circumcircle }: ShapePolygonCreatorParams,
    number_of_vertices: number,
): ShapePolygon {
    const { cos, sin, PI, floor: f } = Math
    const { TwoPI } = ex

    const n = number_of_vertices
    const { radius: r } = centroid_circumcircle

    const points = get_parametric_curve_points({
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
        precision,
    })
    return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
}

const ShapePolygonCreators: ShapePolygonCreator = {
    [ShapeType.ellipse]({ precision, ...centroid_circumcircle }) {
        const { cos, sin } = Math
        const { radius: r } = centroid_circumcircle

        const points = get_parametric_curve_points({
            x: (t) => r * cos(t),
            y: (t) => 0.62 * r * sin(t),
            precision,
        })
        return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
    },
    [ShapeType.triangle](params) {
        return get_regular_polygon(params, 3)
    },
    [ShapeType.square](params) {
        return get_regular_polygon(params, 4)
    },
    [ShapeType.pentagon](params) {
        return get_regular_polygon(params, 5)
    },
    [ShapeType.hexagon](params) {
        return get_regular_polygon(params, 6)
    },
    [ShapeType.cardioid]({ precision, ...centroid_circumcircle }) {
        const { cos, sin } = Math
        const { radius: r } = centroid_circumcircle

        const points = get_parametric_curve_points({
            x: (t) => r * (1 - cos(t)) * cos(t),
            y: (t) => r * (1 - cos(t)) * sin(t),
            precision,
        })
        return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
    },
    [ShapeType.nephroid]({ precision, ...centroid_circumcircle }) {
        const { cos, sin } = Math
        const { radius: r } = centroid_circumcircle
        const points = get_parametric_curve_points({
            x: (t) => 3 * r * cos(t) - r * cos(3 * t),
            y: (t) => 3 * r * sin(t) - r * sin(3 * t),
            precision,
        })
        return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
    },
    [ShapeType.deltoid](params) {
        return get_hypocycloid(params, 3)
    },
    [ShapeType.astroid](params) {
        return get_hypocycloid(params, 4)
    },
    [ShapeType.lemniscate]({ precision, ...centroid_circumcircle }) {
        const { cos, sin } = Math
        const { radius: r } = centroid_circumcircle

        const points = get_parametric_curve_points({
            x: (t) => (r * cos(t)) / (1 + sin(t) ** 2),
            y: (t) => (r * cos(t) * sin(t)) / (1 + sin(t) ** 2),
            precision,
        })
        return fit_polygon_to_centroid_circumcircle(points, centroid_circumcircle)
    },
    [ShapeType.reuleaux_trinagle](params) {
        return get_reuleaux_polygon(params, 3)
    },
    [ShapeType.reuleaux_square](params) {
        return get_reuleaux_polygon(params, 4)
    },
    [ShapeType.reuleaux_pentagon](params) {
        return get_reuleaux_polygon(params, 5)
    },
    [ShapeType.reuleaux_hexagon](params) {
        return get_reuleaux_polygon(params, 6)
    },
    [ShapeType.circle]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.semi_circle]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.cresent_moon]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.rectangle]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.rhombus]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.trapezoid]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.parallelogram]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
    [ShapeType.star]: function (args: ShapePolygonCreatorParams): ShapePolygon {
        throw new Error('Function not implemented.')
    },
}
