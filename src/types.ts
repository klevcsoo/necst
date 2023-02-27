/**
 * A general base for component maps.
 * IT is recommended to use this if you're developing
 * in JavaScript. Using this provides no type-safe behaviour.
 * When developing in TypeScript, create your own component
 * map type that extends this one, and feed that into the
 * `createUniverse` function as the generic parameter type.
 *
 * The keys in this map represent the names of the components,
 * you will refer to them with these in the code.
 * The value of each key is the type that the object of
 * the component needs to have.
 *
 * Any deviations in code from this component map will be caught
 * by the compiler.
 *
 * @example
 * export type MyComponentMap = {
 *     position: PositionComponentType
 *     velocity: typeof VelocityComponentClass
 *     weapon: { selected: Weapon; list: Weapon; }
 * }
 */
export type BaseComponentMap = {
    [key: string]: unknown
}

/**
 * Similar to `BaseComponentMap`, but for your systems.
 * @see BaseComponentMap
 */
export type BaseSystemList = readonly string[]

/**
 * Contains data about the existing entities. In essence,
 * it is a map of maps type, where the outer keys are the
 * UUIDs of the entities and inside of each entity, the keys
 * are the names of the component *(this elliminates the
 * possibility of an entity having more than one of one
 * component type)* and the values are the component objects
 * themselfs.
 * @see SystemRegistry
 */
export type EntityRegistry<CompMap extends BaseComponentMap> = {
    [uuid: string]: Partial<{
        [componentName in keyof CompMap]: CompMap[componentName]
    }>
}

/**
 * Contains the registered systems.
 * @see EntityRegistry
 */
export type SystemRegistry<
    CompMap extends BaseComponentMap,
    SysList extends BaseSystemList
> = {
    [name in SysList[number]]?: EntitySystem<CompMap, SysList>
}

/**
 * Contains data about an entity returned by `createRegistryView`.
 * It is a map, where the first key is always `uuid` with the value
 * being the UUID of the entity itself.
 * The rest of the map contains ONLY the queried components of
 * the entity, even if there are more.
 */
export type EntityViewData<
    CompMap extends BaseComponentMap,
    Query extends ComponentQuery<CompMap>
> = {
    uuid: string
} & {
    [key in Query[number]]: CompMap[key]
}

/**
 * A list of components that are defined in the component map
 * of the universe.
 *
 * @example
 * const myQuery: ComponentQuery<MyComponentMap> = ["position", "velocity"]
 */
export type ComponentQuery<CompMap extends BaseComponentMap> = readonly (keyof CompMap)[]

/**
 * Actions that can be performed by a system.
 */
export type EntitySystemActions<
    CompMap extends BaseComponentMap,
    SysList extends BaseSystemList
> = {
    /**
     * Creates a view that contains the queried components foreach applicable entity.
     * @param comps the queried components
     */
    createView<
        Query extends ComponentQuery<CompMap>
    >(...comps: Query): Iterable<EntityViewData<CompMap, Query>>
    /**
     * Sends a command to a different system.
     * If the command is handled by that system, depending on the
     * order in which the systems were registered, it will be handled
     * during the current update cycle, or the next one.
     * @param system the system to send the command to
     * @param command the name of the command
     * @param data the data that does along with the command (optional)
     */
    sendCommand<T = unknown>(system: SysList[number], command: string, data?: T): void
    /**
     * Using this, you can handle the commands for the current system.
     * When called, the command that is to be handled is removed from
     * the command queue.
     * @param command the command name
     * @param handler the callback to be called to handle the command
     */
    handleCommand<T = unknown>(command: string, handler: (data: T) => void): void
}

/**
 * This is a scheme of what a system should look like.
 * Registered entity systems are run every time the
 * universe updates. Each system defines its own
 * behaviour and needed components.
 *
 * The system also gets `time` and `delta` parameters,
 * that stand for the time elapsed since the creation of
 * the universe and the time elapsed since the last
 * update respectively *(both in milliseconds)*.
 *
 * @example
 * const movementSystem: EntitySystem = ({createView}) => {
 *     const view = createView("position", "velocity");
 *
 *     for (const {uuid, position, velocity} of view) {
 *         position.x += velocity.x
 *         position.y += velocity.y
 *         console.log(`${uuid} moved to ${position}`)
 *     }
 * }
 */
export type EntitySystem<
    CompMap extends BaseComponentMap,
    SysList extends BaseSystemList
> = (actions: EntitySystemActions<CompMap, SysList>, time: number, delta: number) => void

/**
 * A `Universe` if the container of an Entity Component System.
 * Using this you can create and destroy entities, attach and
 * detach components, register and register systems or query
 * entities. Use `createUniverse` to get started.
 * @see createUniverse
 */
export type Universe<CompMap extends BaseComponentMap, SysList extends BaseSystemList> = {
    /**
     * Creates an entity in the universe with no components.
     * @returns the UUID of the entity
     */
    create(): string
    /**
     * Attaches a component to a specified entity.
     * @param uuid the UUID of the entity
     * @param name the custom name of the component
     * @param data the data object of the component
     */
    attach<T extends keyof CompMap>(uuid: string, name: T, data: CompMap[T]): void
    /**
     * Detaches a component from a specified entity.
     * @param uuid the UUID of the entity
     * @param componentName the custom name of the component
     */
    detach<T extends keyof CompMap>(uuid: string, componentName: T): void
    /**
     * Destroy a specified entity along with its components.
     * @param uuid the UUID of the entity
     */
    destroy(uuid: string): void
    /**
     * Registers a system to the universe.
     * @param name the custom name of the system
     * @param system the system function to be run on update
     */
    register(name: SysList[number], system: EntitySystem<CompMap, SysList>): void
    /**
     * Unregisters a system from the universe.
     * @param name the custom name of the system
     */
    unregister(name: SysList[number]): void
    /**
     * Schedules a system to run every X updates or seconds.
     * @param system name of the system to be scheduled
     * @param x the amount to wait before executing the system again
     * @param unit the unit of X
     */
    schedule(system: SysList[number], x: number, unit: "updates" | "seconds"): void
    /**
     * Updates the state of the universe by running all the
     * registered systems on all the entities.
     * @param resetTime if true, the universe time resets
     */
    update(resetTime?: boolean): void
    /**
     * Creates a view that contains the queried components for
     * each applicable entity.
     *
     * Not recommended to use on its own.
     * @param components the queried components
     */
    view<
        Query extends ComponentQuery<CompMap>
    >(...components: Query): Iterable<EntityViewData<CompMap, Query>>
}