import { track, trigger } from "./effect";
import { ReactiveFlags } from "./reactive";

function createGetter(isReadonly = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key);

    // isReactive和isReadonly函数需要的代码
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    // TODO 依赖收集
    if (!isReadonly) {
      track(target, key);
    }
    return res;
  };
}

function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);
    //TODO 触发依赖
    trigger(target, key);
    return res;
  };
}

const get = createGetter();
const set = createSetter();
const readonluGet = createGetter(true);

export const mutableHanders = {
  get,
  set,
};

export const readonlyHanders = {
  get: readonluGet,
  set(target, key, value) {
    console.warn(`key:${key} set失败 因为target${target}是readonly`);
    return true;
  },
};
