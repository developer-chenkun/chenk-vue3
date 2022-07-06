import { App } from './app.js'
import { createApp } from '../../lib/guide-mini-vue.esm.js';
const rootContainer = document.querySelector("#app")
// createApp(App).mount('#app')
console.log(rootContainer);
createApp(App).mount(rootContainer)