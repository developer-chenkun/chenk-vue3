import { effect } from "../reactivity/effect";
import { isObject } from "./../shared/index";
import { createComponentInstance, setupComponent } from "./component";
import { createAppApi } from "./createApp";
import { Fragment, Text } from "./vnode";

// 自定义渲染器
export function createRender(option) {
  const { createElement, patchProps, insert } = option;

  function render(vnode, container, parentComponent) {
    patch(null, vnode, container, parentComponent);
  }

  function patch(prevnode: any, vnode: any, container: any, parentComponent) {
    // 判断vnode是不是element
    // console.log(vnode.type);
    switch (vnode.type) {
      case Fragment:
        // 处理插槽
        processFragment(prevnode, vnode, container, parentComponent);
        break;
      case Text:
        processText(prevnode, vnode, container);
      default:
        if (typeof vnode.type === "string") {
          // 处理组件
          processElement(prevnode, vnode, container, parentComponent);
        } else if (isObject(vnode.type)) {
          // 处理element
          processComponent(prevnode, vnode, container, parentComponent);
        }
        break;
    }
  }
  function processComponent(prevnode: any, vnode: any, container: any, parentComponent) {
    mountComponent(prevnode, vnode, container, parentComponent);
  }
  function mountComponent(prevnode: any, vnode: any, container: any, parentComponent) {
    // 创建组件实例
    const instance = createComponentInstance(vnode, parentComponent);
    // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
    setupComponent(instance);
    // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
    setupRenderEffect(instance, vnode, container);
  }

  function setupRenderEffect(instance: any, vnode: any, container: any) {
    // 触发依赖收集
    effect(() => {
      if (!instance.isMounted) {
        console.log("init");

        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance);
        instance.isMounted = true;
        vnode.el = subTree.el;
      } else {
        console.log("update");
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;

        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  // 处理element
  function processElement(prevnode: any, vnode: any, container: any, parentComponent) {
    // init
    if (!prevnode) {
      mountElement(vnode, container, parentComponent);
    } else {
      // update
      patchElement(prevnode, vnode, container);
    }
  }

  // 更新Element
  function patchElement(prevnode: any, vnode: any, container: any) {
    console.log("patchElement");
    console.log("n1", prevnode);
    console.log("n2", vnode);
    const oldProps = prevnode.props || {};
    const newProps = vnode.props || {};
    const el = (prevnode.el = vnode.el);
    patchProp(oldProps, newProps, el);
  }
  // 对比props
  function patchProp(oldProps, newProps, el) {
    for (const key in newProps) {
      const prevProp = oldProps[key];
      const nextProp = newProps[key];
      if (prevProp !== nextProp) {
      }
    }
  }

  // 初始化element
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
      patchProps(el, key, val);
    }

    // container.append(el);
    insert(el, container);
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent);
    });
  }

  function processFragment(prevnode: any, vnode: any, container: any, parentComponent) {
    mountChildren(vnode, container, parentComponent);
  }
  function processText(prevnode: any, vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }

  return {
    render,
    createApp: createAppApi(render),
  };
}
