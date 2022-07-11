import { h, renderSlots } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  name: 'Foo',
  setup(){
    return {}
  },

  render() {
    console.log(this.$slots);
    const foo = h('div', {}, "foo")
    // 具名插槽
    // 作用域插槽
    const age = 18
    return h("div", {}, [
      renderSlots(this.$slots, 'header', { age }),
      foo, 
      renderSlots(this.$slots, 'footer')
    ])
  }
}