# Simple Deno Server

A very simple server built in deno. This is just a small exploratory project to get my feet wet with deno. Supported features are:
- Routing
- Dynamic segments in routes, which will provide path parameters to your handlers
- Wildcard (`*`) segments in routes, making it easier to have catch-all statements
- Middleware that can run before and after the reques is handled

## Running the demo:
`deno run --allow-net demo/demo.ts`

## Examples
```
import { SimpleServer, ServerHandlerArgs } from "../simple-server.ts";

// Create the server, defaulting to port 8000
const server = new SimpleServer();

/** Set up routes */

// The root route
server.route('GET', '/', (args: ServerHandlerArgs) => {
    args.req.respond({ body: 'This route is found at the root of the server.', status: 200 });
});

// A route can be made of multiple paths
server.route('GET', '/posts', (args: ServerHandlerArgs) => {
    args.req.respond({ body: `This is the handler found at the /posts route`, status: 200 });
});

server.route('GET', '/posts/top/new', (args: ServerHandlerArgs) => {
    args.req.respond({ body: `This is the handler nested in the /posts/top/new route`, status: 200 });
});

// You can read for query parameters
server.route('GET', '/users', (args: ServerHandlerArgs) => {
    args.req.respond({ body: `You passed in query parameters ${args.params.queryParams}`, status: 200 });
});

// A route can have dynamic segments that get written to the path parameters object using `:`.
server.route('GET', '/posts/:post_id', (args: ServerHandlerArgs) => {
    const postId = args.params.pathParams.post_id;
    args.req.respond({ body: `This is the handler with a post_id of ${postId}`, status: 200 });
});

server.route('POST', '/posts/:post_id', (args: ServerHandlerArgs) => {
    const postId = args.params.pathParams.post_id;
    args.req.respond({ body: `This is where we would handle the creation of post_id: ${postId}`, status: 201 });
});

server.route('GET', '/posts/:post_id/edit', (args: ServerHandlerArgs) => {
    const postId = args.params.pathParams.post_id;
    args.req.respond({ body: `This is where you might edit post_id: ${postId}`, status: 200 });
});

// Routes can use the wildcard `*` catch all other routes at that path
server.route('GET', '/users/*', (args: ServerHandlerArgs) => {
    const wildcard = args.params.pathParams['*'];
    args.req.respond({ body: `This route is catches all non-matching /users routes. The wildcard contains ${wildcard}`, status: 404 });
});

// This would create a catch-all for ALL routes
server.route('GET', '*', (args: ServerHandlerArgs) => {
    args.req.respond({ body: `This catches everything that doesn't match`, status: 404 });
});

// Start the server
server.start();

```
