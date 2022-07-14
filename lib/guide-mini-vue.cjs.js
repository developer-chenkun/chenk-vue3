'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
    };
    return vnode;
}
function createTextVNode(text) {
    return createVnode(Text, {}, text);
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            return createVnode(Fragment, {}, slot(props));
        }
    }
}

const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};

const targetMap = new Map();
// 触发依赖
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    // for (const effect of dep) {
    //   if (effect.scheduler) {
    //     effect.scheduler();
    //   } else {
    //     effect.run();
    //   }
    // }
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        const res = Reflect.get(target, key);
        // isReactive和isReadonly函数需要的代码
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadonly;
        }
        if (shallow) {
            return res;
        }
        // 嵌套对象 递归reactive readonly()
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        //TODO 触发依赖
        trigger(target, key);
        return res;
    };
}
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const mutableHanders = {
    get,
    set,
};
const readonlyHanders = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set失败 因为target${target}是readonly`);
        return true;
    },
};
const shallowReadonlyHanders = extend({}, readonlyHanders, {
    get: shallowReadonlyGet,
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHanders);
}
// readonly
function readonly(raw) {
    return createReactiveObject(raw, readonlyHanders);
}
// shallowReandonly
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHanders);
}
function createReactiveObject(target, baseHandles) {
    if (!isObject(target)) {
        console.warn(`target ${target}必须是一个对象`);
        return;
    }
    return new Proxy(target, baseHandles);
}

function emit(instance, event, ...args) {
    // console.log(instance);
    const { props } = instance;
    const camelize = (str) => {
        return str.replace(/-(\w)/g, (_, c) => {
            return c ? c.toUpperCase() : "";
        });
    };
    const capitalize = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };
    const toHandlerKey = (str) => {
        return str ? "on" + capitalize(str) : "";
    };
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
function hasOwn(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
}
const PublicInstanceHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // if (key === "$el") {
        //   return instance.vnode.el;
        // }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
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

// 创建组件实例
function createComponentInstance(vnode, parent) {
    console.log("createComponentInstance", parent);
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        emit: (event) => { },
    };
    // init emit
    component.emit = emit.bind(null, component);
    return component;
}
// 处理组件实例的props slots等数据
function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 创建代理
    instance.proxy = new Proxy({ _: instance }, PublicInstanceHandlers
    // {
    //   get(target, key) {
    //     const { setupState } = instance;
    //     if (key in setupState) {
    //       return setupState[key];
    //     }
    //     if (key === "$el") {
    //       return instance.vnode.el;
    //     }
    //   },
    // }
    );
    const component = instance.type;
    const { setup } = component;
    if (setup) {
        // setupResult 可以为object 也可以为function
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
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
let currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    var _a;
    // 存在实例中
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = (_a = currentInstance.parent) === null || _a === void 0 ? void 0 : _a.provides;
        // 将当前组件实例上的provides原型指向父组件实例上的provides 利用原型链
        // 第一次调用provide执行
        if (currentInstance.provides === parentProvides) {
            currentInstance.provides = Object.create(parentProvides);
        }
        currentInstance.provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

// import { render } from "../runtime-dom/index";
function createAppApi(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先将所有component转为虚拟节点 所有逻辑操作基于虚拟节点 component -> vnode
                const vnode = createVnode(rootComponent);
                render(vnode, rootContainer, undefined);
            },
        };
    };
}

// 自定义渲染器
function createRender(option) {
    const { createElement, patchProps, insert } = option;
    function render(vnode, container, parentComponent) {
        patch(vnode, container, parentComponent);
    }
    function patch(vnode, container, parentComponent) {
        // 判断vnode是不是element
        // console.log(vnode.type);
        switch (vnode.type) {
            case Fragment:
                // 处理插槽
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                processText(vnode, container);
            default:
                if (typeof vnode.type === "string") {
                    // 处理组件
                    processElement(vnode, container, parentComponent);
                }
                else if (isObject(vnode.type)) {
                    // 处理element
                    processComponent(vnode, container, parentComponent);
                }
                break;
        }
    }
    function processComponent(vnode, container, parentComponent) {
        mountComponent(vnode, container, parentComponent);
    }
    function mountComponent(vnode, container, parentComponent) {
        // 创建组件实例
        const instance = createComponentInstance(vnode, parentComponent);
        // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
        setupComponent(instance);
        // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
        setupRenderEffect(instance, vnode, container);
    }
    function setupRenderEffect(instance, vnode, container) {
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        // console.log("subTree", subTree);
        patch(subTree, container, instance);
        // console.log("vnode -- subTree", vnode, subTree);
        vnode.el = subTree.el;
    }
    // 处理element
    function processElement(vnode, container, parentComponent) {
        // init
        mountElement(vnode, container, parentComponent);
    }
    function mountElement(vnode, container, parentComponent) {
        const { props, children } = vnode;
        // 存储el
        // const el = (vnode.el = document.createElement(vnode.type));
        const el = (vnode.el = createElement(vnode.type));
        // 处理children children为sring类型或array
        if (Array.isArray(children)) {
            // TODO
            mountChildren(vnode, el, parentComponent);
        }
        else if (typeof children === "string") {
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
    function processFragment(vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent);
    }
    function processText(vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    return {
        render,
        createApp: createAppApi(render),
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProps(el, key, val) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        // 注册事件
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    parent.append(el);
}
const { render, createApp } = createRender({
    createElement,
    patchProps,
    insert,
});

exports.createApp = createApp;
exports.createRender = createRender;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.provide = provide;
exports.render = render;
exports.renderSlots = renderSlots;
