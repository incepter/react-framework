import * as React from "react";

type ResourceConfig = {
  path: string
}

function Resource(config: ResourceConfig) {
  return function (constructor: Function) {
    // resources.set(constructor, config)
  }
}

type ResourceMappingConfig = {
  path?: string,
  produces?: "text/html" | "application/json" | "blob",
}

function GetMapping(config: ResourceMappingConfig) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    registerApi(target, propertyKey, descriptor)
  };
}


// function Resource(config: ResourceConfig) {
//   console.log("Resource(): factory evaluated");
//   return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
//     console.log("second(): called");
//   };
// }

function registerApi(target, propertyKey, descriptor) {

}

function Render() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    registerApi(target, propertyKey, descriptor)
  };
}

function PreAuthorize(config: {roles: string[]}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    registerApi(target, propertyKey, descriptor)
  };
}

@Resource({path: "/users"})
export class UserResource {
  @Render()
  @GetMapping({})
  @PreAuthorize({roles: []})
  async GetUsers({query}) {
    return <div>Hello!</div>
  }
}
