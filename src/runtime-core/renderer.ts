import { effect } from "../reactivity/effect";
import { isObject } from "./../shared/index";
import { createComponentInstance, setupComponent } from "./component";
import { queueJobs, shouldUpdateComponent } from "./componentUpdateUtils";
import { createAppApi } from "./createApp";
import { Fragment, Text } from "./vnode";

// 自定义渲染器
export function createRender(option) {
  const { createElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = option;

  function render(vnode, container, parentComponent) {
    patch(null, vnode, container, parentComponent, null);
  }

  function patch(prevnode: any, vnode: any, container: any, parentComponent, anchor) {
    // 判断vnode是不是element
    // console.log(vnode.type);
    switch (vnode.type) {
      case Fragment:
        // 处理插槽
        processFragment(prevnode, vnode, container, parentComponent, anchor);
        break;
      case Text:
        processText(prevnode, vnode, container);
      default:
        if (typeof vnode.type === "string") {
          // 处理组件
          processElement(prevnode, vnode, container, parentComponent, anchor);
        } else if (isObject(vnode.type)) {
          // 处理element
          processComponent(prevnode, vnode, container, parentComponent);
        }
        break;
    }
  }

  function processComponent(prevnode: any, vnode: any, container: any, parentComponent) {
    if (!prevnode) {
      mountComponent(vnode, container, parentComponent);
    } else {
      updateComponent(prevnode, vnode);
    }
  }
  // 处理插槽
  function processFragment(prevnode: any, vnode: any, container: any, parentComponent, anchor) {
    mountChildren(vnode.children, container, parentComponent, anchor);
  }
  // 处理文字节点
  function processText(prevnode: any, vnode: any, container: any) {
    const { children } = vnode;
    const textNode = (vnode.el = document.createTextNode(children));
    container.append(textNode);
  }
  // 处理element
  function processElement(prevnode: any, vnode: any, container: any, parentComponent, anchor) {
    // init
    if (!prevnode) {
      mountElement(vnode, container, parentComponent, anchor);
    } else {
      // update
      patchElement(prevnode, vnode, container, parentComponent, anchor);
    }
  }

  /**
   *
   * 初始化流程
   */
  function mountComponent(vnode: any, container: any, parentComponent) {
    // 创建组件实例
    const instance = createComponentInstance(vnode, parentComponent);
    vnode.component = instance;
    // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
    setupComponent(instance);
    // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
    setupRenderEffect(instance, vnode, container);
  }

  function setupRenderEffect(instance: any, vnode: any, container: any) {
    // 触发依赖收集
    instance.update = effect(
      () => {
        if (!instance.isMounted) {
          // console.log("init");

          const { proxy } = instance;
          const subTree = (instance.subTree = instance.render.call(proxy));

          patch(null, subTree, container, instance, null);
          instance.isMounted = true;
          vnode.el = subTree.el;
        } else {
          // console.log("update");
          const { proxy, next, vnode } = instance;
          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next);
          }
          const subTree = instance.render.call(proxy);
          const prevSubTree = instance.subTree;
          instance.subTree = subTree;
          patch(prevSubTree, subTree, container, instance, null);
        }
      },
      {
        scheduler() {
          queueJobs(instance.update);
        },
      }
    );
  }

  // 初始化element
  function mountElement(vnode: any, container: any, parentComponent, anchor) {
    const { props, children } = vnode;
    // 存储el
    // const el = (vnode.el = document.createElement(vnode.type));
    const el = (vnode.el = createElement(vnode.type));

    // 处理children children为sring类型或array
    if (Array.isArray(children)) {
      // TODO
      mountChildren(vnode.children, el, parentComponent, anchor);
    } else if (typeof children === "string") {
      el.textContent = children;
    }

    // 处理props
    for (const key in props) {
      const val = props[key];
      hostPatchProps(el, key, null, val);
    }

    // container.append(el);
    hostInsert(el, container, anchor);
  }

  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor);
    });
  }

  /**
   * 更新流程
   */
  function updateComponent(prevnode: any, nextvnode: any) {
    if (shouldUpdateComponent(prevnode, nextvnode)) {
      const instance = (nextvnode.component = prevnode.component);
      instance.next = nextvnode;
      instance.update();
    } else {
      nextvnode.el = prevnode.el;
      nextvnode.vnode = nextvnode;
    }
  }

  function updateComponentPreRender(instance, nextVNode) {
    instance.props = nextVNode.props;
    instance.vnode = nextVNode;
    nextVNode = null;
  }

  // 更新Element
  function patchElement(prevnode: any, vnode: any, container: any, parentComponent: any, anchor: any) {
    // console.log("n1", prevnode);
    // console.log("n2", vnode);
    const oldProps = prevnode.props || {};
    const newProps = vnode.props || {};
    const el = (vnode.el = prevnode.el);
    patchProp(oldProps, newProps, el);
    patchChildren(prevnode, vnode, el, parentComponent, anchor);
  }
  // 对比props
  function patchProp(oldProps, newProps, el) {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key];
        const nextProp = newProps[key];
        if (prevProp !== nextProp) {
          hostPatchProps(el, key, prevProp, nextProp);
        }
      }

      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProps(el, key, oldProps[key], null);
        }
      }
    }
  }

  function patchChildren(prevnode, vnode, el, parentComponent, parentAnchor) {
    console.log("patch children");
    const { children } = vnode;
    if (typeof children === "string") {
      // 新的节点为text
      if (Array.isArray(prevnode.children)) {
        // 老的为Array
        // 1.把老的children清空
        unmountChildren(prevnode.children);
        // 2.设置新的text
        hostSetElementText(el, vnode.children);
      } else {
        // 老的为text
        if (vnode.children !== prevnode.children) {
          hostSetElementText(el, vnode.children);
        }
      }
    } else {
      // 新的为Array
      if (typeof prevnode.children === "string") {
        // 老的为string
        hostSetElementText(el, "");
        mountChildren(vnode.children, el, parentComponent, parentAnchor);
      } else {
        // 老的为array
        // TODO diff
        patchKeyedChildren(prevnode.children, vnode.children, el, parentComponent, parentAnchor);
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      hostRemove(el);
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    function isSomeVNodeType(n1, n2) {
      // 判断两个虚拟节点是否相同
      return n1.type === n2.type && n1.key === n2.key;
    }

    // 左侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      i++;
    }

    // 右侧
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      } else {
        break;
      }
      e1--;
      e2--;
    }

    if (i > e1) {
      // 3.新的比老的多 创建
      if (i <= e2) {
        const nextPosition = e2 + 1;
        const anchor = nextPosition < c2.length ? c2[nextPosition].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      // 4.老的比新的多 删除
      while (i <= e1) {
        hostRemove(c1[i].el);
        i++;
      }
    } else {
      // 乱序 中间对比
      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = new Map();

      // 获取新节点的映射
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }

      // 查找老节点中元素在新节点中是否存在
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        let newIndex;
        if (prevChild.key !== null) {
          newIndex = keyToNewIndexMap.get(prevChild.key);
        } else {
          for (let j = s2; j <= e2; j++) {
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j;
              break;
            }
          }
        }

        // 如果不存在 则删除
        if (newIndex === undefined) {
          hostRemove(prevChild.el);
        } else {
          // 如果存在 则patch
          patch(prevChild, c2[newIndex], container, parentComponent, null);
        }
      }
    }
  }

  return {
    render,
    createApp: createAppApi(render),
  };
}
