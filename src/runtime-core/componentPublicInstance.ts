const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
};

export function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

export const PublicInstanceHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance;
    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }
    // if (key === "$el") {
    //   return instance.vnode.el;
    // }
    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  },
};
