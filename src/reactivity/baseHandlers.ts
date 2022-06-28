import { extend, isObject } from "../shared";
import { isTracking, track, trigger } from "./effect";
import { reactive, ReactiveFlags, readonly } from "./reactive";

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key) {
    const res = Reflect.get(target, key);

    // isReactive和isReadonly函数需要的代码
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    if (shallow) {
      return res;
    }

    // 嵌套对象 递归reactive readonly()
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }

    // TODO 依赖收集
    if (!isReadonly && isTracking()) {
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
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

export const mutableHanders = {
  get,
  set,
};

export const readonlyHanders = {
  get: readonlyGet,
  set(target, key, value) {
    console.warn(`key:${key} set失败 因为target${target}是readonly`);
    return true;
  },
};

export const shallowReadonlyHanders = extend({}, readonlyHanders, {
  get: shallowReadonlyGet,
});
