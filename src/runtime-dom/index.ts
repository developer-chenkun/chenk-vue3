import { createRender } from "../runtime-core/index";

function createElement(type) {
  return document.createElement(type);
}

function patchProps(el, key, val) {
  const isOn = (key: string) => /^on[A-Z]/.test(key);
  if (isOn(key)) {
    // 注册事件
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val);
  }
}

function insert(el, parent) {
  parent.append(el);
}

export const render = createRender({
  createElement,
  patchProps,
  insert,
});
