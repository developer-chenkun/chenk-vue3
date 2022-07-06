'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const isObject = (val) => {
    return val !== null && typeof val === "object";
};

// 创建组件实例
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
    };
    return component;
}
// 处理组件实例的props slots等数据
function setupComponent(instance) {
    // TODO
    // initProps()
    // initSlots()
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        // setupResult 可以为object 也可以为function
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const component = instance.type;
    if (component.render) {
        instance.render = component.render;
    }
}

function render(vnode, container) {
    patch(vnode, container);
}
function patch(vnode, container) {
    // 判断vnode是不是element
    // console.log(vnode.type);
    if (typeof vnode.type === "string") {
        // 处理组件
        processElement(vnode, container);
    }
    else if (isObject(vnode.type)) {
        // 处理element
        processComponent(vnode, container);
    }
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(vnode, container) {
    // 创建组件实例
    const instance = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container);
}
function setupRenderEffect(instance, container) {
    const subTree = instance.render();
    patch(subTree, container);
}
// 处理element
function processElement(vnode, container) {
    // init
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { props, children } = vnode;
    const el = document.createElement(vnode.type);
    // 处理props
    for (const key in props) {
        const val = props[key];
        el.setAttribute(key, val);
    }
    // children为sring类型或array
    if (Array.isArray(children)) {
        // TODO
        mountChildren(vnode, el);
    }
    else if (typeof children === "string") {
        el.textContent = children;
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach((v) => {
        patch(v, container);
    });
}

function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
    };
    return vnode;
}

function createApp(rootComponent) {
    return {
        mount(rootContainer) {
            // 先将所有component转为虚拟节点 所有逻辑操作基于虚拟节点 component -> vnode
            const vnode = createVnode(rootComponent);
            render(vnode, rootContainer);
        },
    };
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

exports.createApp = createApp;
exports.h = h;
