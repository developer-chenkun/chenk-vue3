export const App = {
  // render函数

  render() {
    return h('div', 'hi,' + this.msg)
  },

  setup() {
    // composition api

    return {
      msg: 'mini-vue'
    }
  }
}