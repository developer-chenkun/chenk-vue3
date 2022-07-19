export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

export function createVnode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    key: props && props.key,
  };

  return vnode;
}

export function createTextVNode(text) {
  return createVnode(Text, {}, text);
}
