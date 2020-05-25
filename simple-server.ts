import { serve, ServerRequest, Server } from './src/deno/deno.ts';
import { Router, RouteHandler, RoutingParams, Params } from "./src/routing/router.ts";
import { Logger } from "./src/logging/logger.ts";
import { splitQueryParamPart } from "./src/utils/parse.ts";
import { SimpleBeforeMiddleware, SimpleAfterMiddleware } from './src/middleware/middleware.ts';

export interface MiddlewareOptions {
  [name: string]: unknown;
}

/**
 * The arguments passed to the route callbacks. It comes
 * with the raw request from the Server, as well as
 * a params object containing query and path parameters
 * as JSON objets. 
 */
export interface ServerHandlerArgs {
  /**
   * The raw request coming from the native Server object.
   */
  req: ServerRequest;

  /**
   * An object containing both query and path parameters. These
   * are parsed out of the path itself, and path parameters are
   * contigent on the routes created.
   */
  params: RoutingParams;

  /**
   * Options set by SimpleBeforeMiddleware. Useful if you do any preprocessing
   * to the request.
   */
  middleware: MiddlewareOptions;
}

export type SimpleServerErrorHandler = (req: ServerRequest, e: any) => void;

/**
 * The SimpleServer is a basic wrapper for the native Deno server, with
 * a built-in router. The router supports the following types of routes:
 *     - Routes for all supported HTTP Methods
 *     - Dynamic routes allowing for path parameter to be generated and parsed
 *     - Wildcard routes with * to catch all other routes.
 * 
 * Ex.
 * ```ts
 * const server = new SimpleServer();
 * 
 * // Handle the root path
 * server.route('GET', '/', (args: ServerHandlerArgs) => {
 *     args.req.respond({ body: 'This is the root of the path', status: 200 });
 * });
 * 
 * // Handle dynamic path with variables
 * server.route('GET', '/posts/:post_id', (args: ServerHandlerArgs) => {
 *     const postId = args.params.pathParams.post_id;
 *     args.req.respond({ body: `The post id is ${postId}`, status: 200 });
 * })
 * 
 * // Wildcard to catch-all
 * server.route('GET', '*', (args: ServerHandlerArgs) => {
 *  args.req.respond({ body: 'This is the catch-all for all GET requests', status: 404 });
 * });
 * ```
 */
export class SimpleServer {
  router: Router<ServerHandlerArgs>;
  port: number;
  server?: Server;
  errorHandler: SimpleServerErrorHandler;

  beforeMiddleware: SimpleBeforeMiddleware[];
  afterMiddleware: SimpleAfterMiddleware[];

  constructor(options: { port: number } = { port: 8000 }) {
    this.port = options.port;
    this.router = new Router();

    this.errorHandler = this.defaultErrorHandler;

    this.beforeMiddleware = [];
    this.afterMiddleware = [];
  }

  public async start(): Promise<void> {
    if (this.server) {
      Logger.error(`Server is already running.`);
      return;
    }

    Logger.log(`Starting server on port ${this.port}`);
    this.server = serve({ port: this.port });

    for await (const req of this.server) {
      Logger.log(`Receiving request from ${req.method} ${req.url}`);

      // Hook up before middleware options to run and assign optional params
      const middleware: MiddlewareOptions = {};
      for (const before of this.beforeMiddleware) {
        middleware[before.name] = before.run({ req });
      }

      const segments = splitQueryParamPart(req.url);
      try {
        const result = this.router.find(req.method, segments.path);
        
        let handler = this.defaultHandler;
        let pathParams = {};
        if (result) {
          handler = result.handler;
          pathParams = result.pathParams ?? {};
        }

        const args = {
          req,
          params: this.createRoutingParams(segments.qsp, pathParams),
          middleware
        };

        handler(args);
        
        for (const after of this.afterMiddleware) {
          after.run(args);
        }
      } catch (e) {
        Logger.error(`${req.url} failed due to ${e}`);
        this.errorHandler(req, e);
      }
    }
  }

  /**
   * Stops the server
   */
  public stop(): void {
    if (!this.server) {
      Logger.error('Server is not running.');
      return;
    }

    this.server.close();
  }

  /**
   * Sets up a handler to trigger on any exceptions or errors that occur
   * in the server. If not set, the default error handler will engage.
   * 
   * Note that only one error handler may be set up at once.
   * @param handler The handler to use when errors occur
   */
  public onError(handler: SimpleServerErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Adds a handler to a given HTTP method and path.
   * You may use dynamic segments and wildcards, and the path parameters and
   * query string parameter will be sent to the handler along with the 
   * native ServerRequest.
   * 
   * @param method The HTTP method to route on
   * @param path The path to route on
   * @param handler The handler at a given HTTP method and path.
   */
  public route(method: string, path: string, handler: RouteHandler<ServerHandlerArgs>) {
    this.router.map(method, path, handler);
  }

  /**
   * Add middleware to run before looking for the route or the handler. Useful
   * if you need to do any preprocessing to the request.
   * It will also set an option in the `middleware` parameter in the ServerHandlerArgs given
   * to your route handler.
   * 
   * Middleware will run in the order they are added.
   * 
   * @param beforeMiddleware The middleware to run before the request 
   */
  public addBeforeMiddleware(beforeMiddleware: SimpleBeforeMiddleware) {
    this.beforeMiddleware.push(beforeMiddleware);
  }

  /**
   * Middleware to run after the request is completed. Useful if any postprocessing needs to be
   * done after the request has been handled, such as logging.
   * 
   * Middleware will run in the order they are added.
   * 
   * @param afterMiddleware 
   */
  public addAfterMiddleware(afterMiddleware: SimpleAfterMiddleware) {
    this.afterMiddleware.push(afterMiddleware);
  }

  private createRoutingParams(queryParams?: string, pathParams: Params = {}): RoutingParams {
    return {
      queryParams: new URLSearchParams(queryParams),
      pathParams,
    };
  }

  private defaultErrorHandler(req: ServerRequest, e: any): void {
    req.respond({ body: 'Internal server error', status: 500 });
  }

  private defaultHandler(args: ServerHandlerArgs) {
    args.req.respond({ body: `Could not find ${args.req.url}`, status: 404 });
  }
}
