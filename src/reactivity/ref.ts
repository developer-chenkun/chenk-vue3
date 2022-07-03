import { hasChanged, isObject } from "./../shared/index";
import { isTracking, reactiveEffect, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImp<T> {
  private _value: any;
  private _rawValue: any;
  public dep: Set<T>;
  public __v_isRef = true;
  constructor(value) {
    // 判断ref传入的是否为对象
    this._value = isObject(value) ? reactive(value) : value;
    this._rawValue = value;
    this.dep = new Set();
  }

  get value() {
    trackRefValue(this);
    return this._value;
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = isObject(newValue) ? reactive(newValue) : newValue;

      triggerEffects(this.dep);
    }
  }
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImp<reactiveEffect>(value);
}

export function isRef(ref) {
  return !!ref.__v_isRef;
}

export function unRef(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      return unRef(Reflect.get(target, key));
    },

    set(target, key, value) {
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value);
      } else {
        return Reflect.set(target, key, value);
      }
    },
  });
}
