import { ImageSource, Loader } from 'excalibur'

export const Resources = {
    spider_walk_animation_spritesheet: new ImageSource('./canvas.png'),
} as const

// We build a loader and add all of our resources to the boot loader
// You can build your own loader by extending DefaultLoader
export const loader = new Loader()
for (const res of Object.values(Resources)) {
    loader.addResource(res)
}
