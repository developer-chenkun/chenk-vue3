import { hasChanged, isObject } from "./../shared/index";
import { isTracking, reactiveEffect, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

class RefImp<T> {
  private _value: any;
  private _rawValue: any;
  public dep: Set<T>;
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
      this.value = isObject(newValue) ? reactive(newValue) : newValue;
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
