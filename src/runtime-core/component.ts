export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
  };

  return component;
}

export function setupComponent(instance) {
  // todo
  // initProps();
  // initProps()

  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance: any) {
  const component = instance.type;

  const { setup } = component;

  if (setup) {
    // setup返回的可能是对象，也可能是render函数
    const setupResult = setup();

    handleSetupResult(instance, setupResult);
  }
}
function handleSetupResult(instance, setupResult: any) {
  // object
  if (typeof setupResult === "object") {
    instance.setupState = setupResult;
  }

  finishComponentSetup(instance);
}
function finishComponentSetup(instance: any) {
  const component = instance.type;

  if (!component.render) {
    component.render = instance.render;
  }
}
