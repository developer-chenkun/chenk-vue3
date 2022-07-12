export function initSlots(instance: any, children: any) {
  // instance.slots = Array.isArray(children) ? children : [children];
  // console.log(children);

  const slots = {};
  for (let key in children) {
    // console.log("slotkey", key, instance, children);

    const value = children[key];
    // console.log(value);

    slots[key] = (props) => (Array.isArray(value(props)) ? value(props) : [value(props)]);
  }

  instance.slots = slots;
  console.log(slots);

  // console.log(instance);
}
