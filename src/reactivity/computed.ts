import { reactiveEffect } from "./effect";
class ComputedRefImp {
  private _getter: Function;
  private _dirty: boolean = true;
  private _value: any; // 缓存特性
  private _effect: reactiveEffect;
  constructor(getter) {
    this._getter = getter;

    this._effect = new reactiveEffect(getter, () => {
      if (!this._dirty) {
        // TODO 清除计算属性缓存
        this._dirty = true;
      }
    });
  }

  // 懒执行 获取计算属性.value后才会触发收集依赖
  get value() {
    if (this._dirty) {
      this._dirty = false;
      this._value = this._effect.run(); // 收集依赖
    }

    return this._value;
  }
}

export function computed(getter) {
  return new ComputedRefImp(getter);
}
