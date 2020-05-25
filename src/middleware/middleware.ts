import { ServerRequest } from '../deno/deno.ts';
import { ServerHandlerArgs } from '../../simple-server.ts';

export interface SimpleBeforeMiddleware {
    name: string;
    run: SimpleBeforeMiddlewareHandler;
};

export interface SimpleAfterMiddleware {
    name: string;
    run: SimpleAfterMiddlewareHandler;
};

export type SimpleBeforeMiddlewareHandler = (args: { req: ServerRequest} ) => any;
export type SimpleAfterMiddlewareHandler = (args: ServerHandlerArgs ) => void;