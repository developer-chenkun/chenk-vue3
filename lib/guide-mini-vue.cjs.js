'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
    console.log(instance);
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
    const slots = {};
    for (let key in children) {
        const value = children[key];
        slots[key] = Array.isArray(value) ? value : [value];
    }
    instance.slots = slots;
    console.log(instance);
}

// 创建组件实例
function createComponentInstance(vnode) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: (event) => { },
    };
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
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
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
    setupRenderEffect(instance, vnode, container);
}
function setupRenderEffect(instance, vnode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // console.log("subTree", subTree);
    patch(subTree, container);
    // console.log("vnode -- subTree", vnode, subTree);
    vnode.el = subTree.el;
}
// 处理element
function processElement(vnode, container) {
    // init
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    const { props, children } = vnode;
    // 存储el
    const el = (vnode.el = document.createElement(vnode.type));
    // 处理props
    for (const key in props) {
        const val = props[key];
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
        el: null,
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

function renderSlots(slots, name) {
    const slot = slots[name];
    if (slot) {
        return createVnode("div", {}, slot);
    }
}

exports.createApp = createApp;
exports.h = h;
exports.renderSlots = renderSlots;
