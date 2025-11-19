<template>
  <div class="invite">
    <div class="invite-container">
      <div class="card">
        <h2 class="heading-2" style="text-align: center;">Join Workspace</h2>
        <p class="text-muted" style="text-align: center; margin-top: var(--space-3);">
          Enter your invite code to join a workspace
        </p>
        
        <form @submit.prevent="validateCode" style="margin-top: var(--space-6);">
          <div style="margin-bottom: var(--space-4);">
            <input
              v-model="inviteCode"
              type="text"
              class="input"
              placeholder="Enter invite code (e.g., LOOP-ABC-123)"
              required
              style="text-transform: uppercase;"
              @input="formatCode"
            />
          </div>
          
          <button type="submit" class="btn" style="width: 100%;" :disabled="loading || validating">
            {{ validating ? 'Validating...' : 'Continue' }}
          </button>
        </form>
        
        <div v-if="workspace" class="workspace-info" style="margin-top: var(--space-5); padding: var(--space-4); background: var(--color-bg-alt); border: 2px solid var(--color-border); border-radius: var(--radius-sm);">
          <p style="font-weight: 700; margin-bottom: var(--space-2);">You're joining:</p>
          <p class="heading-3" style="margin: 0;">{{ workspace.name }}</p>
        </div>
        
        <div v-if="workspace" style="margin-top: var(--space-5);">
          <h3 class="heading-4" style="margin-bottom: var(--space-4);">Create Your Account</h3>
          
          <form @submit.prevent="handleSignup">
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
              {{ loading ? 'Creating Account...' : 'Create Account & Join' }}
            </button>
          </form>
        </div>
        
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const inviteCode = ref('')
const workspace = ref(null)
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const validating = ref(false)

// Check if code is in URL query
onMounted(() => {
  if (route.query.code) {
    inviteCode.value = route.query.code.toUpperCase()
    validateCode()
  }
})

const formatCode = (e) => {
  // Auto-format to LOOP-XXX-XXX format
  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  // Remove extra hyphens
  value = value.replace(/-+/g, '-')
  inviteCode.value = value
}

const validateCode = async () => {
  if (!inviteCode.value.trim()) {
    error.value = 'Please enter an invite code'
    return
  }
  
  validating.value = true
  error.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const response = await axios.get(`${apiUrl}/api/auth/invite/validate/${inviteCode.value.trim()}`)
    
    if (response.data.valid) {
      workspace.value = response.data.workspace
    } else {
      error.value = 'Invalid invite code'
    }
  } catch (err) {
    error.value = err.response?.data?.message || 'Invalid invite code'
    workspace.value = null
  } finally {
    validating.value = false
  }
}

const handleSignup = async () => {
  if (!workspace.value) {
    error.value = 'Please validate your invite code first'
    return
  }
  
  error.value = ''
  loading.value = true
  
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    loading.value = false
    return
  }
  
  const result = await authStore.register(name.value, email.value, password.value, inviteCode.value)
  loading.value = false
  
  if (result.success) {
    // Redirect to the workspace they joined
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
.invite {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-5);
}

.invite-container {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.workspace-info {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

