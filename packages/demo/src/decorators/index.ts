import * as React from "react";
import {CurrentRouteContextType} from "../_router";

export type ResourceConfig = {
  path: string
}

export function Resource(config: ResourceConfig) {
  return function (constructor: Function) {
  }
}


export type ResourceMappingConfig = {
  path?: string,
  produces?: "text/html" | "application/json" | "blob",
}

type RenderFunctionType<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element> = (...args: any[]) => T

type RouteFunctionType<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element> = (RenderFunctionType<T>)

export function Render() {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RenderFunctionType<T>>
  ) {
  };
}

export function Get(config?: ResourceMappingConfig) {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteFunctionType<T>>
  ) {
  };
}

export function Post(config?: ResourceMappingConfig) {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteFunctionType<T>>
  ) {
  };
}

export function Patch(config?: ResourceMappingConfig) {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteFunctionType<T>>
  ) {
  };
}

export function Delete(config?: ResourceMappingConfig) {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteFunctionType<T>>
  ) {
  };
}

export function Put(config?: ResourceMappingConfig) {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<RouteFunctionType<T>>
  ) {
  };
}

export function UseServer() {
  return function impl<T extends (JSX.Element | Promise<JSX.Element>) = JSX.Element>(
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
  [UseServer.name]: {},
}


export function Configuration() {
  return function (constructor: Function) {
  }
}

export function Bean() {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}

export function Inject(name: string) {
  return function (
    target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  };
}


export function Filter() {
  return function (
    target: any, propertyKey: string,
    descriptor: TypedPropertyDescriptor<FilterType>
  ) {
  };
}

export type FilterContext<P, C> = {
  getPrincipal(): P | undefined,
  setPrincipal(principal: P): void,

  context: C,
  search?: string,
  match?: Record<string, any>,
}

export type FilterType = {
  (
    request: Request, response: Response, context: FilterContext<any, any>,
    next: () => void
  ): void
}

type Params<shape> = {
  [k in keyof shape]: string
}

export type AsyncComponentType = (argv: CurrentRouteContextType) => Promise<JSX.Element>
