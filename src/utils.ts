import {BaseComponentMap, ComponentQuery, EntityRegistry, EntityViewData} from "./types";

/**
 * Same as `ObjectConstructor.keys`, but the elements of the
 * returned array have the `keyof` type of the original object.
 * @param obj
 */
export function typedKeys<T extends Object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
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

export function registryError(message: string) {
    throw new Error(`ECS Registry Error: ${message}`);
}
