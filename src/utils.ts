import { Color } from 'excalibur'

/**
 * Return a copy of color with modified alpha value.
 *
 * @param color Excalibur color object.
 * @param a new alpha value.
 */
export function color_with_alpha(color: Color, a: number) {
    const new_color = color.clone()
    new_color.a = a
    return new_color
}

export type GameState = {
    last_played_level_index: number
    last_beaten_level_index: number
    beaten_levels: Record<
        LevelCode,
        {
            attempts: number
            best_time: number
        }
    >
}

export type LevelCode = `${number}-${number}`

export const GAME_STATE_KEY = 'shape-hopper/game-state'

export function read_game_state(): GameState | undefined {
    const raw_str = localStorage.getItem(GAME_STATE_KEY)
    return raw_str ? JSON.parse(raw_str) : undefined
}

export function save_game_state(state: GameState) {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state))
}

export function save_level_score(level_code: LevelCode) {
    const game_state = read_game_state()
    if (game_state) {
    }
}
