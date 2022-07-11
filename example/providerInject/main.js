import { Provider } from './App.js'
import { createApp } from '../../lib/guide-mini-vue.esm.js';
const rootContainer = document.querySelector("#app")
// createApp(App).mount('#app')
createApp(Provider).mount(rootContainer)