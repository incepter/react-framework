export type ResourceConfig = {
  path: string
}

export function Resource(config: ResourceConfig) {
  return function (constructor: Function) {
  }
}

export function Configuration() {
  return function (constructor: Function) {
  }
}

export type ResourceMappingConfig = {
  path?: string,
  produces?: "text/html" | "application/json" | "blob",
}

export function Render() {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Bean() {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Get(config?: ResourceMappingConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Post(config?: ResourceMappingConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Patch(config?: ResourceMappingConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Delete(config?: ResourceMappingConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Put(config?: ResourceMappingConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export type PreAuthorizeConfig = {
  hasRole?: ({principal}) => boolean
}

export function PreAuthorize(config?: PreAuthorizeConfig) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export let Decorators = {
  [Resource.name]: {},
  [Render.name]: {},
  [Get.name]: {},
  [Post.name]: {},
  [Delete.name]: {},
  [Patch.name]: {},
  [Put.name]: {},
  [PreAuthorize.name]: {},
}
export let PathDecorators = {
  [Get.name]: {},
  [Post.name]: {},
  [Delete.name]: {},
  [Patch.name]: {},
  [Put.name]: {},
}
