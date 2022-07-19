// 老的是text 新的是Array

import { h, ref } from "../../lib/guide-mini-vue.esm.js"

const nextChildren = [h('p', {}, 'next'), h('p', {}, 'Child')]
const prevChildren = 'oldChild'

export default {
  name: 'TextToArray',
  setup() {
    const isChange = ref(false)
    window.isChange = isChange

    return {
      isChange
    }
  },

  render() {
    return this.isChange === true ? h('div', {}, nextChildren) : h('div', {}, prevChildren)
  },
}