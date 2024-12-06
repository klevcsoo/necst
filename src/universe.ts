import {
    BaseComponentMap,
    BaseSystemList,
    ComponentQuery,
    EntityRegistry,
    EntitySystemActions,
    EntitySystemProcessor,
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
    const entityRegistry: EntityRegistry<CompMap> = {};
    const systemRegistry: SystemRegistry<CompMap, SysList> = {};

    let createdAt = performance.now();
    let lastUpdateAt = createdAt;

    return {
        createEntity(): string {
            const uuid = crypto.randomUUID();
            entityRegistry[uuid] = {};
            return uuid;
        },
        attachComponent<T extends keyof CompMap>(uuid: string, name: T, data: CompMap[T]) {
            if (!entityRegistry[uuid]) {
                registryError("Attempted to attach component to nonexistent entity");
            }

            entityRegistry[uuid][name] = data;
        },
        detachComponent<T extends keyof CompMap>(uuid: string, componentName: T) {
            if (!entityRegistry[uuid]) {
                registryError("Attempted to detach component from nonexistent entity");
            }

            delete entityRegistry[uuid][componentName];
        },
        destroyEntity(uuid: string) {
            if (!entityRegistry[uuid]) {
                registryError("Attempted to destroy nonexistent entity");
            }

            delete entityRegistry[uuid];
        },
        cloneEntity(uuid: string): EntityRegistry<CompMap>[string] {
            return {...entityRegistry[uuid]};
        },
        registerSystem(name: SysList[number], processor: EntitySystemProcessor<CompMap, SysList>) {
            if (systemRegistry[name]) {
                registryError("Attempted to register already registered system");
            }

            systemRegistry[name] = {
                isFrozen: false,
                commandQueue: {},
                systemProcessor: processor,
            };
        },
        unregisterSystem(name: SysList[number]) {
            if (!systemRegistry[name]) {
                registryError("Attempted to unregister nonexistent system");
            }

            delete systemRegistry[name];
        },
        isSystemRegistered(name: SysList[number]): boolean {
            return !!systemRegistry[name];
        },
        scheduleSystem(name: SysList[number], x: number, unit: "updates" | "seconds") {
            if (!systemRegistry[name]) {
                registryError("Attempted to schedule a nonexistent system");
            }

            systemRegistry[name]!.schedule = {
                x: x,
                seconds: unit === "seconds",
                timeSinceLastUpdate: Number.MAX_SAFE_INTEGER
            };
        },
        unscheduleSystem(name: SysList[number]) {
            if (!systemRegistry[name]) {
                registryError("Attempted to unschedule a nonexistent system");
            }

            systemRegistry[name]!.schedule = undefined;
        },
        update(resetTime?: boolean) {
            const now = performance.now();
            if (resetTime) createdAt = now;

            const time = now - createdAt;
            const delta = now - lastUpdateAt;
            lastUpdateAt = now;

            for (const currentSystemName of typedKeys(systemRegistry)) {
                const system = systemRegistry[currentSystemName]!;

                if (system.isFrozen) continue;

                if (!!system.schedule) {
                    const schedule = system.schedule;
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
                        return createRegistryView(entityRegistry, comps);
                    },
                    sendCommand<T = unknown>(systemName: SysList[number], command: string, data?: T) {
                        if (!systemRegistry[systemName]) {
                            registryError("Attempted to send command to nonexistent system");
                        }

                        systemRegistry[systemName]!.commandQueue[command] = data;
                    },
                    handleCommand<T = unknown>(command: string, handler: (data: T) => void) {
                        if (!system.commandQueue[command]) return;

                        handler(system.commandQueue[command] as T);
                        delete system.commandQueue[command];
                    },
                    freezeSystem(name?: SysList[number]) {
                        if (name) {
                            if (!systemRegistry[name]) {
                                registryError("Attempted to freeze nonexistent system");
                            }

                            systemRegistry[name]!.isFrozen = true;
                        } else {
                            system.isFrozen = true;
                        }
                    },
                    unfreezeSystem(name?: SysList[number]) {
                        if (name) {
                            if (!systemRegistry[name]) {
                                registryError("Attempted to unfreeze nonexistent system");
                            }

                            systemRegistry[name]!.isFrozen = false;
                        } else {
                            system.isFrozen = false;
                        }
                    }
                };

                systemRegistry[currentSystemName]!.systemProcessor(actions, time, delta);
            }
        },
        view<Query extends ComponentQuery<CompMap>>(...components: Query): Iterable<EntityViewData<CompMap, Query>> {
            return createRegistryView(entityRegistry, components);
        }
    };
}

export function* createRegistryView<
    CompMap extends BaseComponentMap,
    Query extends ComponentQuery<CompMap>
>(
    registry: EntityRegistry<CompMap>, components: Query
): Iterable<EntityViewData<CompMap, Query>> {
    for (const uuid of typedKeys(registry)) {
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
