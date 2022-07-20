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
        // debugger;
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // debugger;
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
        key: props && props.key,
        component: null,
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
    $props: (i) => i.props,
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
        next: null,
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProps } = prevVNode;
    const { props: nextProps } = nextVNode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}
const queue = [];
let isQueueFlashPending = false;
function queueJobs(job) {
    // console.log(job);
    if (!queue.includes(job)) {
        queue.push(job);
    }
    console.log(queue);
    isQueueFlash();
}
function isQueueFlash() {
    if (isQueueFlashPending)
        return;
    isQueueFlashPending = true;
    // Promise.resolve().then(() => {
    //   isQueueFlashPending = false;
    //   let job;
    //   while ((job = queue.shift())) {
    //     job && job();
    //   }
    // });
    nextTick(() => {
        isQueueFlashPending = false;
        let job;
        while ((job = queue.shift())) {
            job && job();
        }
    });
}
function nextTick(fn) {
    return fn ? Promise.resolve().then(fn) : Promise.resolve();
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
    const { createElement, patchProps: hostPatchProps, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = option;
    function render(vnode, container, parentComponent) {
        patch(null, vnode, container, parentComponent, null);
    }
    function patch(prevnode, vnode, container, parentComponent, anchor) {
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
                }
                else if (isObject(vnode.type)) {
                    // 处理element
                    processComponent(prevnode, vnode, container, parentComponent);
                }
                break;
        }
    }
    function processComponent(prevnode, vnode, container, parentComponent) {
        if (!prevnode) {
            mountComponent(prevnode, vnode, container, parentComponent);
        }
        else {
            updateComponent(prevnode, vnode);
        }
    }
    // 处理插槽
    function processFragment(prevnode, vnode, container, parentComponent, anchor) {
        mountChildren(vnode.children, container, parentComponent, anchor);
    }
    // 处理文字节点
    function processText(prevnode, vnode, container) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }
    // 处理element
    function processElement(prevnode, vnode, container, parentComponent, anchor) {
        // init
        if (!prevnode) {
            mountElement(vnode, container, parentComponent, anchor);
        }
        else {
            // update
            patchElement(prevnode, vnode, container, parentComponent, anchor);
        }
    }
    /**
     *
     * 初始化流程
     */
    function mountComponent(prevnode, vnode, container, parentComponent) {
        // 创建组件实例
        const instance = createComponentInstance(vnode, parentComponent);
        vnode.component = instance;
        // 初始化组件props slots $el emit等并创建组件代理对象并执行setup方法拿到执行结果并挂载到组件实例上
        setupComponent(instance);
        // 执行组件render方法获取虚拟节点并将虚拟节点重新放入patch中执行
        setupRenderEffect(instance, vnode, container);
    }
    function setupRenderEffect(instance, vnode, container) {
        // 触发依赖收集
        instance.update = effect(() => {
            if (!instance.isMounted) {
                // console.log("init");
                const { proxy } = instance;
                const subTree = (instance.subTree = instance.render.call(proxy));
                patch(null, subTree, container, instance, null);
                instance.isMounted = true;
                vnode.el = subTree.el;
            }
            else {
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
        }, {
            scheduler() {
                queueJobs(instance.update);
            },
        });
    }
    // 初始化element
    function mountElement(vnode, container, parentComponent, anchor) {
        const { props, children } = vnode;
        // 存储el
        // const el = (vnode.el = document.createElement(vnode.type));
        const el = (vnode.el = createElement(vnode.type));
        // 处理children children为sring类型或array
        if (Array.isArray(children)) {
            // TODO
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        else if (typeof children === "string") {
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
    function updateComponent(prevnode, nextvnode) {
        if (shouldUpdateComponent(prevnode, nextvnode)) {
            const instance = (nextvnode.component = prevnode.component);
            instance.next = nextvnode;
            instance.update();
        }
        else {
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
    function patchElement(prevnode, vnode, container, parentComponent, anchor) {
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
            }
            else {
                // 老的为text
                if (vnode.children !== prevnode.children) {
                    hostSetElementText(el, vnode.children);
                }
            }
        }
        else {
            // 新的为Array
            if (typeof prevnode.children === "string") {
                // 老的为string
                hostSetElementText(el, "");
                mountChildren(vnode.children, el, parentComponent, parentAnchor);
            }
            else {
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
            }
            else {
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
            }
            else {
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
        }
        else if (i > e2) {
            // 4.老的比新的多 删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
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
                }
                else {
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
                }
                else {
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

function createElement(type) {
    return document.createElement(type);
}
function patchProps(el, key, prevVal, nextVal) {
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        // 注册事件
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    // parent.append(child);
    // debugger;
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
const { render, createApp } = createRender({
    createElement,
    patchProps,
    insert,
    remove,
    setElementText,
});

export { computed, createApp, createRender, createTextVNode, getCurrentInstance, h, inject, isReactive, nextTick, provide, proxyRefs, reactive, readonly, ref, render, renderSlots, shallowReadonly };
