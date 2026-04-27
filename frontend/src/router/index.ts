import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Trek from '../views/Trek.vue'
import Join from '../views/Join.vue'
import Profile from '../views/Profile.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/join/:code?', component: Join },
    { path: '/trek/:code', component: Trek },
    { path: '/profile', component: Profile },
  ],
})
