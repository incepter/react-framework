# react-framework


This is my new side-project. The idea is a `React framework` that unifies RSC, SSR and CSR under an entreprise-grade model inspired from the springframework.

You will write code like the writing a spring application, you will define `Resource`s (`Controller`) and `Endpoints` (`MethodMapping`):


```jsx

@Resource("/users")
class UsersResource {
  @Render // returns react elements / html
  @PageRoot // declares this as a PageRoot (a full client page)
  @ProgressiveEnhancement // ship html, then js in a second round if needed
  @GetMapping(path = "/") // makes this reachable via /users/
  async getUsersList({context, query}) {
    let users = use(axios.get())
    // If this is not an RSC, hooks will be possible here
    return <UsersList users={users} />
  }
}

```

The `UsersList` component can be defined anywhere, and its contraints will depend from the project itself (CSR, SSR, RSC...).

In `RSC`/`SSR`, the framework's router will render your function and return its output.
In `CSR`, the `use` hook will either apply hydration or suspend until it loads data.

`Endpoints` will be able to produce all forms of data types; meaning you can design API endpoints serving JSON, streaming files, etc.

```jsx
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
 *
 */
@Resource(path="/users")
class UserResource {
  @Render // returns react elements / html
  @PageRoot // declares this as a PageRoot (a full client page)
  @ProgressiveEnhancement // ship html, then js in a second round if needed
  @GetMapping(path = "/") // makes this reachable via /users
  async getUsersList({context, query}) {
    let currentUser = context.principal
    let users = use(axios.get())

    return <UsersList users={users} />
  }

  @Render // returns react elements / html
  @ProgressiveEnhancement // ship html, then js in a second round if needed
  @GetMapping(path = "/:id/posts") // makes this reachable via /users/14/posts
  // Without page root, this is a PageFragment; means can be CSRed or SSRed
  // or RSCed alone without any need to re-render the full page.
  // this may alter client state if needed as well ;)
  async getUserPosts({context, match}) {
    let currentUser = context.principal
    let user = use(axios.get(`/users/${match.id}/posts`))

    return <UsersList users={users} />
  }

  @PreAuthorize // will trigger some authorizationFilter on this resource
  @GetMapping(path = "/me", produces='application/json')
  async getCurrentUserDetails({context}) {
    return use(getUserDetails(context.principal.id))
  }
}

function UsersList({users}) {
  return (
    <div>
      {users.map(user => <UserDetails key={user.id} user={user} />)}
    </div>
  )
}
```
