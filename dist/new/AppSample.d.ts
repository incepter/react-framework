declare function UsersList({ users }: {
    users: any;
}): any;
/**
 * the following is an example of how we can define a UsersPage
 * this would offer:
 * access to a /users; that's a PageRoot
 *
 * access to a /users/:id/posts fragment, that can either be a full page or
 * a piece of the page; that is rendered separately
 *
 *
 * The component in /users would be able to spawn the fragment of /users/:id/posts if needed
 * that fragment can be:
 * - a React server component
 * - totally rendered on the server
 * - totally rendered in the client
 * The fragment will be ported back to the client if rendered in the server
 * and would update just itself. A hydration and state management solution could
 * be able to re-propagate a client state update if the hydration says so.
 * To be able to use this Fragment inside PageRoot; an API or a dedicated
 * component should be provided; like:
 * <PageRootComponent data={data}>
 *   <PageFragmentRef reference={app.users.getUserPosts} props={customProps} />
 * </PageRootComponent>
 *
 * PageFragmentRef then will look-up the getUserPosts and render it
 *
 * All components will have access to some custom context (current user...)
 *
 * Some APIs can return json, plain text, blob, etc rather than a ReactNode
 *
 * @PreAuthorize and other custom decorators can be created to extend the WebFilters API
 * and perform authorization limitation on resources
 *
 *
 * Aside from this whole thing, this will work as follows:
 *
 * # Dev-phase:
 * Where we write code
 * # Compilation phase (target: RSC, SSR, CSR...)
 * - lookup all `@Resource`s and decorated stuff and parse and prepare decorators behavior
 * - infer web filters to apply on requests (aka middlewares :) ) (CorsFilter, SecurityFilter, JwtFilter, FeatureFlagsFilter...)
 * - Decide on the structure on the bundle (client, server, both ...)
 * - code-split each API as an entrypoint and generate its standalone package
 * - prepare entrypoints
 * # Runtime phase
 * - boot the dispatcher (detect env and capabilities, loads apis and filters)
 * - intercept requests etc
 *
 */
declare class UserResource {
    getUsersList({ context, query }: {
        context: any;
        query: any;
    }): Promise<any>;
    getUserPosts({ context, match }: {
        context: any;
        match: any;
    }): Promise<any>;
    getCurrentUserDetails({ context }: {
        context: any;
    }): Promise<any>;
}
