let activeEffect;
let shouldTrack;
export class reactiveEffect {
  private _fn: Function;
  deps = [];//保存的所有副作用[[],[],[]]
  active = true;
  onStop?: () => void;
  public scheduler: Function | undefined;
  constructor(fn, scheduler?:Function) {
    this._fn = fn;
    this.scheduler = scheduler
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
  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
}

const targetMap = new Map();
// 依赖收集
// targetMap = { target: { key: [effect1, effect2]}}
export function track(target, key) {
  // target -> key -> dep

  // if (!activeEffect) return;
  // if (!shouldTrack) return;
  if (!isTracking()) return;

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

  trackEffects(dep);
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

export function trackEffects(dep) {
  if (dep.has(activeEffect)) return;
  dep.add(activeEffect);

  activeEffect.deps.push(dep);
  console.log(dep);
  
}

// 触发依赖
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  triggerEffects(dep);
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  }
}

// stop
export function stop(runner) {
  runner.effect.stop();
}

// effect
export function effect(fn, options: any = {}) {
  const _effect = new reactiveEffect(fn, options.scheduler);
  // extend(_effect, options);
  _effect.run();
  const runner: any = _effect.run.bind(_effect);

  runner.effect = _effect;
  _effect.onStop = options.onStop;
  console.dir(_effect.deps);
  
  

  return runner;
}
