export function initSlots(instance: any, children: any) {
  // instance.slots = Array.isArray(children) ? children : [children];

  const slots = {};
  for (let key in children) {
    const value = children[key];

    slots[key] = Array.isArray(value) ? value : [value];
  }

  instance.slots = slots;
  console.log(instance);
}
