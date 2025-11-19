import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('../views/Signup.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/workspace',
    name: 'WorkspaceSelect',
    component: () => import('../views/WorkspaceSelect.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/workspace/:workspaceId',
    name: 'Workspace',
    component: () => import('../views/Workspace.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'channel/:channelId',
        name: 'Channel',
        component: () => import('../views/Channel.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: 'admin',
        name: 'AdminDashboard',
        component: () => import('../views/AdminDashboard.vue'),
        meta: { requiresAuth: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // If route requires auth
  if (to.meta.requiresAuth) {
    // Check if we have a token
    const token = authStore.token || localStorage.getItem('token')
    
    if (!token) {
      // No token, redirect to login
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    // We have a token, but user might not be loaded yet
    if (!authStore.user) {
      // Try to fetch user
      try {
        await authStore.fetchUser()
        // If fetchUser fails, it will call logout and clear token
        if (!authStore.user) {
          next({ name: 'Login', query: { redirect: to.fullPath } })
          return
        }
      } catch (error) {
        // Fetch failed, redirect to login
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
    
    // User is authenticated, proceed
    next()
  } else {
    // Route doesn't require auth, proceed
    next()
  }
})

export default router

