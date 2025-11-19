<template>
  <div class="workspace">
    <!-- Top Bar -->
    <div class="workspace-topbar">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); background: var(--color-bg); border-bottom: 3px solid var(--color-text);">
        <h2 class="heading-2" style="margin: 0;">{{ workspace?.name || 'Workspace' }}</h2>
        <div style="display: flex; align-items: center; gap: var(--space-4);">
          <span v-if="authStore.user" style="font-size: var(--text-sm); font-weight: 700; color: var(--color-text); text-transform: uppercase; letter-spacing: 0.5px;">
            {{ authStore.user.name }}
          </span>
          <button 
            @click="handleLogout"
            class="btn-logout"
            style="background: var(--matisse-red); color: white; border: none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-sm); font-weight: 900; font-size: var(--text-xs); cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all var(--transition-fast); box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.15);"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
    
    <!-- Main Content Area -->
    <div class="workspace-content">
      <div class="workspace-sidebar">
        <div class="workspace-header">
          <h3 class="heading-4" style="margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Workspace</h3>
          <div v-if="isWorkspaceAdmin" class="admin-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3); flex-wrap: wrap;">
            <button 
              @click="showInviteMember = true"
              class="btn-admin-action"
              style="background: var(--bauhaus-blue); color: white; border: none; padding: var(--space-2); border-radius: var(--radius-sm); font-weight: 700; font-size: var(--text-xs); cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; min-width: 80px;"
            >
              + Invite
            </button>
            <button 
              @click="showSettings = true"
              class="btn-admin-action"
              style="background: var(--color-bg-alt); color: var(--color-text); border: 2px solid var(--color-border); padding: var(--space-2); border-radius: var(--radius-sm); font-weight: 700; font-size: var(--text-xs); cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; min-width: 80px;"
            >
              ⚙️
            </button>
            <button 
              @click="$router.push(`/workspace/${workspaceId}/admin`)"
              class="btn-admin-action"
              style="background: var(--matisse-yellow); color: var(--bauhaus-black); border: none; padding: var(--space-2); border-radius: var(--radius-sm); font-weight: 700; font-size: var(--text-xs); cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; flex: 1; min-width: 80px;"
            >
              📊 Dashboard
            </button>
          </div>
        </div>
        
        <!-- Members List (Admin Only) - Collapsible on Mobile -->
        <div v-if="isWorkspaceAdmin" class="members-section" style="border-bottom: 2px solid var(--color-border);">
          <button 
            @click="showMembers = !showMembers"
            class="members-toggle"
            style="width: 100%; padding: var(--space-3) var(--space-4); background: transparent; border: none; display: flex; justify-content: space-between; align-items: center; cursor: pointer; text-align: left;"
          >
            <h4 class="text-muted" style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: var(--text-sm);">Members</h4>
            <span style="font-size: var(--text-lg); color: var(--color-text-muted); transform: rotate(0deg); transition: transform var(--transition-fast);" :style="{ transform: showMembers ? 'rotate(180deg)' : 'rotate(0deg)' }">▼</span>
          </button>
          
          <div v-show="showMembers" class="members-content" style="padding: 0 var(--space-4) var(--space-4) var(--space-4);">
            <!-- Workspace Owner - Simplified -->
            <div 
              v-if="workspace?.admin"
              class="member-item-compact"
              style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); margin-bottom: var(--space-2); background: var(--color-bg); border-radius: var(--radius-sm);"
            >
              <div style="width: 24px; height: 24px; background: var(--bauhaus-yellow); color: var(--bauhaus-black); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: var(--text-xs); flex-shrink: 0;">
                {{ workspace.admin?.name?.charAt(0)?.toUpperCase() || 'O' }}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 700; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  {{ workspace.admin?.name || 'Owner' }}
                </div>
                <span 
                  style="background: var(--bauhaus-yellow); color: var(--bauhaus-black); padding: 2px var(--space-1); border-radius: 2px; font-size: 10px; font-weight: 900; text-transform: uppercase;"
                >
                  OWNER
                </span>
              </div>
            </div>
            
            <!-- Workspace Members - Compact List -->
            <div v-if="workspace?.members && workspace.members.length > 0" style="display: flex; flex-direction: column; gap: var(--space-1);">
              <div 
                v-for="member in workspace.members" 
                :key="member.user?._id || member.user"
                class="member-item-compact"
                style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); background: var(--color-bg-alt); border-radius: var(--radius-sm);"
              >
                <div 
                  :style="member.role === 'admin' 
                    ? 'width: 24px; height: 24px; background: var(--bauhaus-blue); color: white; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: var(--text-xs); flex-shrink: 0;'
                    : 'width: 24px; height: 24px; background: var(--color-border); color: var(--color-text); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: var(--text-xs); flex-shrink: 0;'"
                >
                  {{ member.user?.name?.charAt(0)?.toUpperCase() || 'M' }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 600; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ member.user?.name || 'Member' }}
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else style="padding: var(--space-2); text-align: center; color: var(--color-text-muted); font-size: var(--text-xs); font-weight: 600;">
              No other members
            </div>
          </div>
        </div>
        
      
      <div class="channels-list">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4); border-bottom: 2px solid var(--color-border);">
          <h4 class="text-muted" style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: var(--text-sm);">Channels</h4>
          <button 
            @click="showCreateChannel = !showCreateChannel" 
            class="btn-create-channel"
            style="background: var(--bauhaus-yellow); color: var(--bauhaus-black); border: none; width: 28px; height: 28px; border-radius: var(--radius-sm); font-weight: 900; font-size: var(--text-base); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1); transition: all var(--transition-fast); flex-shrink: 0;"
            title="Create Channel"
          >
            +
          </button>
        </div>
        
        <!-- Create Channel Form -->
        <div v-if="showCreateChannel" class="create-channel-form" style="padding: var(--space-4); border-bottom: 2px solid var(--color-border); background: var(--color-bg);">
          <form @submit.prevent="handleCreateChannel">
            <div style="margin-bottom: var(--space-3);">
              <input
                v-model="newChannel.name"
                type="text"
                class="input"
                placeholder="Channel name"
                required
                style="width: 100%; font-size: var(--text-sm);"
                @keyup.esc="cancelCreateChannel"
              />
            </div>
            <div style="margin-bottom: var(--space-3);">
              <textarea
                v-model="newChannel.description"
                class="input"
                placeholder="Description (optional)"
                rows="2"
                style="width: 100%; font-size: var(--text-sm); resize: none;"
              ></textarea>
            </div>
            <div style="margin-bottom: var(--space-3); display: flex; gap: var(--space-2); align-items: center;">
              <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--text-sm);">
                <input
                  v-model="newChannel.privacy"
                  type="radio"
                  value="public"
                  style="cursor: pointer;"
                />
                <span>Public</span>
              </label>
              <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--text-sm);">
                <input
                  v-model="newChannel.privacy"
                  type="radio"
                  value="private"
                  style="cursor: pointer;"
                />
                <span>Private</span>
              </label>
            </div>
            <div style="display: flex; gap: var(--space-2);">
              <button 
                type="submit" 
                class="btn" 
                style="flex: 1; padding: var(--space-2); font-size: var(--text-sm);"
                :disabled="creatingChannel"
              >
                {{ creatingChannel ? 'Creating...' : 'Create' }}
              </button>
              <button 
                type="button" 
                @click="cancelCreateChannel"
                class="btn btn-secondary"
                style="padding: var(--space-2); font-size: var(--text-sm);"
                :disabled="creatingChannel"
              >
                Cancel
              </button>
            </div>
            <div v-if="createChannelError" style="margin-top: var(--space-2); color: var(--matisse-red); font-size: var(--text-xs); font-weight: 600;">
              {{ createChannelError }}
            </div>
          </form>
        </div>
        
        <div v-if="loading" style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
          Loading channels...
        </div>
        
        <div v-else-if="error" style="padding: var(--space-4); color: var(--matisse-red); font-weight: 600;">
          {{ error }}
        </div>
        
        <div v-else-if="channels.length === 0" style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
          No channels yet. Create one!
        </div>
        
        <div
          v-else
          v-for="channel in channels"
          :key="channel._id"
          class="channel-item"
          :class="{ active: currentChannelId === channel._id || route.params.channelId === channel._id }"
          @click="selectChannel(channel._id)"
        >
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span v-if="channel.privacy === 'private'" style="font-size: var(--text-xs); flex-shrink: 0;" title="Private channel">🔒</span>
            <span style="font-weight: 600; font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"># {{ channel.name }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="workspace-main">
      <router-view />
    </div>
  </div>
  
  <!-- Settings Modal -->
  <div v-if="showSettings && isWorkspaceAdmin" class="modal-overlay" @click.self="cancelSettings">
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);">
        <h3 style="margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; font-size: var(--text-lg);">Settings</h3>
        <button 
          @click="cancelSettings"
          style="background: transparent; border: none; font-size: var(--text-2xl); cursor: pointer; color: var(--color-text); font-weight: 900; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"
          title="Close"
        >
          ×
        </button>
      </div>
      
      <form @submit.prevent="handleSaveSettings">
        <!-- Workspace Name -->
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Name</label>
          <input
            v-model="workspaceSettings.name"
            type="text"
            class="input"
            placeholder="Workspace name"
            required
            style="width: 100%; font-size: var(--text-base);"
          />
        </div>
        
        <!-- Message Retention -->
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Retention (days)</label>
          <input
            v-model.number="workspaceSettings.retentionDays"
            type="number"
            class="input"
            placeholder="No limit"
            min="1"
            style="width: 100%; font-size: var(--text-base);"
          />
          <p style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.5;">
            Auto-delete messages older than this. Leave empty to keep all.
          </p>
        </div>
        
        <!-- Allow Public Channels -->
        <div style="margin-bottom: var(--space-4);">
          <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer; font-size: var(--text-base); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            <input
              v-model="workspaceSettings.allowPublicChannels"
              type="checkbox"
              style="cursor: pointer; width: 20px; height: 20px; flex-shrink: 0;"
            />
            <span>Allow Public Channels</span>
          </label>
        </div>
        
        <!-- Google Drive Status -->
        <div style="margin-bottom: var(--space-5); padding: var(--space-4); background: var(--color-bg-alt); border-radius: var(--radius-sm); border: 2px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Google Drive</span>
            <span 
              :style="workspaceSettings.driveLinked 
                ? 'background: var(--matisse-green); color: white; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 900; text-transform: uppercase;'
                : 'background: var(--color-bg); color: var(--color-text-muted); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; border: 1px solid var(--color-border);'"
            >
              {{ workspaceSettings.driveLinked ? 'LINKED' : 'NOT LINKED' }}
            </span>
          </div>
        </div>
        
        <!-- Save Button -->
        <div style="display: flex; gap: var(--space-3);">
          <button 
            type="submit" 
            class="btn" 
            style="flex: 1; padding: var(--space-4); font-size: var(--text-base); font-weight: 700;"
            :disabled="savingSettings || loadingSettings"
          >
            {{ savingSettings ? 'Saving...' : 'Save Settings' }}
          </button>
          <button 
            type="button" 
            @click="cancelSettings"
            class="btn btn-secondary"
            style="flex: 1; padding: var(--space-4); font-size: var(--text-base); font-weight: 700;"
            :disabled="savingSettings || loadingSettings"
          >
            Cancel
          </button>
        </div>
        
        <div v-if="settingsError" style="margin-top: var(--space-3); color: var(--matisse-red); font-size: var(--text-sm); font-weight: 600; text-align: center;">
          {{ settingsError }}
        </div>
      </form>
    </div>
  </div>
  
  <!-- Invite Member Modal -->
  <div v-if="showInviteMember && isWorkspaceAdmin" class="modal-overlay" @click.self="cancelInvite">
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);">
        <h3 style="margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; font-size: var(--text-lg);">Invite Member</h3>
        <button 
          @click="cancelInvite"
          style="background: transparent; border: none; font-size: var(--text-2xl); cursor: pointer; color: var(--color-text); font-weight: 900; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;"
          title="Close"
        >
          ×
        </button>
      </div>
      
      <form @submit.prevent="handleInviteMember">
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Email</label>
          <input
            v-model="inviteEmail"
            type="email"
            class="input"
            placeholder="email@example.com"
            required
            style="width: 100%; font-size: var(--text-base);"
            @keyup.esc="cancelInvite"
          />
        </div>
        <div style="margin-bottom: var(--space-5);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Role</label>
          <select v-model="inviteRole" class="input" style="width: 100%; font-size: var(--text-base);">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div style="display: flex; gap: var(--space-3);">
          <button 
            type="submit" 
            class="btn" 
            style="flex: 1; padding: var(--space-4); font-size: var(--text-base); font-weight: 700;"
            :disabled="invitingMember"
          >
            {{ invitingMember ? 'Inviting...' : 'Invite' }}
          </button>
          <button 
            type="button" 
            @click="cancelInvite"
            class="btn btn-secondary"
            style="flex: 1; padding: var(--space-4); font-size: var(--text-base); font-weight: 700;"
            :disabled="invitingMember"
          >
            Cancel
          </button>
        </div>
        <div v-if="inviteError" style="margin-top: var(--space-3); color: var(--matisse-red); font-size: var(--text-sm); font-weight: 600; text-align: center;">
          {{ inviteError }}
        </div>
      </form>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceAuth } from '../composables/useWorkspaceAuth'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspace = ref(null)
const channels = ref([])
const currentChannelId = ref(null)
const error = ref('')
const loading = ref(false)

const showCreateChannel = ref(false)
const creatingChannel = ref(false)
const createChannelError = ref('')
const newChannel = ref({
  name: '',
  description: '',
  privacy: 'public'
})

// Admin features
const showInviteMember = ref(false)
const invitingMember = ref(false)
const inviteError = ref('')
const inviteEmail = ref('')
const inviteRole = ref('member')
const showSettings = ref(false)
const showMembers = ref(false) // Collapsible members section
const loadingSettings = ref(false)
const savingSettings = ref(false)
const settingsError = ref('')
const workspaceSettings = ref({
  name: '',
  retentionDays: null,
  allowPublicChannels: true,
  driveLinked: false
})

const workspaceId = route.params.workspaceId

// Use workspace auth composable
const { isWorkspaceAdmin, hasAdminRole } = useWorkspaceAuth(workspace)

onMounted(async () => {
  await fetchWorkspace()
  await fetchChannels()
  
  // If we have channels and no channel is selected, redirect to the first one (welcome)
  if (channels.value.length > 0 && !route.params.channelId) {
    router.push(`/workspace/${workspaceId}/channel/${channels.value[0]._id}`)
  }
})

// Watch for settings panel opening to load settings
watch(showSettings, async (isOpen) => {
  if (isOpen && isWorkspaceAdmin.value) {
    await fetchSettings()
  }
})

const fetchWorkspace = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/workspaces/${workspaceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    workspace.value = response.data
  } catch (error) {
    console.error('❌ Failed to fetch workspace:', error)
    if (error.response?.status === 401) {
      router.push('/login')
    }
  }
}

const fetchChannels = async () => {
  error.value = ''
  loading.value = true
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    console.log('📋 Fetching channels for workspace:', workspaceId)
    
    const response = await axios.get(`${apiUrl}/api/channels/workspace/${workspaceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Channels fetched:', response.data)
    channels.value = response.data || []
    
    if (!Array.isArray(channels.value)) {
      console.error('❌ Invalid channels data:', channels.value)
      channels.value = []
    }
  } catch (error) {
    console.error('❌ Failed to fetch channels:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    error.value = error.response?.data?.message || 'Failed to load channels'
    channels.value = []
    
    if (error.response?.status === 401) {
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const selectChannel = (channelId) => {
  currentChannelId.value = channelId
  router.push(`/workspace/${workspaceId}/channel/${channelId}`).catch(() => {
    // Ignore navigation errors (e.g., navigating to same route)
  })
}

// Watch route changes to update current channel
watch(() => route.params.channelId, (newChannelId) => {
  if (newChannelId) {
    currentChannelId.value = newChannelId
  }
}, { immediate: true })

const handleCreateChannel = async () => {
  if (!newChannel.value.name.trim()) return
  
  creatingChannel.value = true
  createChannelError.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    console.log('📝 Creating channel:', newChannel.value)
    
    const response = await axios.post(`${apiUrl}/api/channels`, {
      name: newChannel.value.name.trim(),
      workspace: workspaceId,
      privacy: newChannel.value.privacy,
      description: newChannel.value.description.trim() || undefined
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Channel created:', response.data)
    
    // Reset form
    newChannel.value = {
      name: '',
      description: '',
      privacy: 'public'
    }
    showCreateChannel.value = false
    
    // Refresh channels list
    await fetchChannels()
    
    // Navigate to the new channel
    if (response.data._id) {
      router.push(`/workspace/${workspaceId}/channel/${response.data._id}`)
    }
  } catch (error) {
    console.error('❌ Failed to create channel:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    createChannelError.value = error.response?.data?.message || 'Failed to create channel'
  } finally {
    creatingChannel.value = false
  }
}

const cancelCreateChannel = () => {
  showCreateChannel.value = false
  newChannel.value = {
    name: '',
    description: '',
    privacy: 'public'
  }
  createChannelError.value = ''
}

const handleInviteMember = async () => {
  if (!inviteEmail.value.trim()) return
  
  invitingMember.value = true
  inviteError.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    console.log('📧 Inviting member:', inviteEmail.value)
    
    const response = await axios.post(`${apiUrl}/api/workspaces/${workspaceId}/invite`, {
      email: inviteEmail.value.trim(),
      role: inviteRole.value
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Member invited:', response.data)
    
    // Reset form
    inviteEmail.value = ''
    inviteRole.value = 'member'
    showInviteMember.value = false
    
    // Refresh workspace to get updated members
    await fetchWorkspace()
  } catch (error) {
    console.error('❌ Failed to invite member:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    inviteError.value = error.response?.data?.message || 'Failed to invite member'
  } finally {
    invitingMember.value = false
  }
}

const cancelInvite = () => {
  showInviteMember.value = false
  inviteEmail.value = ''
  inviteRole.value = 'member'
  inviteError.value = ''
}

const fetchSettings = async () => {
  if (!isWorkspaceAdmin.value) return
  
  loadingSettings.value = true
  settingsError.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/admin/workspace/${workspaceId}/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    workspaceSettings.value = {
      name: response.data.name || workspace.value?.name || '',
      retentionDays: response.data.settings?.retentionDays || null,
      allowPublicChannels: response.data.settings?.allowPublicChannels !== false,
      driveLinked: response.data.driveLinked || false
    }
  } catch (error) {
    console.error('❌ Failed to fetch settings:', error)
    settingsError.value = error.response?.data?.message || 'Failed to load settings'
    // Fallback to workspace data if available
    if (workspace.value) {
      workspaceSettings.value = {
        name: workspace.value.name || '',
        retentionDays: workspace.value.settings?.retentionDays || null,
        allowPublicChannels: workspace.value.settings?.allowPublicChannels !== false,
        driveLinked: workspace.value.driveLinked || false
      }
    }
  } finally {
    loadingSettings.value = false
  }
}

const handleSaveSettings = async () => {
  if (!isWorkspaceAdmin.value) return
  
  savingSettings.value = true
  settingsError.value = ''
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.patch(`${apiUrl}/api/admin/workspace/${workspaceId}/settings`, {
      name: workspaceSettings.value.name,
      settings: {
        retentionDays: workspaceSettings.value.retentionDays || null,
        allowPublicChannels: workspaceSettings.value.allowPublicChannels
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Settings saved:', response.data)
    
    // Refresh workspace data
    await fetchWorkspace()
    
    // Close settings panel
    showSettings.value = false
  } catch (error) {
    console.error('❌ Failed to save settings:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    settingsError.value = error.response?.data?.message || 'Failed to save settings'
  } finally {
    savingSettings.value = false
  }
}

const cancelSettings = () => {
  showSettings.value = false
  settingsError.value = ''
  // Reset to current workspace values
  if (workspace.value) {
    workspaceSettings.value = {
      name: workspace.value.name || '',
      retentionDays: workspace.value.settings?.retentionDays || null,
      allowPublicChannels: workspace.value.settings?.allowPublicChannels !== false,
      driveLinked: workspace.value.driveLinked || false
    }
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.workspace-topbar {
  flex-shrink: 0;
  z-index: 10;
  position: sticky;
  top: 0;
  background: var(--color-bg);
}

.workspace-content {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workspace-sidebar {
  width: 240px;
  background: var(--color-bg-alt);
  border-right: 3px solid var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 2px solid var(--color-border);
  background: var(--color-bg-alt);
  flex-shrink: 0;
}

.channels-list {
  flex: 1;
  overflow-y: auto;
}

.channel-item {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-weight: 600;
  border-left: 4px solid transparent;
  margin-left: var(--space-2);
}

.members-toggle {
  transition: background var(--transition-fast);
}

.members-toggle:hover {
  background: var(--color-bg-alt);
}

.members-content {
  animation: slideDown 0.2s ease-out;
}

.admin-actions {
  display: flex;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-content {
  background: var(--color-bg);
  border: 3px solid var(--color-text);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
}

.channel-item:hover {
  background: var(--color-bg);
  border-left-color: var(--matisse-yellow);
  transform: translateX(4px);
}

.channel-item.active {
  background: var(--color-primary);
  color: white;
  border-left-color: var(--matisse-red);
  box-shadow: -4px 0 0 var(--matisse-red);
}

.btn-create-channel:hover {
  background: var(--bauhaus-blue) !important;
  color: var(--bauhaus-white) !important;
  transform: scale(1.1);
}

.btn-logout:hover {
  background: var(--bauhaus-red) !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.member-item:hover {
  border-color: var(--matisse-yellow) !important;
  transform: translateX(4px);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.create-channel-form {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg);
  min-height: 0;
}

.workspace-main > * {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* Mobile: One column layout - Simplified */
@media (max-width: 768px) {
  .workspace {
    height: 100vh;
    height: 100dvh;
  }
  
  .workspace-topbar {
    padding: var(--space-2) var(--space-3);
  }
  
  .workspace-topbar h2 {
    font-size: var(--text-sm);
    font-weight: 900;
  }
  
  .workspace-topbar span {
    display: none; /* Hide user name on mobile */
  }
  
  .workspace-content {
    flex-direction: column;
  }
  
  .workspace-sidebar {
    width: 100%;
    max-height: 40vh;
    border-right: none;
    border-bottom: 3px solid var(--color-text);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .workspace-header {
    padding: var(--space-3);
  }
  
  .workspace-header h3 {
    font-size: var(--text-xs);
  }
  
  .admin-actions {
    flex-direction: column;
    gap: var(--space-2) !important;
  }
  
  .admin-actions button {
    font-size: var(--text-xs) !important;
    padding: var(--space-2) !important;
  }
  
  .modal-content {
    max-width: 100%;
    padding: var(--space-4) !important;
    margin: var(--space-2);
  }
  
  .channels-list {
    max-height: none;
  }
  
  .channels-list > div:first-child {
    padding: var(--space-2) var(--space-3) !important;
  }
  
  .channels-list h4 {
    font-size: var(--text-xs) !important;
  }
  
  .channel-item {
    padding: var(--space-2) var(--space-3) !important;
    font-size: var(--text-xs) !important;
  }
  
  .channel-description {
    display: none !important; /* Hide descriptions on mobile */
  }
  
  .members-section {
    border-bottom: 1px solid var(--color-border) !important;
  }
  
  .members-toggle {
    padding: var(--space-2) var(--space-3) !important;
  }
  
  .members-toggle h4 {
    font-size: var(--text-xs) !important;
  }
  
  .members-content {
    padding: 0 var(--space-3) var(--space-3) var(--space-3) !important;
  }
  
  .member-item-compact {
    padding: var(--space-1) var(--space-2) !important;
  }
  
  .settings-panel {
    max-height: 50vh !important;
    padding: var(--space-3) !important;
  }
  
  .settings-panel label {
    font-size: 10px !important;
  }
  
  .settings-panel input {
    font-size: var(--text-xs) !important;
    padding: var(--space-2) !important;
  }
  
  .admin-form {
    padding: var(--space-2) !important;
  }
  
  .admin-form input {
    font-size: var(--text-xs) !important;
    padding: var(--space-2) !important;
  }
  
  .workspace-main {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  
  /* Hide less important info on mobile */
  .create-channel-form {
    padding: var(--space-2) !important;
  }
  
  .create-channel-form label {
    font-size: var(--text-xs) !important;
  }
  
  .create-channel-form input,
  .create-channel-form textarea {
    font-size: var(--text-xs) !important;
    padding: var(--space-2) !important;
  }
}
</style>

