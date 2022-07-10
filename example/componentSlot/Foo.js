import { h, renderSlots } from '../../lib/guide-mini-vue.esm.js'

export const Foo = {
  name: 'Foo',
  setup(){
    return {}
  },

  render() {
    console.log(this.$slots);
    const foo = h('div', {}, "foo")
    return h("div", {}, [renderSlots(this.$slots, 'header'),foo, renderSlots(this.$slots, 'footer')])
  }
}