import { h } from '../../lib/guide-mini-vue.esm.js';
export const App = {
  // render函数

  render() {
    // return h('div',{ id: 'root', class: ['red']},[h('p', {÷ class: ['blue']}, 'hi,'), h('p', { class: ['red']}, 'mini-vue')])
    return h('div',{ id: 'root', class: ['red']}, 'hi,'+ this.msg)
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}