import * as ex from 'excalibur'
import { Resources } from './resources'
import { Shape } from './shape'
import { Level } from './level'

export type SpiderConstructorParams = {
    /** Initial X coordinate of spider. */
    x: number
    /** Initial Y coordinate of spider. */
    y: number
    level: Level
}

export enum UserCommand {
    none = 0,
    walk_forwards = 1 << 0,
    run = 1 << 1,
    walk_backwards = 1 << 2,
    turn_clockwise = 1 << 3,
    turn_counter_clockwise = 1 << 4,
    charge_jump = 1 << 5,
    jump = 1 << 6,
}

export const SpiderSpritesheet = ex.SpriteSheet.fromImageSource({
    image: Resources.spider_walk_animation_spritesheet,
    grid: {
        columns: 17,
        rows: 1,
        spriteWidth: 128,
        spriteHeight: 128,
    },
})

export const SpiderIdleSprite = SpiderSpritesheet.getSprite(0, 0)

export const SpiderWalkForwardsAnimation = ex.Animation.fromSpriteSheet(SpiderSpritesheet, ex.range(0, 16), 12)
export const SpiderRunAnimation = ex.Animation.fromSpriteSheet(SpiderSpritesheet, ex.range(0, 16), 8)
export const SpiderWalkBackwardsAnimation = ex.Animation.fromSpriteSheet(
    SpiderSpritesheet,
    ex.range(0, 16).toReversed(),
    24,
)
export const SpiderTurnClockwiseAnimation = ex.Animation.fromSpriteSheet(SpiderSpritesheet, [0, 2, 4], 50)

export enum SpiderState {
    none = 0,
    idle = 1 << 0,
    /** Flag that tells if the spider is currently moving. */
    moving = 1 << 1,
    /** Flag that tells if the spider is currently turning. */
    turning = 1 << 2,
    charging_jump = 1 << 6,
    jumping = 1 << 7,
    free_falling = 1 << 8,
    dead = 1 << 9,
    deactivated = 1 << 10,

    /** Flag that tells when Spidey is in mid-air. */
    airborne = jumping | free_falling,
}

export const SpiderStateTransitions: Record<SpiderState, SpiderState> = {
    [SpiderState.none]: SpiderState.none,
    [SpiderState.idle]: SpiderState.moving | SpiderState.turning | SpiderState.charging_jump | SpiderState.free_falling,
    [SpiderState.moving]: SpiderState.idle | SpiderState.turning | SpiderState.charging_jump | SpiderState.free_falling,
    [SpiderState.turning]:
        SpiderState.idle |
        SpiderState.moving |
        SpiderState.turning |
        SpiderState.charging_jump |
        SpiderState.free_falling,
    [SpiderState.charging_jump]: SpiderState.jumping,
    [SpiderState.jumping]: SpiderState.free_falling,
    [SpiderState.free_falling]: SpiderState.idle | SpiderState.turning | SpiderState.dead,
    get [SpiderState.airborne]() {
        return this[SpiderState.jumping] | this[SpiderState.free_falling]
    },
    [SpiderState.dead]: SpiderState.deactivated,
    [SpiderState.deactivated]: SpiderState.none,
}

export function separate_bitflags(state: SpiderState): SpiderState[] {
    const flags: Set<SpiderState> = new Set()
    for (const state_value of Object.values(SpiderState)) {
        if (typeof state_value === 'number' && state & state_value) {
            flags.add(state_value)
        }
    }
    return [...flags]
}

export function get_next_spider_state(current_state: SpiderState, possible_next_state: SpiderState): SpiderState {
    const possible_states = SpiderStateTransitions[current_state]
    return possible_states & possible_next_state ? possible_next_state : current_state
}

export abstract class TopDownActor extends ex.Actor {
    readonly gravity = -40
    private _vertical_velocity = 0

    get vertical_velocity() {
        return this._vertical_velocity
    }

    set vertical_velocity(value: number) {
        this._vertical_velocity = value
    }

    private _altitude = 0

    get altitude() {
        return this._altitude
    }

    set altitude(value: number) {
        this._altitude = value
        const scale = Math.min(Math.exp(this._altitude / 2), 20)
        this.scale = ex.vec(scale, scale)
    }

    public update_altitude(timedelta: number) {
        this.vertical_velocity = this.vertical_velocity + (this.gravity * timedelta) / 1000
        this.altitude = this.altitude + (this.vertical_velocity * timedelta) / 1000
    }
}

export class SpiderPlatformPhysics extends TopDownActor {
    /** Shape objects that Spidey is currently positioned over. */
    protected positioned_over_platforms: Set<Shape> = new Set()

    get is_positioned_over_any_platform() {
        return this.positioned_over_platforms.size > 0
    }

    public enter_platform(new_platform: Shape) {
        this.positioned_over_platforms.add(new_platform)
    }

    public lose_platform(platform: Shape) {
        this.positioned_over_platforms.delete(platform)
    }

    protected get_current_platform() {
        let current_platform: Shape | undefined = undefined

        for (const platform of this.positioned_over_platforms) {
            if (
                !current_platform ||
                (platform.z >= current_platform.z &&
                    this.center.distance(platform.center) < platform.centroid_circumcircle.radius - this.width * 0.2)
            ) {
                current_platform = platform
            }
        }
        return current_platform
    }

    protected get_velocities_from_current_platform(timedelta: number) {
        const current_platform = this.get_current_platform()
        if (current_platform) {
            const radius_vec = current_platform.center.sub(this.center)
            const tangent_velocity_from_rotation = radius_vec
                .normal()
                .scale(radius_vec.magnitude * current_platform.angularVelocity)

            // Weird hack so that the spider doesn't slide off the spinning platform when standing still.
            const normal_acceleration = radius_vec.scale(current_platform.angularVelocity ** 2)
            const normal_velocity = normal_acceleration.scale(0.5001).scale(timedelta / 1000)

            const linear_velocity = current_platform.vel.add(tangent_velocity_from_rotation).add(normal_velocity)
            const angular_velocity = current_platform.angularVelocity
            return { linear_velocity, angular_velocity }
        }
        return undefined
    }

    protected update_global_velocities(timedelta: number) {
        const additional_velocities = this.get_velocities_from_current_platform(timedelta)
        if (additional_velocities) {
            this.vel = this.vel.add(additional_velocities.linear_velocity)
            this.angularVelocity += additional_velocities.angular_velocity
        }
    }

    override onCollisionStart(
        self: ex.Collider,
        other: ex.Collider,
        side: ex.Side,
        contact: ex.CollisionContact,
    ): void {
        if (other.owner instanceof Shape) {
            this.enter_platform(other.owner)
        }
    }

    override onCollisionEnd(
        self: ex.Collider,
        other: ex.Collider,
        side: ex.Side,
        lastContact: ex.CollisionContact,
    ): void {
        if (other.owner instanceof Shape) {
            this.lose_platform(other.owner)
        }
    }
}

export class Spider extends SpiderPlatformPhysics {
    readonly ground_friction = 0.5
    readonly acceleration = {
        [UserCommand.walk_forwards]: 40000,
        [UserCommand.walk_backwards]: -20000,
        [UserCommand.run]: 60000,
        [UserCommand.turn_clockwise]: 300,
        [UserCommand.turn_counter_clockwise]: -300,
    }

    private level: Level
    private command: UserCommand = UserCommand.none
    private linear_velocity_on_ground: ex.Vector
    private angular_velocity_on_ground: number
    private linear_velocity_in_air: ex.Vector = ex.vec(0, 0)
    private angular_velocity_in_air: number = 0

    private _state: SpiderState = SpiderState.idle
    private get state() {
        return this._state
    }
    private set state(value: SpiderState) {
        // These next state checks are much more trouble than they're worth.
        // let total_next_state = SpiderState.none

        // for (const current_state of separate_bitflags(this.state)) {
        //     const next_state = get_next_spider_state(current_state, value)
        //     const next_states = separate_bitflags(next_state).map((state) => SpiderState[state])
        //     const requested_states = separate_bitflags(value).map((state) => SpiderState[state])
        //     console.log(
        //         'CURR',
        //         SpiderState[current_state],
        //         'WANT',
        //         requested_states.toString(),
        //         'GET',
        //         next_states.toString(),
        //     )

        //     if (!(next_state & value)) {
        //         throw Error(
        //             `Unexpected state transition from '${SpiderState[current_state]}' to '${requested_states.join(' | ')}'.`,
        //         )
        //     }

        //     total_next_state |= next_state
        // }

        this._state = value
    }

    private _jump_strength = 0
    private get jump_strength() {
        return this._jump_strength
    }

    private set jump_strength(value: number) {
        this._jump_strength = value
        this.level.update_jump_strength_meter(this.jump_strength_meter_value)
    }

    private tick_jump_charging(timedelta: number) {
        this.jump_strength = ex.clamp(this._jump_strength + timedelta / 1000, 0, this.jump_strength_max_value)
    }

    private readonly jump_strength_max_value = 0.8
    private get jump_strength_meter_value() {
        return this._jump_strength / this.jump_strength_max_value
    }

    constructor(params: SpiderConstructorParams) {
        super({
            name: 'Spider',
            pos: ex.vec(params.x, params.y),
            radius: 60,
            z: 1000,
        })
        this.level = params.level
        this.linear_velocity_on_ground = this.vel
        this.angular_velocity_on_ground = this.angularVelocity
    }

    override onInitialize(engine: ex.Engine): void {
        this.update_graphic()
    }

    override onPostUpdate(engine: ex.Engine, elapsed: number): void {
        if (this.state & SpiderState.deactivated) {
            return
        }

        this.command = this.get_user_command(engine)

        if (this.command & UserCommand.walk_forwards) {
            const acceleration = this.direction.scale(this.acceleration[UserCommand.walk_forwards])
            this.handle_movement(acceleration, elapsed)
        } else if (this.command & UserCommand.walk_backwards && !(this.state & SpiderState.charging_jump)) {
            const acceleration = this.direction.scale(this.acceleration[UserCommand.walk_backwards])
            this.handle_movement(acceleration, elapsed)
        } else if (this.command & UserCommand.run) {
            const acceleration = this.direction.scale(this.acceleration[UserCommand.run])
            this.handle_movement(acceleration, elapsed)
        }

        if (this.command & UserCommand.turn_clockwise) {
            const acceleration = this.acceleration[UserCommand.turn_clockwise]
            this.handle_turning(acceleration, elapsed)
        } else if (this.command & UserCommand.turn_counter_clockwise) {
            const acceleration = this.acceleration[UserCommand.turn_counter_clockwise]
            this.handle_turning(acceleration, elapsed)
        }

        if (this.command & UserCommand.charge_jump) {
            this.handle_jump_charging(elapsed)
        } else if (this.command & UserCommand.jump) {
            this.jump(elapsed)
        }

        // try {
        //     if (this.linear_velocity_on_ground.magnitude === 0) {
        //         this.state = SpiderState.moving
        //     } else {
        //         this.state = SpiderState.idle
        //     }

        //     if (Math.abs(this.angular_velocity_on_ground) === 0) {
        //         this.state |= SpiderState.turning
        //     } else {
        //         this.state = SpiderState.idle
        //     }
        // } catch {}

        if ((this.vertical_velocity < 0 && this.state & SpiderState.jumping) || !this.is_positioned_over_any_platform) {
            this.state = SpiderState.free_falling
        } else if (this.vertical_velocity === 0) {
            this.state = this.state & ~SpiderState.free_falling
        }

        this.handle_ground_friction(elapsed)
        this.handle_jumping(elapsed)
        this.handle_airborne_state(elapsed)
        this.update_global_velocities(elapsed)
        this.update_graphic()

        // console.log(
        //     'STATE: \n',
        //     separate_bitflags(this.state)
        //         .map((state) => SpiderState[state])
        //         .join('\n'),
        //     this.positioned_over_platforms,
        // )
    }

    private get_user_command(engine: ex.Engine): UserCommand {
        const { keyboard } = engine.input
        let command: UserCommand = UserCommand.none

        command |= keyboard.isHeld(ex.Keys.KeyW)
            ? keyboard.isHeld(ex.Keys.ShiftLeft)
                ? UserCommand.run
                : UserCommand.walk_forwards
            : UserCommand.none

        command |= keyboard.isHeld(ex.Keys.KeyS) ? UserCommand.walk_backwards : UserCommand.none

        command |= keyboard.wasReleased(ex.Keys.Space)
            ? UserCommand.jump
            : keyboard.isHeld(ex.Keys.Space)
              ? UserCommand.charge_jump
              : UserCommand.none

        command |= keyboard.isHeld(ex.Keys.KeyD) ? UserCommand.turn_clockwise : UserCommand.none
        command |= keyboard.isHeld(ex.Keys.KeyA) ? UserCommand.turn_counter_clockwise : UserCommand.none
        return command
    }

    private get direction() {
        return ex.Vector.Up.rotate(this.rotation)
    }

    private jump(timedelta: number) {
        if (!(this.state & SpiderState.airborne)) {
            this.vertical_velocity = this.jump_strength * 2 + 10
            this.level.camera.zoomOverTime(0.62, 1000)
            this.state = SpiderState.jumping

            this.linear_velocity_in_air = this.direction.scale(this.linear_velocity_on_ground.dot(this.direction))

            const current_platform_velocities = this.get_velocities_from_current_platform(timedelta)
            if (current_platform_velocities) {
                this.linear_velocity_in_air.add(current_platform_velocities.linear_velocity)
                this.angular_velocity_in_air += current_platform_velocities.angular_velocity
            }
        }
    }

    private land() {
        this.vertical_velocity = 0
        this.jump_strength = 0
        this.linear_velocity_in_air = ex.vec(0, 0)
        this.angular_velocity_in_air = 0
        this.state = SpiderState.idle
    }

    private handle_movement(linear_acceleration: ex.Vector, timedelta: number) {
        this.linear_velocity_on_ground = this.linear_velocity_on_ground.add(linear_acceleration.scale(timedelta / 1000))
    }

    private handle_turning(angular_acceleration: number, timedelta: number) {
        const corrected_acceleration =
            this.state & SpiderState.moving
                ? angular_acceleration / this.linear_velocity_on_ground.normalize().scale(10).magnitude
                : angular_acceleration

        this.angular_velocity_on_ground = this.angular_velocity_on_ground + (corrected_acceleration * timedelta) / 1000
    }

    private handle_airborne_state(timedelta: number) {
        if (this.state & SpiderState.airborne) {
            this.update_altitude(timedelta)
            this.handle_free_falling()
        }
    }

    private handle_jump_charging(timedelta: number) {
        if (!(this.state & SpiderState.airborne)) {
            this.state = SpiderState.charging_jump
            this.tick_jump_charging(timedelta)
            this.level.camera.zoom = Math.max(this.level.camera.zoom - this.jump_strength_meter_value / 5000, 0.5)

            if (this.jump_strength_meter_value >= 1) {
                this.level.camera.shake(2, 2, 100)
            }
        }
    }

    private handle_jumping(timedelta: number) {
        if (this.state & SpiderState.jumping) {
            this.linear_velocity_in_air = this.linear_velocity_in_air.add(
                this.direction.scale((Math.log(this.jump_strength / 100 + 0.1) * timedelta) / 1000),
            )
        }
    }

    private handle_ground_friction(timedelta: number) {
        const velocity_direction = this.linear_velocity_on_ground.normalize()
        const linear_deceleration = velocity_direction.negate().scale(this.ground_friction).scale(this.gravity)
        const linear_damping = 1 - this.ground_friction
        const velocity_delta = linear_deceleration.scale(timedelta / 1000)
        this.linear_velocity_on_ground = this.linear_velocity_on_ground.add(velocity_delta).scale(linear_damping)
        if (this.linear_velocity_on_ground.magnitude < 0.2) {
            this.linear_velocity_on_ground = ex.vec(0, 0)
        }

        const angular_deceleration = -1 * velocity_delta.scale(1 / this.width).magnitude
        const angular_damping = linear_damping
        this.angular_velocity_on_ground = angular_damping * (this.angular_velocity_on_ground + angular_deceleration)
        if (Math.abs(this.angular_velocity_on_ground) < 0.001) {
            this.angular_velocity_on_ground = 0
        }
    }

    private handle_free_falling() {
        if (this.state & (SpiderState.free_falling | SpiderState.dead)) {
            if (this.is_positioned_over_any_platform) {
                if (this.altitude <= 0.1) {
                    this.land()
                }
            } else {
                if (this.altitude < -0.1 && !(this.state & SpiderState.dead)) {
                    this.begin_death()
                }

                if (this.altitude < -20) {
                    this.actions.fade(0, 1500)
                }

                if (this.altitude < -30) {
                    this.finish_death()
                }
            }
        }
    }

    private begin_death() {
        this.z = -1
        this.state = SpiderState.dead
        this.positioned_over_platforms.clear()
        this.jump_strength = 0
        this.level.trigger_game_over()
    }

    public finish_death() {
        this.state = SpiderState.deactivated
        this.isActive = false
    }

    protected override update_global_velocities(timedelta: number): void {
        if (this.state & SpiderState.airborne) {
            this.vel = this.linear_velocity_in_air
            this.angularVelocity = this.angular_velocity_in_air
        } else {
            this.vel = this.linear_velocity_on_ground
            this.angularVelocity = this.angular_velocity_on_ground
            super.update_global_velocities(timedelta)
        }
    }

    private update_graphic() {
        const graphic = this.get_graphic(this.command)
        this.graphics.use(graphic)
    }

    private get_graphic(command: UserCommand) {
        if (this.state & SpiderState.airborne) {
            return SpiderIdleSprite
        } else if (command & UserCommand.walk_forwards) {
            return SpiderWalkForwardsAnimation
        } else if (command & UserCommand.walk_backwards) {
            return SpiderWalkBackwardsAnimation
        } else if (command & UserCommand.run) {
            return SpiderRunAnimation
        } else if (command & (UserCommand.turn_clockwise | UserCommand.turn_counter_clockwise)) {
            return SpiderWalkBackwardsAnimation
        } else {
            return SpiderIdleSprite
        }
    }

    override onCollisionStart(
        self: ex.Collider,
        other: ex.Collider,
        side: ex.Side,
        contact: ex.CollisionContact,
    ): void {
        if (this.state & SpiderState.dead) {
            return this.positioned_over_platforms.clear()
        } else {
            super.onCollisionStart(self, other, side, contact)
        }
    }

    override onCollisionEnd(self: ex.Collider, other: ex.Collider, side: ex.Side, contact: ex.CollisionContact): void {
        if (this.state & SpiderState.dead) {
            return this.positioned_over_platforms.clear()
        } else {
            super.onCollisionEnd(self, other, side, contact)
        }
    }
}
