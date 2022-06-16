import { mutableHanders, readonlyHanders } from "./baseHandlers";

export function reactive(raw) {
  return new Proxy(raw, mutableHanders);
}

// readonly
export function readonly(raw) {
  return new Proxy(raw, readonlyHanders);
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

export function isReadOnly(value) {
  // readonly
  return !!value[ReactiveFlags.IS_READONLY];
}
