<template>
  <div class="login">
    <div class="login-container">
      <div class="card">
            <h2 class="heading-2" style="text-align: center;">Login to Loopline</h2>
            
            <form @submit.prevent="handleLogin" style="margin-top: var(--space-6);">
              <div style="margin-bottom: var(--space-4);">
                <input
                  v-model="email"
                  type="email"
                  class="input"
                  placeholder="Email"
                  required
                />
              </div>
              
              <div style="margin-bottom: var(--space-5);">
                <input
                  v-model="password"
                  type="password"
                  class="input"
                  placeholder="Password"
                  required
                />
              </div>
              
              <button type="submit" class="btn" style="width: 100%;">
                Login
              </button>
            </form>
            
            <div style="margin-top: var(--space-5); text-align: center;">
              <p class="text-muted" style="font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">or</p>
              <button @click="handleGoogleLogin" class="btn btn-secondary" style="width: 100%; margin-top: var(--space-4);">
                Login with Google
              </button>
            </div>
            
            <p v-if="error" class="text-muted" style="margin-top: var(--space-4); color: var(--matisse-red); font-weight: 600;">
              {{ error }}
            </p>
            
            <div style="margin-top: var(--space-5); text-align: center; padding-top: var(--space-5); border-top: 2px solid var(--color-border);">
              <p class="text-muted">
                Don't have an account? 
                <router-link to="/signup" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Sign up</router-link>
              </p>
            </div>
          </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''
  const result = await authStore.login(email.value, password.value)
  
  if (result.success) {
    const redirect = route.query.redirect || '/workspace'
    router.push(redirect)
  } else {
    error.value = result.error
  }
}

const handleGoogleLogin = () => {
  authStore.loginWithGoogle()
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-5);
}

.login-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>

