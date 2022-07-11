import { h, provide, inject } from "../../lib/guide-mini-vue.esm.js"
export const Provider = {
  name: 'Provider',
  setup() {
    provide('foo', 'provide-foo')
    provide('bar', 'provide-bar')
    return {}
  },
  render() {
    return h('div', {}, [h('p', {}, "我是Provider"), h(ProvideTwo)])
  }
}

const ProvideTwo = {
  name: 'ProviderTwo',
  setup() {
    provide('foo', 'provideTwo-foo')
    const foo = inject('foo')
    return { foo }
  },
  render() {
    return h('div', {}, [h('p', {}, `我是ProviderTwo: ${this.foo}`), h(Inject)])
  }
}

const Inject = {
  name: 'Inject',
  setup() {
    const foo = inject('foo')
    const baz = inject('baz', 'defaultBaz')
    const fn = inject('bn', () => 'fn')
    return {foo, baz, fn}
  },

  render() {
    return h('div', {}, [h('p', {}, "inject:"),h('p', {}, 'foo:' + this.foo + '-baz:' + this.baz + '-fn:' + this.fn)])
  }
}