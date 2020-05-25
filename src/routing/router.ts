import { RouteTrie } from "./routeTrie.ts";

export type RouteHandler<T> = (args: T) => void;

export interface Params {
    [key: string]: string;
}

export interface RoutingParams {
    pathParams: Params;
    queryParams: URLSearchParams;
}

export interface RouterFindResult<T> {
    handler: RouteHandler<T>
    pathParams?: Params;
}

enum HttpMethod {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    DELETE = 'DELETE',
    HEAD = 'HEAD',
    PATCH = 'PATCH',
    OPTIONS = 'OPTIONS',
    TRACE = 'TRACE',
    CONNECT = 'CONNECT',
}

/**
 * The router which handles mapping routes to specific handlers.
 * The router can handle dynamic and wildcard routes as well.
 */
export class Router<T> {
    routeMethodMap: Map<HttpMethod, RouteTrie<RouteHandler<T>>>;

    constructor() {
        this.routeMethodMap = new Map();

        for (const method in HttpMethod) {
            this.routeMethodMap.set(method as HttpMethod, new RouteTrie());
        }
    }

    /**
     * Maps a specified HTTP method and route to a given handler
     * @param method The HTTP method to bind
     * @param path The path to bind
     * @param handler The handler to be found at the given path and HTTP method
     */
    public map(method: string, path: string, handler: RouteHandler<T>): void {
        const httpMethod = method.toUpperCase() as HttpMethod;
        const trie = this.routeMethodMap.get(httpMethod);

        if (!trie) {
            throw Error(`HTTP Method '${method}' is not currently supported`);
        }

        trie.insert(path, handler);
    }

    /**
     * Finds a route given a method and path. It will return the appropriate handler,
     * as well as any path params that are necessary.
     * @param method The HTTP method to use
     * @param path The path to find a handler
     * @returns a RouterFindResult interface, which contains the handler, as well
     *  as any path params. Otherwise, it will return null if no route can be found.
     */
    public find(method: string, path: string): RouterFindResult<T> | null {
        const httpMethod = method.toUpperCase() as HttpMethod;
        const trie = this.routeMethodMap.get(httpMethod);

        if (!trie) {
            throw Error(`HTTP Method '${method}' is not currently supported`);
        }

        const result = trie.find(path);
        if (!result || !result.node?.value) {
            return null;
        }

        return {
            handler: result.node.value!,
            pathParams: result.params 
        }
    }
}