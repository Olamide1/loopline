<template>
  <div class="direct-messages">
    <div class="dm-header">
      <h2 class="heading-2">Direct Messages</h2>
      <button @click="showNewDM = true" class="btn btn-accent" style="font-size: var(--text-xs); padding: var(--space-2) var(--space-3);">+ New</button>
    </div>
    
    <!-- New DM Modal -->
    <div v-if="showNewDM" class="modal-overlay" @click.self="showNewDM = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Start a Conversation</h3>
          <button @click="showNewDM = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <input
            v-model="searchUserQuery"
            @input="searchUsers"
            class="input"
            placeholder="Search users by name or email..."
            style="width: 100%; margin-bottom: var(--space-3);"
          />
          <div v-if="userSearchResults.length === 0 && searchUserQuery.trim().length >= 2" class="empty-search" style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
            No users found matching "{{ searchUserQuery }}"
          </div>
          <div v-else-if="userSearchResults.length === 0 && !searchUserQuery.trim()" class="empty-search" style="padding: var(--space-4); text-align: center; color: var(--color-text-muted);">
            Start typing to search workspace members...
          </div>
          <div v-else-if="userSearchResults.length > 0" class="user-search-results">
            <div
              v-for="user in userSearchResults"
              :key="user._id || user.id"
              @click="startConversation(user)"
              class="user-result-item"
            >
              <div class="user-avatar">
                {{ user.name?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.name }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Conversations List -->
    <div class="conversations-list">
      <div v-if="loading" class="loading">Loading conversations...</div>
      <div v-else-if="conversations.length === 0" class="empty-state">
        <p>No conversations yet. Start a new message!</p>
      </div>
      <div
        v-for="conversation in conversations"
        :key="conversation._id"
        @click="selectConversation(conversation)"
        class="conversation-item"
        :class="{ active: selectedConversation?._id === conversation._id }"
      >
        <div class="conversation-avatar">
          {{ getOtherParticipant(conversation)?.name?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">{{ getOtherParticipant(conversation)?.name || 'Unknown' }}</span>
            <span v-if="getUnreadCount(conversation) > 0" class="unread-badge">{{ getUnreadCount(conversation) }}</span>
          </div>
          <div class="conversation-preview">
            {{ conversation.lastMessage?.text || 'No messages yet' }}
          </div>
          <div v-if="conversation.lastMessageAt" class="conversation-time">
            {{ formatTime(conversation.lastMessageAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { io } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspaceId = computed(() => route.params.workspaceId)

const conversations = ref([])
const loading = ref(true)
const showNewDM = ref(false)
const searchUserQuery = ref('')
const userSearchResults = ref([])
const selectedConversation = ref(null)
const socket = ref(null)

const fetchConversations = async () => {
  loading.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/direct-messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    conversations.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('❌ Failed to fetch conversations:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const searchUsers = async () => {
  if (!workspaceId.value) {
    userSearchResults.value = []
    return
  }
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Get workspace members
    const workspaceResponse = await axios.get(`${apiUrl}/api/workspaces/${workspaceId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const workspace = workspaceResponse.data
    const allUsers = []
    const currentUserId = authStore.user?.id || authStore.user?._id
    
    // Add admin if not current user
    if (workspace.admin) {
      const adminId = workspace.admin._id || workspace.admin
      if (adminId?.toString() !== currentUserId?.toString()) {
        allUsers.push({
          _id: adminId,
          id: adminId,
          name: workspace.admin.name,
          email: workspace.admin.email,
          avatar: workspace.admin.avatar
        })
      }
    }
    
    // Add other members
    if (workspace.members) {
      workspace.members.forEach(member => {
        const user = member.user || member
        if (user && user._id) {
          const userId = user._id || user
          if (userId?.toString() !== currentUserId?.toString()) {
            // If there's a search query, filter by it
            if (searchUserQuery.value.trim().length >= 2) {
              const name = (user.name || '').toLowerCase()
              const email = (user.email || '').toLowerCase()
              const query = searchUserQuery.value.toLowerCase()
              if (name.includes(query) || email.includes(query)) {
                if (!allUsers.find(u => (u._id || u.id)?.toString() === userId?.toString())) {
                  allUsers.push({
                    _id: userId,
                    id: userId,
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar
                  })
                }
              }
            } else {
              // Show all members if no search query or query is too short
              if (!allUsers.find(u => (u._id || u.id)?.toString() === userId?.toString())) {
                allUsers.push({
                  _id: userId,
                  id: userId,
                  name: user.name,
                  email: user.email,
                  avatar: user.avatar
                })
              }
            }
          }
        }
      })
    }
    
    userSearchResults.value = allUsers
  } catch (error) {
    console.error('❌ Failed to search users:', error)
    userSearchResults.value = []
  }
}

// Load workspace members when modal opens
watch(showNewDM, (isOpen) => {
  if (isOpen) {
    searchUserQuery.value = ''
    // Load all members initially
    searchUsers()
  }
})

const startConversation = async (user) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.post(`${apiUrl}/api/direct-messages/conversation`, {
      userId: user._id || user.id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    showNewDM.value = false
    searchUserQuery.value = ''
    userSearchResults.value = []
    
    // Navigate to DM view
    router.push(`/workspace/${workspaceId.value}/dm/${response.data._id}`)
  } catch (error) {
    console.error('❌ Failed to start conversation:', error)
    alert('Failed to start conversation')
  }
}

const selectConversation = (conversation) => {
  selectedConversation.value = conversation
  router.push(`/workspace/${workspaceId.value}/dm/${conversation._id}`)
}

const getOtherParticipant = (conversation) => {
  if (!conversation.participants) return null
  const userId = authStore.user?._id || authStore.user?.id
  return conversation.participants.find(p => (p._id || p.id || p)?.toString() !== userId?.toString())
}

const getUnreadCount = (conversation) => {
  if (!conversation.unreadCount) return 0
  const userId = authStore.user?._id || authStore.user?.id
  const userIdStr = userId?.toString()
  
  // Handle both Map and plain object
  if (conversation.unreadCount instanceof Map) {
    return conversation.unreadCount.get(userIdStr) || 0
  } else if (typeof conversation.unreadCount === 'object') {
    return conversation.unreadCount[userIdStr] || 0
  }
  return 0
}

const formatTime = (date) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    const now = new Date()
    const diff = now - d
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  } catch (e) {
    return ''
  }
}

onMounted(() => {
  fetchConversations()
  
  // Set up Socket.IO for real-time DM updates
  const apiUrl = import.meta.env.VITE_API_URL || ''
  socket.value = io(apiUrl, {
    auth: {
      token: authStore.token,
      userId: authStore.user?.id
    }
  })
  
  socket.value.on('connect', () => {
    console.log('🔌 DM Socket connected')
  })
  
  socket.value.on('dm_message', (data) => {
    console.log('💬 DM message received:', data)
    
    // Update conversation list
    const convId = data.conversation?._id?.toString() || data.conversation?._id || data.conversation
    const convIndex = conversations.value.findIndex(c => {
      const cId = c._id?.toString() || c._id
      return cId === convId
    })
    
    if (convIndex >= 0) {
      // Update existing conversation
      const updatedConv = {
        ...conversations.value[convIndex],
        ...data.conversation,
        lastMessage: data.message,
        lastMessageAt: data.message?.createdAt || new Date()
      }
      // Move to top
      conversations.value.splice(convIndex, 1)
      conversations.value.unshift(updatedConv)
    } else {
      // New conversation, add to top
      conversations.value.unshift({
        ...data.conversation,
        lastMessage: data.message,
        lastMessageAt: data.message?.createdAt || new Date()
      })
    }
    
    // Update unread DM count immediately from socket data (no need to refetch)
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId?.toString()
    if (data.conversation?.unreadCount) {
      // Update the unread count in the conversation
      const currentConv = conversations.value.find(c => {
        const cId = c._id?.toString() || c._id
        return cId === convId
      })
      if (currentConv) {
        if (typeof data.conversation.unreadCount === 'object' && !Array.isArray(data.conversation.unreadCount)) {
          currentConv.unreadCount = data.conversation.unreadCount
        }
      }
    }
    
    // Don't refetch - socket data is sufficient and avoids rate limiting
  })
  
  socket.value.on('dm_unread_update', (data) => {
    console.log('💬 DM unread update received:', data)
    // Update conversation unread count directly from socket data (no refetch needed)
    if (data.conversationId) {
      const convId = data.conversationId?.toString() || data.conversationId
      const convIndex = conversations.value.findIndex(c => {
        const cId = c._id?.toString() || c._id
        return cId === convId
      })
      
      if (convIndex >= 0 && data.unreadCount) {
        const userId = authStore.user?._id || authStore.user?.id
        const userIdStr = userId?.toString()
        
        // Update unread count directly
        if (typeof data.unreadCount === 'object' && !Array.isArray(data.unreadCount)) {
          conversations.value[convIndex].unreadCount = data.unreadCount
        } else if (typeof data.unreadCount === 'number' && data.participantId === userIdStr) {
          // If unreadCount is a number and it's for this user, update it
          if (!conversations.value[convIndex].unreadCount) {
            conversations.value[convIndex].unreadCount = {}
          }
          if (typeof conversations.value[convIndex].unreadCount === 'object') {
            conversations.value[convIndex].unreadCount[userIdStr] = data.unreadCount
          }
        }
      }
    }
    // Don't refetch - socket data is sufficient
  })
})

onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.disconnect()
  }
})
</script>

<style scoped>
.direct-messages {
  padding: var(--space-4);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 3px solid var(--color-text);
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.conversation-item:hover {
  background: var(--color-bg-alt);
}

.conversation-item.active {
  background: var(--bauhaus-blue);
  color: white;
}

.conversation-avatar {
  width: 48px;
  height: 48px;
  border-radius: 0;
  border: 2px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  flex-shrink: 0;
  font-size: var(--text-lg);
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-1);
}

.conversation-name {
  font-weight: 700;
  font-size: var(--text-sm);
  text-transform: uppercase;
}

.unread-badge {
  background: var(--matisse-red);
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.conversation-preview {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: var(--space-1);
}

.conversation-time {
  font-size: 10px;
  color: var(--color-text-muted);
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
}

.modal-content {
  background: var(--color-bg);
  border: 3px solid var(--color-text);
  border-radius: var(--radius-md);
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 2px solid var(--color-text);
}

.modal-body {
  padding: var(--space-4);
  flex: 1;
  overflow-y: auto;
}

.user-search-results {
  margin-top: var(--space-3);
}

.user-result-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.user-result-item:hover {
  background: var(--color-bg-alt);
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 0;
  border: 2px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  flex-shrink: 0;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 700;
  font-size: var(--text-sm);
}

.user-email {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>

