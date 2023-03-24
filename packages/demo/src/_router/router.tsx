
export type Routing = {
  Get: Record<string, { path: string, element: JSX.Element }>,
  Put: Record<string, { path: string, element: JSX.Element }>,
  Post: Record<string, { path: string, element: JSX.Element }>,
  Patch: Record<string, { path: string, element: JSX.Element }>,
  Options: Record<string, { path: string, element: JSX.Element }>,
  Delete: Record<string, { path: string, element: JSX.Element }>,
}
