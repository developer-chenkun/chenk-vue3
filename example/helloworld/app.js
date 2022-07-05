export const App = {
  // render函数

  render() {
    return h('div',{ id: 'root', class: ['red']},[h('p', { class: ['blue']}, 'mini-vue')])
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}