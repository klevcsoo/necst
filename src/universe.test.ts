import {createUniverse} from "./index";
import {EntitySystem, EntityViewData} from "./types";

type PositionComponent = {
    x: number
    y: number
}
type VelocityComponent = {
    x: number
    y: number
}
type CounterComponent = {
    count: number
}
type ComponentMap = {
    position: PositionComponent
    velocity: VelocityComponent
    counter: CounterComponent
}

type SystemList = ["movement", "commandSender", "commandReceiver"]

const testEntityPosition: PositionComponent = {x: 5, y: 10};

const movementSystem: EntitySystem<ComponentMap, SystemList> = ({createView}) => {
    const view = createView("position", "velocity");
    for (const {uuid, position, velocity} of view) {
        position.x += velocity.x;
        position.y += velocity.y;
        console.log(`${uuid} has moved to ${JSON.stringify(testEntityPosition)}`);
    }
};

let senderCommandValue = 0;
let receiverCommandValue = 0;
const commandSenderSystem: EntitySystem<ComponentMap, SystemList> = ({sendCommand}) => {
    sendCommand("commandReceiver", "test", ++senderCommandValue);
};

const commandReceiverSystem: EntitySystem<ComponentMap, SystemList> = ({handleCommand}) => {
    handleCommand("test", (value: number) => {
        console.log("received 'test' command with value", value);
        receiverCommandValue = value;
    });
};

const universe = createUniverse<ComponentMap, SystemList>();

test("universe exists", () => {
    expect(universe).not.toBeFalsy();
});

test("create entity", () => {
    const entity = universe.createEntity();
    expect(typeof entity).toBe("string");
});

test("attach component to entity", () => {
    const entity = universe.createEntity();
    const position: PositionComponent = testEntityPosition;
    const velocity: VelocityComponent = {x: 1, y: -3};

    universe.attachComponent(entity, "position", position);
    universe.attachComponent(entity, "velocity", velocity);

    const entities: EntityViewData<ComponentMap, ["position"]>[] = [];
    for (const e of universe.view("position")) {
        entities.push(e);
    }

    expect(entities.length).toBeGreaterThan(0);
});

test("register system", () => {
    universe.registerSystem("movement", movementSystem);
});

test("unregister system", () => {
    universe.unregisterSystem("movement");
});

test("update universe", () => {
    universe.registerSystem("movement", movementSystem);
    universe.registerSystem("commandSender", commandSenderSystem);
    universe.registerSystem("commandReceiver", commandReceiverSystem);

    (new Array(5)).fill(null).forEach(() => universe.update());

    expect(
        JSON.stringify(testEntityPosition)
    ).toBe(
        JSON.stringify({x: 10, y: -5})
    );

    expect(receiverCommandValue).toBe(senderCommandValue);
});
