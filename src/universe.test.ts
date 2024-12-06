import {BaseComponentMap, createUniverse, Universe} from "./index";

interface Vector2D {
    x: number;
    y: number;
}

interface CounterComponent {
    count: number;
}

interface ComponentMap extends BaseComponentMap {
    position: Vector2D;
    velocity: Vector2D;
    counter: CounterComponent;
}

type SystemList = [
    "updatePosition",
    "sendCommand", "receiveCommand",
    "updateFreezeValue", "unfreezeFreezeValueUpdater"
]

let universe: Universe<ComponentMap, SystemList>;
let entityUUID: string;

beforeEach(done => {
    universe = createUniverse<ComponentMap, SystemList>();
    entityUUID = universe.createEntity();
    const position: Vector2D = {x: 5, y: 10};
    const velocity: Vector2D = {x: 1, y: -3};

    universe.attachComponent(entityUUID, "position", position);
    universe.attachComponent(entityUUID, "velocity", velocity);

    universe.registerSystem("updatePosition", ({createView}) => {
        const view = createView("position", "velocity");
        for (const {position, velocity} of view) {
            position.x += velocity.x;
            position.y += velocity.y;
        }
    });

    done();
});

test("create universe", done => {
    expect(universe).not.toBeFalsy();

    done();
});

test("create entity", done => {
    expect(entityUUID).toBeDefined();
    expect(typeof entityUUID).toBe("string");

    done();
});

test("attach component to entity", done => {
    const entity = universe.cloneEntity(entityUUID);

    expect(entity).toBeDefined();
    expect(entity.position).toBeDefined();
    expect(entity.velocity).toBeDefined();

    done();
});

test("register system", done => {
    expect(universe.isSystemRegistered("updatePosition")).toBeTruthy();

    done();
});

test("unregister system", done => {
    universe.unregisterSystem("updatePosition");
    expect(universe.isSystemRegistered("updatePosition")).toBeFalsy();

    done();
});

test("update universe (with simple system)", done => {
    for (let i = 0; i < 5; i++) universe.update();

    const entity = universe.cloneEntity(entityUUID);
    expect(entity.position).toBeDefined();
    expect(JSON.stringify(entity.position)).toBe(JSON.stringify({x: 10, y: -5}));

    done();
});

test("update universe (with command sending & handling)", done => {
    let numberSent: number = 0;
    let stringSent: string = "test string";
    let numberReceived: number = 0;
    let stringReceived: string = "";

    universe.registerSystem("sendCommand", ({sendCommand}) => {
        sendCommand("receiveCommand", "numberCommand", ++numberSent);
        sendCommand("receiveCommand", "stringCommand", stringSent);
    });
    universe.registerSystem("receiveCommand", ({handleCommand}) => {
        handleCommand("numberCommand", (data: number) => {
            numberReceived = data;
        });
        handleCommand("stringCommand", (data: string) => {
            stringReceived = data;
        });
    });

    universe.update();

    expect(numberReceived).toBe(numberSent);
    expect(stringReceived).toBe(stringSent);

    done();
});

test("update universe (with system freezing)", done => {
    let value = 0;
    let count = 0;

    universe.registerSystem("updateFreezeValue", ({freezeSystem}) => {
        value++;
        freezeSystem();
    });

    universe.registerSystem("unfreezeFreezeValueUpdater", ({unfreezeSystem}) => {
        if (count >= 3) unfreezeSystem("updateFreezeValue");
    });

    for (; count < 5; count++) universe.update();

    expect(value).toBe(2);

    done();
});
