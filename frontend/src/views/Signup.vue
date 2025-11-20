<template>
  <div class="signup">
    <div class="signup-container">
      <div class="card">
            <h2 class="heading-2" style="text-align: center;">Create Your Account</h2>
            
            <form @submit.prevent="handleSignup" style="margin-top: var(--space-6);">
              <div style="margin-bottom: var(--space-4);">
                <input
                  v-model="inviteCode"
                  type="text"
                  class="input"
                  placeholder="Invite Code (optional)"
                  style="text-transform: uppercase;"
                  @input="formatCode"
                />
                <p class="text-muted" style="font-size: var(--text-xs); margin-top: var(--space-1);">
                  Have an invite code? Enter it here to join a workspace
                </p>
              </div>
              
              <div style="margin-bottom: var(--space-4);">
                <input
                  v-model="name"
                  type="text"
                  class="input"
                  placeholder="Full Name"
                  required
                />
              </div>
              
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
                  placeholder="Password (min 8 characters)"
                  required
                  minlength="8"
                />
              </div>
              
              <button type="submit" class="btn" style="width: 100%;" :disabled="loading">
                {{ loading ? 'Creating Account...' : 'Create Account' }}
              </button>
            </form>
            
            <p v-if="error" class="text-muted" style="margin-top: var(--space-4); color: var(--matisse-red); font-weight: 600;">
              {{ error }}
            </p>
            
            <div style="margin-top: var(--space-5); text-align: center; padding-top: var(--space-5); border-top: 2px solid var(--color-border);">
              <p class="text-muted">
                Already have an account? 
                <router-link to="/login" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">Login</router-link>
              </p>
            </div>
          </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const inviteCode = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const formatCode = (e) => {
  // Auto-format to LOOP-XXX-XXX format
  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  // Remove extra hyphens
  value = value.replace(/-+/g, '-')
  inviteCode.value = value
}

const handleSignup = async () => {
  error.value = ''
  loading.value = true
  
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    loading.value = false
    return
  }
  
  const result = await authStore.register(name.value, email.value, password.value, inviteCode.value || undefined)
  loading.value = false
  
  if (result.success) {
    // If joined via invite, redirect to that workspace
    if (result.workspaceId) {
      router.push(`/workspace/${result.workspaceId}`)
    } else {
      router.push('/workspace')
    }
  } else {
    error.value = result.error
  }
}
</script>

<style scoped>
.signup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-5);
}

.signup-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}
</style>

