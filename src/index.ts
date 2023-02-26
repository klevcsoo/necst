import * as crypto from "crypto";
import {BaseComponentMap, ComponentQuery, EntityRegistry, EntitySystem, Universe} from "./types";
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
            systems[systemName]((...components: ComponentQuery<CompMap>) => {
                return createRegistryView(registry, components);
            }, time, delta);
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
