import * as React from "react";

function createRegex(pattern: string): RegExp {
  const regexPattern = pattern.replace(/:\w+/g, '([^/]+)').replace(/\*/g, '(.*)');
  return new RegExp(`^${regexPattern}$`);
}
function extractParams(pattern: string, match: RegExpExecArray): Record<string, string> {
  const keys = (pattern.match(/:\w+/g) || []).map((key) => key.substring(1));
  const params: Record<string, string> = {};

  for (let i = 0; i < keys.length; i++) {
    params[keys[i]] = match[i + 1];
  }

  return params;
}




function matchPath(currentUrlSegment: string, possibleRoutePaths: Route[]) {
  for (const route of possibleRoutePaths) {
    const regex = createRegex(route.pattern);
    const match = regex.exec(currentUrlSegment);
    if (match) {
      const params = extractParams(route.pattern, match);
      return { handler: route.handler, params };
    }
  }

  return null;
}

function createRouter(routes) {
  return function intercept(request: Request) {
    let url = request.url
    let segments = url.split("/").filter(t => !!t && t.trim() !== "")




  }
}
