import { Color } from 'excalibur'

export function create_hsl_color(h: number, s: number, l: number, a?: number) {
    const color = Color.fromHSL(h, s, l, a)
    color.h = h
    color.s = s
    color.l = l
    return color
}
