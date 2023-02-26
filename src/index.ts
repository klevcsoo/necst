import {BaseComponentMap, EntityRegistry, EntitySystem, EntitySystemActions, EntityViewData, Universe} from "./types";
import {createRegistryView, registryError, typedKeys} from "./utils";

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
export function createUniverse<CompMap extends BaseComponentMap>(): Universe<CompMap> {
    const registry: EntityRegistry<CompMap> = {};
    const systems: {
        [name: string]: EntitySystem<CompMap>
    } = {};
    const commandQueue: {
        [systemName: string]: {
            [commandName: string]: unknown
        }
    } = {};

    let createdAt = Date.now();
    let lastUpdateAt = createdAt;

    const create: Universe<CompMap>["create"] = () => {
        const uuid = crypto.randomUUID();
        registry[uuid] = {};
        return uuid;
    };

    const attach: Universe<CompMap>["attach"] = (uuid, name, data) => {
        if (!registry[uuid]) {
            registryError("Attempted to attach component to nonexistent entity");
        }

        registry[uuid][name] = data;
    };

    const detach: Universe<CompMap>["detach"] = (uuid, componentName) => {
        if (!registry[uuid]) {
            registryError("Attempted to detach component from nonexistent entity");
        }

        delete registry[uuid][componentName];
    };

    const destroy: Universe<CompMap>["destroy"] = (uuid) => {
        if (!registry[uuid]) {
            registryError("Attempted to destroy nonexistent entity");
        }

        delete registry[uuid];
    };

    const register: Universe<CompMap>["register"] = (name, system) => {
        systems[name] = system;
    };

    const unregister: Universe<CompMap>["unregister"] = (name) => {
        if (!systems[name]) {
            registryError("Attempted to unregister nonexistent system");
        }

        delete systems[name];
    };

    const update: Universe<CompMap>["update"] = (resetTime) => {
        const now = Date.now();
        if (resetTime) createdAt = now;

        const time = now - createdAt;
        const delta = now - lastUpdateAt;
        lastUpdateAt = now;

        for (const systemName of typedKeys(systems)) {
            const actions: EntitySystemActions<CompMap> = {
                createView(...comps): Iterable<EntityViewData<CompMap>> {
                    return createRegistryView(registry, comps);
                },
                sendCommand<T = unknown>(system: string, command: string, data?: T) {
                    if (!commandQueue[system]) commandQueue[system] = {};
                    commandQueue[system][command] = data;
                },
                handleCommand<T = unknown>(command: string, handler: (data: T) => void) {
                    const cmdData = commandQueue[systemName][command];
                    if (!!cmdData) handler(cmdData as T);
                    delete commandQueue[systemName][command];
                }
            };

            systems[systemName](actions, time, delta);
        }
    };

    const view: Universe<CompMap>["view"] = (...components) => {
        return createRegistryView(registry, components);
    };

    return {
        create: create,
        attach: attach,
        detach: detach,
        destroy: destroy,
        register: register,
        unregister: unregister,
        update: update,
        view: view
    };
}

export type {EntitySystem};
