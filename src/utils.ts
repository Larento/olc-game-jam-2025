import { Color } from 'excalibur'

/**
 * Return a copy of color with modified alpha value.
 *
 * @param color Excalibur color object.
 * @param a new alpha value.
 */
export function modify_alpha(color: Color, a: number) {
    const new_color = color.clone()
    new_color.a = a
    return new_color
}
