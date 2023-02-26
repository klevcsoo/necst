# NECST

NECST is a ~~_very creatively named_~~ type-safe and
well-documented entity component system.
It was made for my own internal use originally, but it's
open source now so feel free to use it in your own projects.

## Installation

The package is not on NPM, so instead of a package,
you have to install the repo itsef.

```shell
npm install https://github.com/klevcsoo/necst
```

Please refer to [this](https://www.pluralsight.com/guides/install-npm-packages-from-gitgithub)
guide if you would like to install specific versions.

## Usage

**🚧 Full documentation is under construction 🚧**

I added JSDoc to every public function and type so it's
not to difficult to get started.

```typescript
// you can use types...
type PositionComponentType = { x: number; y: number; };

// ...or classes as components
class VelocityComponentClass {
    public x: number
    public y: number
}

type MyComponentMap = {
    position: PositionComponentType;
    velocity: typeof VelocityComponentClass;
};

const movementSystem: EntitySystem<MyComponentMap> = (createView) => {
    for (const {uuid, position, velocity} of createView("position", "velocity")) {
        position.x += velocity.x;
        position.y += velocity.y;
        console.log(`${uuid} moved to ${position}`);
    }
};

const universe = createUniverse<MyComponentMap>();

const player = universe.create();
universe.attach(player, "position", {x: 0, y: 0});
universe.attach(player, "velocity", {x: 1, y: 3});

universe.register("movement", movementSystem);

setInterval(() => {
    universe.update();
}, 500);
```