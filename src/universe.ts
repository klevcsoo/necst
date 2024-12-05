import {
    BaseComponentMap,
    BaseSystemList,
    ComponentQuery,
    EntityRegistry, EntitySystem,
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

    let createdAt = performance.now()
    let lastUpdateAt = createdAt;

    return {
        createEntity(): string {
            const uuid = crypto.randomUUID();
            registry[uuid] = {};
            return uuid;
        },
        attachComponent<T extends keyof CompMap>(uuid: string, name: T, data: CompMap[T]) {
            if (!registry[uuid]) {
                registryError("Attempted to attach component to nonexistent entity");
            }

            registry[uuid][name] = data;
        },
        detachComponent<T extends keyof CompMap>(uuid: string, componentName: T) {
            if (!registry[uuid]) {
                registryError("Attempted to detach component from nonexistent entity");
            }

            delete registry[uuid][componentName];
        },
        destroyEntity(uuid: string) {
            if (!registry[uuid]) {
                registryError("Attempted to destroy nonexistent entity");
            }

            delete registry[uuid];
        },
        registerSystem(name: SysList[number], system: EntitySystem<CompMap, SysList>) {
            systems[name] = system;
        },
        unregisterSystem(name: SysList[number]) {
            if (!systems[name]) {
                registryError("Attempted to unregister nonexistent system");
            }

            delete systems[name];
        },
        scheduleSystem(system: SysList[number], x: number, unit: "updates" | "seconds") {
            schedules[system] = {
                x: x,
                seconds: unit === "seconds",
                timeSinceLastUpdate: Number.MAX_SAFE_INTEGER
            };
        },
        update(resetTime?: boolean) {
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
        },
        view<Query extends ComponentQuery<CompMap>>(...components: Query): Iterable<EntityViewData<CompMap, Query>> {
            return createRegistryView(registry, components);
        }
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
