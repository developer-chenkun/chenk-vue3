import { render } from "./render";
import { createVNode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先转换为vnode
      // 后续所有操作基于虚拟节点

      const vnode = createVNode(rootComponent);

      render(vnode, rootContainer);
    },
  };
}
