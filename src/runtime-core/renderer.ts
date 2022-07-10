import { isObject } from "./../shared/index";
import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container) {
  patch(vnode, container);
}

function patch(vnode: any, container: any) {
  console.log("vnode", vnode);

  // 判断vnode是不是element
  // console.log(vnode.type);
  if (typeof vnode.type === "string") {
    // 处理组件
    processElement(vnode, container);
  } else if (isObject(vnode.type)) {
    // 处理element
    processComponent(vnode, container);
  }
}
function processComponent(vnode: any, container: any) {
  mountComponent(vnode, container);
}
function mountComponent(vnode: any, container: any) {
  // 创建组件实例
  const instance = createComponentInstance(vnode);

  setupComponent(instance);

  setupRenderEffect(instance, vnode, container);
}

function setupRenderEffect(instance: any, vnode: any, container: any) {
  const { proxy } = instance;
  const subTree = instance.render.call(proxy);
  console.log("subTree", subTree);

  patch(subTree, container);
  console.log("vnode -- subTree", vnode, subTree);

  vnode.el = subTree.el;
}

// 处理element
function processElement(vnode: any, container: any) {
  // init
  mountElement(vnode, container);
}

function mountElement(vnode: any, container: any) {
  const { props, children } = vnode;
  // 存储el
  const el = (vnode.el = document.createElement(vnode.type));
  // 处理props
  for (const key in props) {
    const val = props[key];
    el.setAttribute(key, val);
  }

  // children为sring类型或array
  if (Array.isArray(children)) {
    // TODO
    mountChildren(vnode, el);
  } else if (typeof children === "string") {
    el.textContent = children;
  }

  container.append(el);
}

function mountChildren(vnode, container) {
  vnode.children.forEach((v) => {
    patch(v, container);
  });
}
