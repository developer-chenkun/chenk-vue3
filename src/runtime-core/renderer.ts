import { isObject } from "./../shared/index";
import { createComponentInstance, setupComponent } from "./component";
import { Fragment, Text } from "./vnode";

// 自定义渲染器
export function createRender(option) {
  const { createElement, patchProps, insert } = option;

  return function render(vnode, container, parentComponent) {
    patch(vnode, container, parentComponent);
  };

  function patch(vnode: any, container: any, parentComponent) {
    // 判断vnode是不是element
    // console.log(vnode.type);
    switch (vnode.type) {
      case Fragment:
        processFragment(vnode, container, parentComponent);
        break;
      case Text:
        processText(vnode, container);
      default:
        if (typeof vnode.type === "string") {
          // 处理组件
          processElement(vnode, container, parentComponent);
        } else if (isObject(vnode.type)) {
          // 处理element
          processComponent(vnode, container, parentComponent);
        }
        break;
    }
  }
  function processComponent(vnode: any, container: any, parentComponent) {
    mountComponent(vnode, container, parentComponent);
  }
  function mountComponent(vnode: any, container: any, parentComponent) {
    // 创建组件实例
    const instance = createComponentInstance(vnode, parentComponent);
    // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
    setupComponent(instance);
    // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
    setupRenderEffect(instance, vnode, container);
  }

  function setupRenderEffect(instance: any, vnode: any, container: any) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // console.log("subTree", subTree);

    patch(subTree, container, instance);
    // console.log("vnode -- subTree", vnode, subTree);

    vnode.el = subTree.el;
  }

  // 处理element
  function processElement(vnode: any, container: any, parentComponent) {
    // init
    mountElement(vnode, container, parentComponent);
  }

  function mountElement(vnode: any, container: any, parentComponent) {
    const { props, children } = vnode;
    // 存储el
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = createElement(vnode.type));

    // 处理children children为sring类型或array
    if (Array.isArray(children)) {
      // TODO
      mountChildren(vnode, el, parentComponent);
    } else if (typeof children === "string") {
      el.textContent = children;
    }

    // 处理props
    for (const key in props) {
      const val = props[key];
      // const isOn = (key: string) => /^on[A-Z]/.test(key);
      // if (isOn(key)) {
      //   // 注册事件
      //   const event = key.slice(2).toLowerCase();
      //   el.addEventListener(event, val);
      // } else {
      //   el.setAttribute(key, val);
      // }
      patchProps(el, key, val);
    }

    // container.append(el);
    insert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent);
    });
  }

  function processFragment(vnode: any, container: any, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }
  function processText(vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }
}
