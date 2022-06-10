class reactiveEffect {
  private _fn: Function;

  constructor(fn) {
    this._fn = fn;
  }

  run() {
    this._fn();
  }
}

export function effect(fn) {
  const _effect = new reactiveEffect(fn);
  _effect.run();
}
