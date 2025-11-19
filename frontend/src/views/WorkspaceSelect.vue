<template>
  <div class="workspace-select">
    <div class="workspace-select-container">
      <div class="card">
            <h2 class="heading-2" style="text-align: center;">Select or Create Workspace</h2>
            
            <div v-if="error" style="margin-top: var(--space-4); padding: var(--space-4); background: var(--matisse-red); color: white; border-radius: var(--radius-sm);">
              <p style="font-weight: 600;">{{ error }}</p>
            </div>
            
            <div v-if="workspaces.length > 0" style="margin-top: var(--space-6);">
              <h3 class="heading-4" style="margin-bottom: var(--space-4);">Your Workspaces</h3>
              <div class="workspace-list">
                <div
                  v-for="workspace in workspaces"
                  :key="workspace._id || workspace.id"
                  class="workspace-item card"
                  @click="selectWorkspace(workspace._id || workspace.id)"
                >
                  <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-3);">
                    <div style="flex: 1;">
                      <h4 class="heading-4">{{ workspace.name }}</h4>
                      <p class="text-muted">{{ workspace.members?.length || 0 }} members</p>
                    </div>
                    <span 
                      v-if="isWorkspaceAdmin(workspace)"
                      class="workspace-badge"
                      style="background: var(--bauhaus-yellow); color: var(--bauhaus-black); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;"
                    >
                      Admin
                    </span>
                    <span 
                      v-else
                      class="workspace-badge"
                      style="background: var(--color-bg-alt); color: var(--color-text); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;"
                    >
                      Member
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="margin-top: var(--space-6);">
              <h3 class="heading-4" style="margin-bottom: var(--space-4);">
                {{ workspaces.length > 0 ? 'Create New Workspace' : 'Create Your First Workspace' }}
              </h3>
              <form @submit.prevent="createWorkspace">
                <div style="margin-bottom: var(--space-4);">
                  <input
                    v-model="workspaceName"
                    type="text"
                    class="input"
                    placeholder="Workspace name"
                    required
                  />
                </div>
                <button type="submit" class="btn" style="width: 100%;" :disabled="loading">
                  {{ loading ? 'Creating...' : 'Create Workspace' }}
                </button>
              </form>
            </div>
          </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const workspaces = ref([])
const workspaceName = ref('')
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  await fetchWorkspaces()
})

const fetchWorkspaces = async () => {
  error.value = ''
  try {
    // Use proxy from vite.config.js (routes /api to http://localhost:3000)
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const url = `${apiUrl}/api/workspaces`
    
    console.log('📋 Fetching workspaces from:', url)
    
    // Make sure we have auth token
    const token = authStore.token || localStorage.getItem('token')
    if (!token) {
      console.error('❌ No auth token found')
      error.value = 'Not authenticated. Please login again.'
      router.push('/login')
      return
    }
    
    // Set auth header
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Workspaces fetched:', response.data)
    workspaces.value = response.data || []
    
    if (!Array.isArray(workspaces.value)) {
      console.error('❌ Invalid workspaces data:', workspaces.value)
      workspaces.value = []
    }
  } catch (error) {
    console.error('❌ Failed to fetch workspaces:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    error.value = error.response?.data?.message || 'Failed to load workspaces'
    workspaces.value = []
    
    // If unauthorized, redirect to login
    if (error.response?.status === 401) {
      router.push('/login')
    }
  }
}

const selectWorkspace = (workspaceId) => {
  router.push(`/workspace/${workspaceId}`)
}

const isWorkspaceAdmin = (workspace) => {
  if (!workspace || !authStore.user) return false
  
  // Check if user is the admin
  const adminId = workspace.admin?._id || workspace.admin
  const userId = authStore.user.id || authStore.user._id
  
  return adminId?.toString() === userId?.toString()
}

const createWorkspace = async () => {
  if (!workspaceName.value.trim()) return
  
  error.value = ''
  loading.value = true
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const url = `${apiUrl}/api/workspaces`
    const token = authStore.token || localStorage.getItem('token')
    
    console.log('📝 Creating workspace:', workspaceName.value)
    
    const response = await axios.post(url, {
      name: workspaceName.value
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Workspace created:', response.data)
    router.push(`/workspace/${response.data._id}`)
  } catch (error) {
    console.error('❌ Failed to create workspace:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    error.value = error.response?.data?.message || 'Failed to create workspace'
    alert(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.workspace-select {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-5);
}

.workspace-select-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.workspace-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.workspace-item {
  cursor: pointer;
  transition: all var(--transition-base);
}

.workspace-item:hover {
  transform: translate(-2px, -2px);
  box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.15);
}
</style>

