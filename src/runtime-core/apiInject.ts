import { getCurrentInstance } from "./component";

export function provide(key, value) {
  // 存在实例中
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent?.provides;
    // 将当前组件实例上的provides原型指向父组件实例上的provides 利用原型链
    // 第一次调用provide执行
    if (currentInstance.provides === parentProvides) {
      currentInstance.provides = Object.create(parentProvides);
    }
    currentInstance.provides[key] = value;
  }
}

export function inject(key, defaultValue) {
  const currentInstance: any = getCurrentInstance();
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;
    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue();
      }
      return defaultValue;
    }
  }
}
