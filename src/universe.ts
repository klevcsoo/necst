import {
    BaseComponentMap,
    BaseSystemList,
    ComponentQuery,
    EntityRegistry,
    EntitySystemActions,
    EntityViewData,
    SystemRegistry,
    Universe
} from "./types";
import {registryError, typedKeys} from "./utils";

/**
 * Creates a `Universe`, from which you can controll your
 * Entity Component System.
 * If you are using TypeScript, it is strongly recommended
 * to create your own component map type that extends the base
 * component map, to enable type-safe for component names and
 * queries.
 * @see BaseComponentMap
 * @see Universe
 */
export function createUniverse<
    CompMap extends BaseComponentMap = BaseComponentMap,
    SysList extends BaseSystemList = BaseSystemList
>(): Universe<CompMap, SysList> {
    const registry: EntityRegistry<CompMap> = {};
    const systems: SystemRegistry<CompMap, SysList> = {};
    const commandQueue: {
        [systemName in SysList[number]]?: {
            [commandName: string]: unknown
        }
    } = {};
    const schedules: {
        [systemName in SysList[number]]?: {
            x: number
            seconds: boolean
            timeSinceLastUpdate: number
        }
    } = {};

    let createdAt = Date.now();
    let lastUpdateAt = createdAt;

    const create: Universe<CompMap, SysList>["createEntity"] = () => {
        const uuid = crypto.randomUUID();
        registry[uuid] = {};
        return uuid;
    };

    const attach: Universe<CompMap, SysList>["attachComponent"] = (uuid, name, data) => {
        if (!registry[uuid]) {
            registryError("Attempted to attach component to nonexistent entity");
        }

        registry[uuid][name] = data;
    };

    const detach: Universe<CompMap, SysList>["detachComponent"] = (uuid, componentName) => {
        if (!registry[uuid]) {
            registryError("Attempted to detach component from nonexistent entity");
        }

        delete registry[uuid][componentName];
    };

    const destroy: Universe<CompMap, SysList>["destroyEntity"] = (uuid) => {
        if (!registry[uuid]) {
            registryError("Attempted to destroy nonexistent entity");
        }

        delete registry[uuid];
    };

    const register: Universe<CompMap, SysList>["registerSystem"] = (name, system) => {
        systems[name] = system;
    };

    const unregister: Universe<CompMap, SysList>["unregisterSystem"] = (name) => {
        if (!systems[name]) {
            registryError("Attempted to unregister nonexistent system");
        }

        delete systems[name];
    };

    const schedule: Universe<CompMap, SysList>["scheduleSystem"] = (sys, x, unit) => {
        schedules[sys] = {
            x: x,
            seconds: unit === "seconds",
            timeSinceLastUpdate: Number.MAX_SAFE_INTEGER
        };
    };

    const update: Universe<CompMap, SysList>["update"] = (resetTime) => {
        const now = Date.now();
        if (resetTime) createdAt = now;

        const time = now - createdAt;
        const delta = now - lastUpdateAt;
        lastUpdateAt = now;

        for (const systemName of typedKeys(systems)) {
            if (!!schedules[systemName]) {
                const schedule = schedules[systemName]!;
                const threshold = schedule.seconds ?
                    schedule.x * 1000 :
                    schedule.x - 1;

                if (schedule.timeSinceLastUpdate < threshold) {
                    schedule.timeSinceLastUpdate += schedule.seconds ? delta : 1;
                    continue;
                } else {
                    schedule.timeSinceLastUpdate = 0;
                }
            }

            const actions: EntitySystemActions<CompMap, SysList> = {
                createView<
                    Query extends ComponentQuery<CompMap>
                >(...comps: Query): Iterable<EntityViewData<CompMap, Query>> {
                    return createRegistryView(registry, comps);
                },
                sendCommand<T = unknown>(system: SysList[number], command: string, data?: T) {
                    if (!commandQueue[system]) commandQueue[system] = {};
                    // ⬇️ i have no clue ⬇️
                    (commandQueue[system]! as any)[command] = data;
                },
                handleCommand<T = unknown>(command: string, handler: (data: T) => void) {
                    if (!commandQueue[systemName]) return;
                    if (!commandQueue[systemName]![command]) return;

                    handler(commandQueue[systemName]![command] as T);
                    delete commandQueue[systemName]![command];
                }
            };

            systems[systemName]!(actions, time, delta);
        }
    };

    const view: Universe<CompMap, SysList>["view"] = (...components) => {
        return createRegistryView(registry, components);
    };

    return {
        createEntity: create,
        attachComponent: attach,
        detachComponent: detach,
        destroyEntity: destroy,
        registerSystem: register,
        unregisterSystem: unregister,
        scheduleSystem: schedule,
        update: update,
        view: view
    };
}

export function* createRegistryView<
    CompMap extends BaseComponentMap,
    Query extends ComponentQuery<CompMap>
>(
    registry: EntityRegistry<CompMap>, components: Query
): Iterable<EntityViewData<CompMap, Query>> {
    for (const uuid of Object.keys(registry)) {
        const entity = registry[uuid];

        if (components.every(value => !!entity[value])) {
            const entityViewData: EntityViewData<CompMap, Query> = {
                uuid: uuid
            } as EntityViewData<CompMap, Query>;

            for (const compKey of typedKeys(entity)) {
                if (components.includes(compKey)) {
                    (entityViewData[compKey] as any) = entity[compKey]!;
                }
            }

            yield entityViewData;
        }
    }
}
