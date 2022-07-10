import { isObject } from "../shared/index";
import { mutableHanders, readonlyHanders, shallowReadonlyHanders } from "./baseHandlers";

export function reactive(raw) {
  return createReactiveObject(raw, mutableHanders);
}

// readonly
export function readonly(raw) {
  return createReactiveObject(raw, readonlyHanders);
}

// shallowReandonly
export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHanders);
}

// 枚举
export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

// isReactive
export function isReactive(value) {
  // 将undefined转为布尔值
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  // readonly
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}

function createReactiveObject(target, baseHandles) {
  if (!isObject(target)) {
    console.warn(`target ${target}必须是一个对象`);
    return;
  }
  return new Proxy(target, baseHandles);
}
