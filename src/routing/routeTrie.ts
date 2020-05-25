export class RouteTrieNode<T> {
    /**
     * The path of the current node. It is not the full path, but
     * rather the part of the path that is relevant. ie: /path
     */
    path: string;

    /**
     * The parent of this path
     */
    parent: RouteTrieNode<T> | null;

    /**
     * All possible paths that start with the current path.
     */
    children: Map<string, RouteTrieNode<T>>;

    /**
     * Taking a simple approach. Route parts can be a dynamic
     * segment. This will be populated in the pathParams option.
     */
    dynamicSegment?: RouteTrieNode<T>;

    /**
     * If this is an actual route, this will be the value associated
     * with the route
     */
    value?: T;

    constructor(path: string, parent: RouteTrieNode<T> | null, value?: T) {
        this.path = path;
        this.parent = parent;
        this.children = new Map();
        this.value = value;
    }

    get fullPath(): string {
        return `${this.parent?.fullPath ?? ''}/${this.path}`;
    }
}

/**
 * The RouteTrie can determine if there are dynamic
 * parameters in the path. Therefore, the result of a `find`
 * operation is the node itself, and the parameters in the route.
 */
export interface RouteTrieFindResult<T> {
    node: RouteTrieNode<T>;
    params?: { [key: string]: string };
}

/**
 * The RouteTrie is a Trie data structure specifically
 * to handle routes. It will split a path by `/`, and
 * create nodes based on the parts.
 * 
 * It can also handle dynamic routes, such as `:user_id`, or a wildcard
 * such as `*`. All parts of the path that start with `:` is considered a dynamic
 * segment.
 */
export class RouteTrie<T> {
    root: RouteTrieNode<T>;

    constructor() {
        // The root is a TrieNode with no parent or path
        this.root = new RouteTrieNode('', null);
    }

    /**
     * Inserts a path into the Trie. It is inserted as
     * a path, and the result will be a set of Trie nodes.
     * @param path The path of the route. It can handle dynamic parts and wildcards.
     *  Any part of the path that starts with `:` is considered a dynamic part, and
     *  it will populate as a path param. For example, `/posts/:post_id` will ensure that
     *  hitting route `/posts/1` will result in a path param object with `{ post_id: "1" }`
     * @param value The value of at the Route.
     */
    public insert(path: string, value?: T): void {
        if (!path || path.length === 0 || path[0] !== '/') {
            path = '/' + path;
        }

        const parts = path.split('/').filter((part: string) => part);

        let current = this.root;
        for (const part of parts) {
            if (this.isDynamicPart(part)) {
                const dynamicPart = part.replace(':', '');
                if (current.dynamicSegment) {
                    if (current.dynamicSegment.path !== dynamicPart) {
                        throw new Error(`Cannot create route ${path}. Route already has a dynamic segment with ${current.dynamicSegment.path}.`);
                    }

                    current = current.dynamicSegment;
                } else {
                    // Build a dynamic node, and remove the ':'
                    const next = new RouteTrieNode<T>(dynamicPart, current);
                    current.dynamicSegment = next;
                    current = next;
                }
            } else if (current.children.has(part)) {
                current = current.children.get(part)!;
            } else {
                // We need to start building nodes
                const next = new RouteTrieNode<T>(part, current);
                current.children.set(part, next);
                current = next;
            }
        }

        if (current.value) {
            throw new Error(`Value already exists at ${path}. A path can only map to one value.`);
        }

        current.value = value;
    }

    /**
     * Finds the node at the path. It will also return any wildcard parameters found constructing the
     * route. 
     * @param path The path to the route.
     * @returns A RouteTrieFindResult, or null if no route exists at the path
     */
    public find(path: string): RouteTrieFindResult<T> | null {
        if (this.isRoot(path)) {
            return {
                node: this.root,
            };
        }

        if (path[0] !== '/') {
            path = '/' + path;
        }

        const parts = path.split('/').filter((part: string) => part);
        const params: { [key: string]: string } = {};

        let current = this.root;
        for (const part of parts) {
            if (current.children.has(part)) {
                current = current.children.get(part)!;
            } else if (current.dynamicSegment) {
                params[current.dynamicSegment.path] = part;
                current = current.dynamicSegment;
            } else {
                // Path does not exist. Return null
                return null;
            }
        }

        return {
            node: current,
            params
        };
    }

    private isRoot(path: string): boolean {
        return path?.length === 0 || path === '/'; 
    }

    private isDynamicPart(part: string): boolean {
        return part.startsWith(':') || part === '*';
    }
}
