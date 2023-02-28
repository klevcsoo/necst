/**
 * Same as `ObjectConstructor.keys`, but the elements of the
 * returned array have the `keyof` type of the original object.
 * @param obj
 */
export function typedKeys<T extends Object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
}

export function registryError(message: string) {
    throw new Error(`ECS Registry Error: ${message}`);
}
