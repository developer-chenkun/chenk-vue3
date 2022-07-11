import { h } from '../../lib/guide-mini-vue.esm.js';
export const Foo = {
  setup(props, ctx){
    console.log(props);
    const { emit } = ctx
    props.count++
    console.log(props);
    console.log(emit);
    const emitAdd = () => { 
      // console.log('emitAdd');
      emit('add', 1)
      emit('foo-add', { a: 1})
    }
    return { emitAdd }
  },

  render() {
    const button = h('button', {
      onClick: this.emitAdd
    }, 'emitAdd')
    const foo = h('p', {},'foo: ' + this.count )
    return h('div', {}, [foo, button])
  }
}