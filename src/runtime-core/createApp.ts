import { render } from "./renderer";
import { createVnode } from "./vnode";

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先将所有component转为虚拟节点 所有逻辑操作基于虚拟节点 component -> vnode
      const vnode = createVnode(rootComponent);

      render(vnode);
    },
  };
}