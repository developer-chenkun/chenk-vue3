const extend = Object.assign;
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const hasChanged = (newValue, oldValue) => {
    return !Object.is(newValue, oldValue);
};

let activeEffect;
let shouldTrack;
class reactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.deps = [];
        this.active = true;
        this._fn = fn;
    }
    run() {
        if (!this.active) {
            this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        const res = this._fn(); // 调用effect中的fn 触发代理对象的get完成依赖收集
        shouldTrack = false;
        return res;
    }
    stop() {
        if (this.active) {
            cleanupEffect(this);
            this.active = false;
            if (this.onStop) {
                this.onStop();
            }
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
}
const targetMap = new Map();
// 依赖收集
// targetMap = { target: { key: [effect1, effect2]}}
function track(target, key) {
    // target -> key -> dep
    // if (!activeEffect) return;
    // if (!shouldTrack) return;
    if (!isTracking())
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    // 优化变量自增的时候又重新触发收集依赖
    // if (dep.has(activeEffect)) return;
    // dep.add(activeEffect);
    // activeEffect.deps.push(dep);
    trackEffects(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
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
// effect
function effect(fn, options = {}) {
    const _effect = new reactiveEffect(fn, options.scheduler);
    // extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    _effect.onStop = options.onStop;
    return runner;
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
        // TODO 依赖收集
        if (!isReadonly) {
            track(target, key);
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
// isReactive
function isReactive(value) {
    // 将undefined转为布尔值
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
}
function createReactiveObject(target, baseHandles) {
    if (!isObject(target)) {
        console.warn(`target ${target}必须是一个对象`);
        return;
    }
    return new Proxy(target, baseHandles);
}

class RefImp {
    constructor(value) {
        this.__v_isRef = true;
        // 判断ref传入的是否为对象
        this._value = isObject(value) ? reactive(value) : value;
        this._rawValue = value;
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = isObject(newValue) ? reactive(newValue) : newValue;
            triggerEffects(this.dep);
        }
    }
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImp(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}

class ComputedRefImp {
    constructor(getter) {
        this._dirty = true;
        this._getter = getter;
        this._effect = new reactiveEffect(getter, () => {
            if (!this._dirty) {
                // TODO 清除计算属性缓存
                this._dirty = true;
            }
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
function computed(getter) {
    return new ComputedRefImp(getter);
}

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
        isMounted: false,
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
        instance.setupState = proxyRefs(setupResult);
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
        patch(null, vnode, container, parentComponent);
    }
    function patch(prevnode, vnode, container, parentComponent) {
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
                }
                else if (isObject(vnode.type)) {
                    // 处理element
                    processComponent(prevnode, vnode, container, parentComponent);
                }
                break;
        }
    }
    function processComponent(prevnode, vnode, container, parentComponent) {
        mountComponent(prevnode, vnode, container, parentComponent);
    }
    function mountComponent(prevnode, vnode, container, parentComponent) {
        // 创建组件实例
        const instance = createComponentInstance(vnode, parentComponent);
        // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
        setupComponent(instance);
        // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
        setupRenderEffect(instance, vnode, container);
    }
    function setupRenderEffect(instance, vnode, container) {
        // 触发依赖收集
        effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance);
                instance.isMounted = true;
                vnode.el = subTree.el;
            }
            else {
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
    function processElement(prevnode, vnode, container, parentComponent) {
        // init
        if (!prevnode) {
            mountElement(vnode, container, parentComponent);
        }
        else {
            // update
            patchElement(prevnode, vnode);
        }
    }
    function patchElement(prevnode, vnode, container) {
        console.log("patchElement");
        console.log("n1", prevnode);
        console.log("n2", vnode);
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
    function processFragment(prevnode, vnode, container, parentComponent) {
        mountChildren(vnode, container, parentComponent);
    }
    function processText(prevnode, vnode, container) {
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

export { computed, createApp, createRender, createTextVNode, getCurrentInstance, h, inject, isReactive, provide, proxyRefs, reactive, readonly, ref, render, renderSlots, shallowReadonly };
