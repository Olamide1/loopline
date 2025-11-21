<template>
  <div class="dm-chat">
    <div class="dm-chat-header">
      <div class="dm-chat-header-left">
        <div class="dm-avatar">
          {{ otherUser?.name?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div>
          <h3 class="dm-user-name">{{ otherUser?.name || 'Unknown' }}</h3>
          <p v-if="otherUser?.email" class="dm-user-email">{{ otherUser.email }}</p>
        </div>
      </div>
      <button @click="goBackToDMList" class="btn btn-secondary">← Back</button>
    </div>
    
    <div class="dm-messages-container" ref="messagesContainer">
      <div v-if="loading" class="loading">Loading messages...</div>
      <div v-else-if="messages.length === 0" class="empty-state">
        <p>No messages yet. Start the conversation!</p>
      </div>
      <div
        v-for="message in messages"
        :key="message._id"
        class="dm-message-item"
        :class="{ 'is-sent': isSentByMe(message) }"
      >
        <div v-if="!isSentByMe(message)" class="dm-message-avatar">
          {{ message.sender?.name?.charAt(0)?.toUpperCase() || 'U' }}
        </div>
        <div class="dm-message-content">
          <div class="dm-message-header">
            <span v-if="!isSentByMe(message)" class="dm-message-author">{{ message.sender?.name || 'Unknown' }}</span>
            <span class="dm-message-time">{{ formatTime(message.createdAt) }}</span>
            <span v-if="message.read && isSentByMe(message)" class="dm-read-indicator">✓✓</span>
          </div>
          <div class="dm-message-text" v-html="formatMessageText(message)"></div>
          <!-- URL Preview -->
          <div v-if="getFirstUrl(message.text)" class="url-preview-card" @click.stop>
            <a :href="getFirstUrl(message.text)" target="_blank" rel="noopener noreferrer" class="url-preview-link">
              <div class="url-preview-content">
                <div class="url-preview-title" :title="getFirstUrl(message.text)">{{ truncateUrl(getFirstUrl(message.text), 50) }}</div>
                <div class="url-preview-domain">{{ getUrlDomain(getFirstUrl(message.text)) }}</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
    
    <div class="dm-input-container">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        class="input"
        placeholder="Type a message..."
        style="flex: 1;"
      />
      <button @click="sendMessage" class="btn btn-accent">Send</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { io } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspaceId = route.params.workspaceId
const conversationId = route.params.conversationId

const goBackToDMList = () => {
  router.push(`/workspace/${workspaceId}/dm`)
}
const messages = ref([])
const newMessage = ref('')
const loading = ref(true)
const error = ref('')
const otherUser = ref(null)
const conversation = ref(null)
const messagesContainer = ref(null)
const socket = ref(null)

const fetchConversation = async () => {
  loading.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // First get conversation details
    const conversationsResponse = await axios.get(`${apiUrl}/api/direct-messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const conversations = Array.isArray(conversationsResponse.data) ? conversationsResponse.data : []
    conversation.value = conversations.find(c => c._id === conversationId)
    
    if (!conversation.value) {
      error.value = 'Conversation not found'
      loading.value = false
      return
    }
    
    // Get other participant
    const userId = authStore.user?._id || authStore.user?.id
    otherUser.value = conversation.value.participants?.find(
      p => (p._id || p.id || p)?.toString() !== userId?.toString()
    )
    
    // Fetch messages
    const messagesResponse = await axios.get(`${apiUrl}/api/direct-messages/conversation/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    messages.value = Array.isArray(messagesResponse.data) ? messagesResponse.data : []
    
    scrollToBottom()
  } catch (error) {
    console.error('❌ Failed to fetch conversation:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim()) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.post(`${apiUrl}/api/direct-messages/conversation/${conversationId}/message`, {
      text: newMessage.value.trim()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    messages.value.push(response.data)
    newMessage.value = ''
    scrollToBottom()
  } catch (error) {
    console.error('❌ Failed to send message:', error)
  }
}

const isSentByMe = (message) => {
  const userId = authStore.user?._id || authStore.user?.id
  const senderId = message.sender?._id || message.sender
  return userId?.toString() === senderId?.toString()
}

const formatTime = (date) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}

const cleanTrailingPunctuation = (url) => {
  if (!url) return url
  // Remove trailing punctuation that's not part of the URL
  // Common punctuation: . , ! ? ; : ) ] }
  // But preserve punctuation that's part of URLs (like /, ?, &, = in query strings)
  // Only remove trailing punctuation at the very end
  return url.replace(/[.,!?;:)\]}]+$/, '')
}

const getFirstUrl = (text) => {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/i
  const match = text.match(urlRegex)
  if (!match) return null
  let url = cleanTrailingPunctuation(match[0])
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url
  }
  return url
}

const getUrlDomain = (url) => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch (e) {
    return url
  }
}

const truncateUrl = (url, maxLength) => {
  if (!url) return ''
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

const formatMessageText = (message) => {
  if (!message.text) return ''
  
  // Escape HTML first to prevent XSS
  const div = document.createElement('div')
  div.textContent = message.text
  let escaped = div.innerHTML
  
  // URL regex pattern - matches http, https, www, and common domains
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}[^\s]*)/gi
  
  // Extract URLs and replace with clickable links
  escaped = escaped.replace(urlRegex, (url) => {
    // Clean trailing punctuation from URL
    const cleanedUrl = cleanTrailingPunctuation(url)
    // Add protocol if missing
    let href = cleanedUrl
    if (!cleanedUrl.startsWith('http://') && !cleanedUrl.startsWith('https://')) {
      href = 'https://' + cleanedUrl
    }
    // Escape URL for use in href attribute
    const escapedUrl = href.replace(/"/g, '&quot;')
    // Display the cleaned URL but preserve original formatting in text
    return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="dm-message-link">${cleanedUrl}</a>`
  })
  
  return escaped
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const setupSocket = () => {
  if (!conversationId) return
  if (socket.value) {
    socket.value.disconnect()
  }
  
  const apiUrl = import.meta.env.VITE_API_URL || ''
  socket.value = io(apiUrl, {
    auth: {
      token: authStore.token,
      userId: authStore.user?.id
    }
  })
  
  socket.value.on('connect', () => {
    console.log('🔌 DM Socket connected')
    // Ensure we're in the user room (already joined on connection, but verify)
    const userId = authStore.user?.id || authStore.user?._id
    if (userId) {
      socket.value.emit('join_workspace', workspaceId) // Join workspace for presence
    }
  })
  
  socket.value.on('dm_message', (data) => {
    console.log('💬 DM message received in chat view:', data)
    
    // Normalize conversation ID comparison
    const dataConvId = data.conversation?._id?.toString() || data.conversation?._id || data.conversation
    const currentConvId = conversationId?.toString() || conversationId
    
    if (dataConvId === currentConvId) {
      if (!messages.value.find(m => m._id === data.message._id)) {
        // Ensure message has all required fields
        const newMessage = {
          ...data.message,
          sender: data.message.sender || data.message.user,
          read: data.message.read || false,
          createdAt: data.message.createdAt || new Date()
        }
        messages.value.push(newMessage)
        console.log('✅ Added DM message to chat view:', newMessage._id)
        scrollToBottom()
      } else {
        console.log('⚠️ DM message already exists, skipping')
      }
    } else {
      console.log('⚠️ DM message is for different conversation:', dataConvId, 'current:', currentConvId)
    }
  })
}

onMounted(async () => {
  await fetchConversation()
  setupSocket()
})

watch(() => route.params.conversationId, async (newId) => {
  if (newId) {
    await fetchConversation()
    setupSocket()
  }
})
</script>

<style scoped>
.dm-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dm-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 3px solid var(--color-text);
  background: var(--color-bg);
}

.dm-chat-header-left {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.dm-avatar {
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
  font-size: var(--text-lg);
}

.dm-user-name {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.dm-user-email {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.dm-messages-container {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dm-message-item {
  display: flex;
  gap: var(--space-3);
  max-width: 70%;
}

.dm-message-item.is-sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.dm-message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 0;
  border: 2px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  flex-shrink: 0;
  font-size: var(--text-xs);
}

.dm-message-content {
  background: var(--color-bg-alt);
  border: 2px solid var(--color-text);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
}

.dm-message-item.is-sent .dm-message-content {
  background: var(--bauhaus-blue);
  color: white;
}

.dm-message-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  align-items: baseline;
}

.dm-message-author {
  font-weight: 700;
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.dm-message-time {
  font-size: 10px;
  color: var(--color-text-muted);
}

.dm-message-item.is-sent .dm-message-time {
  color: rgba(255, 255, 255, 0.7);
}

.dm-read-indicator {
  font-size: 10px;
  color: var(--color-text-muted);
  margin-left: auto;
}

.dm-message-text {
  font-size: var(--text-sm);
  line-height: 1.5;
}

.dm-message-link {
  color: var(--bauhaus-blue);
  text-decoration: underline;
  word-break: break-all;
}

.dm-message-item.is-sent .dm-message-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
}

.dm-input-container {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-top: 3px solid var(--color-text);
  background: var(--color-bg);
}

.loading, .error {
  text-align: center;
  padding: var(--space-5);
  font-size: var(--text-lg);
  font-weight: 700;
}

.error {
  color: var(--matisse-red);
}

/* URL Preview */
.url-preview-card {
  margin-top: var(--space-2);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg);
  max-width: 400px;
}

.url-preview-link {
  display: flex;
  text-decoration: none;
  color: inherit;
  transition: all var(--transition-fast);
}

.url-preview-link:hover {
  background: var(--color-bg-alt);
}

.url-preview-content {
  flex: 1;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.url-preview-title {
  font-weight: 700;
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.4;
}

.url-preview-domain {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dm-message-item.is-sent .url-preview-card {
  margin-left: auto;
}

@media (max-width: 768px) {
  .url-preview-card {
    max-width: 100%;
  }
}
</style>

