<template>
  <div class="channel">
    <div class="channel-header">
      <div class="channel-header-left">
        <h2 class="heading-2"># {{ channel?.name }}</h2>
        <p v-if="channel?.description" class="text-muted" style="margin-top: var(--space-2);">{{ channel.description }}</p>
      </div>
      <button @click="showSearch = true" class="btn-icon" title="Search messages">
        🔍
      </button>
    </div>
    
    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <p class="empty-text">No messages yet. Start the conversation!</p>
      </div>
      <div
        v-for="message in messages"
        :key="message._id"
        :data-message-id="message._id"
        class="message-item"
        :class="{ 'is-thread-reply': message.threadParent, 'message-deleted': message.deleted }"
      >
        <div class="message-avatar">
          <div class="avatar-circle">
            {{ message.user?.name?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
        </div>
        <div class="message-content" @mouseenter="showMessageActions(message._id)" @mouseleave="hideMessageActions(message._id)">
          <div class="message-header">
            <span class="message-author">{{ message.user?.name || 'Unknown' }}</span>
            <span v-if="formatTime(message.createdAt)" class="message-time">{{ formatTime(message.createdAt) }}</span>
            <span v-if="message.edited" class="message-edited">(edited)</span>
          </div>
          <div v-if="editingMessageId === message._id" class="message-edit-form">
            <input
              v-model="editMessageText"
              @keyup.enter="saveEdit(message)"
              @keyup.esc="cancelEdit"
              class="input"
              style="font-size: var(--text-sm); padding: var(--space-2);"
              ref="editInput"
            />
            <div class="edit-actions">
              <button @click="saveEdit(message)" class="btn btn-accent" style="padding: var(--space-1) var(--space-2); font-size: var(--text-xs);">Save</button>
              <button @click="cancelEdit" class="btn btn-secondary" style="padding: var(--space-1) var(--space-2); font-size: var(--text-xs);">Cancel</button>
            </div>
          </div>
          <div v-else-if="message.text" class="message-text" v-html="formatMessageText(message)"></div>
          <div v-if="message.files?.length" class="message-files">
            <div v-for="file in message.files" :key="file.driveFileId" class="file-item">
              <a :href="file.driveUrl" target="_blank">{{ file.name }}</a>
            </div>
          </div>
          
          <!-- Reactions -->
          <div v-if="message.reactions && message.reactions.length > 0" class="message-reactions">
            <button
              v-for="reaction in message.reactions"
              :key="reaction.emoji"
              @click="toggleReaction(message, reaction.emoji)"
              class="reaction-button"
              :class="{ 'has-reacted': hasUserReacted(reaction, authStore.user?._id) }"
            >
              <span class="reaction-emoji">{{ reaction.emoji }}</span>
              <span class="reaction-count">{{ reaction.users?.length || 0 }}</span>
            </button>
            <button @click="showReactionPicker(message)" class="reaction-add-btn" title="Add reaction">
              +
            </button>
          </div>
          
          <!-- Reaction Picker -->
          <div v-if="showReactionPickerFor === message._id" class="reaction-picker">
            <button
              v-for="emoji in commonReactions"
              :key="emoji"
              @click="addReaction(message, emoji)"
              class="reaction-picker-item"
            >
              {{ emoji }}
            </button>
          </div>
          
          <!-- Message Actions Menu -->
          <div v-if="showActionsFor === message._id && !message.deleted" class="message-actions-menu">
            <button v-if="canEditMessage(message)" @click="startEdit(message)" class="message-menu-btn" title="Edit">
              ✏️ Edit
            </button>
            <button v-if="canDeleteMessage(message)" @click="confirmDelete(message)" class="message-menu-btn message-menu-btn-danger" title="Delete">
              🗑️ Delete
            </button>
          </div>
          
          <!-- Message Actions -->
          <div v-if="!message.threadParent" class="message-actions">
            <button @click="toggleThread(message)" class="message-action-btn" title="Reply">
              💬 {{ getThreadCount(message) || 0 }}
            </button>
            <button v-if="!message.reactions || message.reactions.length === 0" @click="showReactionPicker(message)" class="message-action-btn" title="Add reaction">
              😀
            </button>
            <button v-if="canEditMessage(message) || canDeleteMessage(message)" @click.stop="toggleMessageActions(message._id)" class="message-action-btn" title="More">
              ⋮
            </button>
          </div>
          
          <!-- Thread Replies -->
          <div v-if="expandedThreads[message._id]" class="thread-replies">
            <div v-if="threadReplies[message._id]?.length > 0" class="thread-list">
              <div
                v-for="reply in threadReplies[message._id]"
                :key="reply._id"
                class="thread-reply-item"
              >
                <div class="thread-reply-avatar">
                  {{ reply.user?.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div class="thread-reply-content">
                  <div class="thread-reply-header">
                    <span class="thread-reply-author">{{ reply.user?.name || 'Unknown' }}</span>
                    <span v-if="formatTime(reply.createdAt)" class="thread-reply-time">{{ formatTime(reply.createdAt) }}</span>
                  </div>
                  <div class="thread-reply-text" v-html="formatMessageText(reply)"></div>
                </div>
              </div>
            </div>
            
            <!-- Thread Reply Input -->
            <div class="thread-reply-input">
              <input
                v-model="threadInputs[message._id]"
                @keyup.enter="sendThreadReply(message)"
                class="input"
                placeholder="Reply to thread..."
                style="font-size: var(--text-sm); padding: var(--space-2);"
              />
              <button @click="sendThreadReply(message)" class="btn btn-accent" style="padding: var(--space-2) var(--space-3); font-size: var(--text-xs);">
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="message-input-container">
      <div style="position: relative; flex: 1;">
        <input
          ref="messageInput"
          v-model="newMessage"
          @keyup.enter="handleEnterKey"
          @keyup="handleInputKeyup"
          @input="handleInput"
          class="input"
          placeholder="Type a message..."
          style="width: 100%;"
        />
        <!-- Mention Autocomplete -->
        <div v-if="showMentionAutocomplete && mentionSuggestions.length > 0" class="mention-autocomplete">
          <div
            v-for="(user, index) in mentionSuggestions"
            :key="user._id || user.id"
            :class="['mention-item', { active: selectedMentionIndex === index }]"
            @click="selectMention(user)"
            @mouseenter="selectedMentionIndex = index"
          >
            <div class="mention-avatar">
              {{ user.name?.charAt(0)?.toUpperCase() || 'U' }}
            </div>
            <div class="mention-info">
              <div class="mention-name">{{ user.name }}</div>
              <div class="mention-email">{{ user.email }}</div>
            </div>
          </div>
        </div>
      </div>
      <button @click="sendMessage" class="btn btn-accent">Send</button>
    </div>
    
    <!-- Search Modal -->
    <div v-if="showSearch" class="search-modal" @click.self="showSearch = false">
      <div class="search-modal-content" @click.stop>
        <div class="search-header">
          <h3>Search Messages</h3>
          <button @click="showSearch = false" class="btn-close">×</button>
        </div>
        <div class="search-input-container">
          <input
            v-model="searchQuery"
            @input="performSearch"
            @keyup.esc="showSearch = false"
            class="input"
            placeholder="Search messages..."
            ref="searchInput"
          />
        </div>
        <div v-if="searching" class="search-loading">Searching...</div>
        <div v-if="!searching && searchResults.length > 0" class="search-results">
          <div
            v-for="result in searchResults"
            :key="result._id"
            class="search-result-item"
            @click="navigateToMessage(result)"
          >
            <div class="search-result-header">
              <span class="search-result-author">{{ result.user?.name || 'Unknown' }}</span>
              <span class="search-result-channel">#{{ result.channel?.name || 'channel' }}</span>
              <span class="search-result-time">{{ formatTime(result.createdAt) }}</span>
            </div>
            <div class="search-result-text" v-html="highlightSearchText(result.text, searchQuery)"></div>
          </div>
        </div>
        <div v-if="!searching && searchQuery && searchResults.length === 0" class="search-empty">
          No messages found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const channel = ref(null)
const messages = ref([])
const newMessage = ref('')
const messagesContainer = ref(null)
const socket = ref(null)
const messageInput = ref(null)
const workspace = ref(null)
const workspaceMembers = ref([])

// Message editing/deleting
const editingMessageId = ref(null)
const editMessageText = ref('')
const editInput = ref(null)
const showActionsFor = ref(null)
const deletingMessageId = ref(null)

// Typing indicators
const typingUsers = ref([])
const typingTimeout = ref({})
const typingTimer = ref(null)

// Search
const showSearch = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)

// Mention autocomplete
const showMentionAutocomplete = ref(false)
const mentionSuggestions = ref([])
const selectedMentionIndex = ref(0)
const mentionStartPos = ref(-1)

// Threads
const expandedThreads = ref({})
const threadReplies = ref({})
const threadInputs = ref({})
const loadingThreads = ref({})

// Reactions
const showReactionPickerFor = ref(null)
const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏']

// Make channelId reactive to route changes
const channelId = computed(() => route.params.channelId)

// Load channel data when component mounts or channelId changes
const loadChannelData = async () => {
  if (!channelId.value) return
  
  // Clear previous data
  channel.value = null
  messages.value = []
  
  // Disconnect old socket
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
  
  // Load new channel data
  await fetchChannel()
  await fetchWorkspace()
  await fetchMessages()
  setupSocket()
}

onMounted(async () => {
  await loadChannelData()
})

// Watch for channel changes
watch(channelId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await loadChannelData()
  }
})

const fetchChannel = async () => {
  if (!channelId.value) return
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/channels/${channelId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    channel.value = response.data
  } catch (error) {
    console.error('❌ Failed to fetch channel:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

const fetchWorkspace = async () => {
  if (!channel.value?.workspace) return
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/workspaces/${channel.value.workspace}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    workspace.value = response.data
    
    // Build members list for autocomplete
    workspaceMembers.value = []
    if (workspace.value.admin) {
      workspaceMembers.value.push({
        _id: workspace.value.admin._id || workspace.value.admin,
        name: workspace.value.admin.name,
        email: workspace.value.admin.email,
        avatar: workspace.value.admin.avatar
      })
    }
    if (workspace.value.members) {
      workspace.value.members.forEach(member => {
        const user = member.user || member
        if (user && user._id) {
          workspaceMembers.value.push({
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          })
        }
      })
    }
  } catch (error) {
    console.error('❌ Failed to fetch workspace:', error)
  }
}

const fetchMessages = async () => {
  if (!channelId.value) return
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/messages/channel/${channelId.value}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const fetchedMessages = Array.isArray(response.data) ? response.data : []
    
    // Filter out thread replies from main messages (only show parent messages)
    const parentMessages = fetchedMessages.filter(msg => !msg.threadParent)
    
    // Populate mentions if not already populated
    messages.value = parentMessages.map(msg => {
      if (msg.mentions && msg.mentions.length > 0 && typeof msg.mentions[0] === 'string') {
        // Mentions are just IDs, need to populate - but we'll handle in display
        return msg
      }
      return msg
    })
    
    // Populate reactions if needed
    messages.value = messages.value.map(msg => ({
      ...msg,
      reactions: msg.reactions || []
    }))
    
    scrollToBottom()
  } catch (error) {
    console.error('❌ Failed to fetch messages:', error)
    messages.value = []
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

const getThreadCount = (message) => {
  // This will be updated when we fetch threads
  return message.threadCount || 0
}

const toggleThread = async (message) => {
  const messageId = message._id
  if (expandedThreads.value[messageId]) {
    expandedThreads.value[messageId] = false
  } else {
    expandedThreads.value[messageId] = true
    await fetchThreadReplies(messageId)
  }
}

const fetchThreadReplies = async (messageId) => {
  if (loadingThreads.value[messageId]) return
  
  loadingThreads.value[messageId] = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/messages/thread/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    threadReplies.value[messageId] = Array.isArray(response.data) ? response.data : []
    
    // Update thread count on parent message
    const parentMessage = messages.value.find(m => m._id === messageId)
    if (parentMessage) {
      parentMessage.threadCount = threadReplies.value[messageId].length
    }
    
    // Join thread room for real-time updates
    if (socket.value) {
      socket.value.emit('join_thread', messageId)
    }
  } catch (error) {
    console.error('❌ Failed to fetch thread replies:', error)
    threadReplies.value[messageId] = []
  } finally {
    loadingThreads.value[messageId] = false
  }
}

const sendThreadReply = async (parentMessage) => {
  const replyText = threadInputs.value[parentMessage._id]?.trim()
  if (!replyText || !channelId.value) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.post(`${apiUrl}/api/messages`, {
      channel: channelId.value,
      text: replyText,
      threadParent: parentMessage._id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Thread reply sent:', response.data)
    
    // Add to thread replies
    if (!threadReplies.value[parentMessage._id]) {
      threadReplies.value[parentMessage._id] = []
    }
    threadReplies.value[parentMessage._id].push(response.data)
    
    // Update thread count
    const parent = messages.value.find(m => m._id === parentMessage._id)
    if (parent) {
      parent.threadCount = (parent.threadCount || 0) + 1
    }
    
    // Clear input
    threadInputs.value[parentMessage._id] = ''
  } catch (error) {
    console.error('❌ Failed to send thread reply:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

const showReactionPicker = (message) => {
  showReactionPickerFor.value = showReactionPickerFor.value === message._id ? null : message._id
}

const toggleReaction = async (message, emoji) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Add or remove reaction (backend handles toggling)
    await axios.post(`${apiUrl}/api/messages/${message._id}/reaction`, {
      emoji
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // Real-time update will come via Socket.IO 'reaction_updated' event
    // No need to manually refresh here
  } catch (error) {
    console.error('❌ Failed to toggle reaction:', error)
  }
}

const addReaction = async (message, emoji) => {
  showReactionPickerFor.value = null
  await toggleReaction(message, emoji)
}

const hasUserReacted = (reaction, userId) => {
  if (!reaction || !reaction.users || !userId) return false
  return reaction.users.some(u => {
    const userIdStr = userId.toString()
    const uIdStr = (u._id || u).toString()
    return uIdStr === userIdStr
  })
}

const setupSocket = () => {
  if (!channelId.value) return
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
    console.log('🔌 Socket connected, joining channel:', channelId.value)
    socket.value.emit('join_channel', channelId.value)
  })
  
  socket.value.on('disconnect', () => {
    console.log('🔌 Socket disconnected')
  })
  
  socket.value.on('error', (error) => {
    console.error('❌ Socket error:', error)
  })
  
  socket.value.on('message_created', (message) => {
    // Only add if it's for this channel and not a thread reply
    if (message.channel === channelId.value || message.channel?._id === channelId.value) {
      if (!message.threadParent && !messages.value.find(m => m._id === message._id)) {
        messages.value.push(message)
        scrollToBottom()
      }
    }
  })
  
  socket.value.on('thread_reply_created', (reply) => {
    // Add thread reply to the appropriate thread
    const parentId = reply.threadParent?._id || reply.threadParent
    if (parentId && threadReplies.value[parentId]) {
      // Check if reply already exists
      if (!threadReplies.value[parentId].find(r => r._id === reply._id)) {
        threadReplies.value[parentId].push(reply)
        
        // Update thread count on parent message
        const parent = messages.value.find(m => m._id === parentId)
        if (parent) {
          parent.threadCount = (parent.threadCount || 0) + 1
        }
      }
    }
  })
  
  socket.value.on('message_updated', (message) => {
    // Update message in messages array
    const index = messages.value.findIndex(m => m._id === message._id)
    if (index >= 0) {
      messages.value[index] = message
    }
    
    // Update in thread replies if it's a thread reply
    for (const threadId in threadReplies.value) {
      const threadIndex = threadReplies.value[threadId].findIndex(m => m._id === message._id)
      if (threadIndex >= 0) {
        threadReplies.value[threadId][threadIndex] = message
      }
    }
  })
  
  socket.value.on('reaction_updated', (data) => {
    // Update message reactions in messages array
    const index = messages.value.findIndex(m => m._id === data._id)
    if (index >= 0) {
      // Create a new object to trigger Vue reactivity
      messages.value[index] = {
        ...messages.value[index],
        reactions: data.reactions || []
      }
    }
    
    // Update in thread replies if it's a thread reply
    for (const threadId in threadReplies.value) {
      const threadIndex = threadReplies.value[threadId].findIndex(m => m._id === data._id)
      if (threadIndex >= 0) {
        threadReplies.value[threadId][threadIndex] = {
          ...threadReplies.value[threadId][threadIndex],
          reactions: data.reactions || []
        }
      }
    }
  })
  
  // Typing indicators
  socket.value.on('user_typing', (data) => {
    if (data.channel === channelId.value && data.userId !== authStore.user?._id) {
      const userName = workspaceMembers.value.find(m => (m._id || m.id) === data.userId)?.name || 'Someone'
      if (!typingUsers.value.find(u => u.id === data.userId)) {
        typingUsers.value.push({ id: data.userId, name: userName })
      }
      
      // Clear typing after 3 seconds
      clearTimeout(typingTimeout.value[data.userId])
      typingTimeout.value[data.userId] = setTimeout(() => {
        typingUsers.value = typingUsers.value.filter(u => u.id !== data.userId)
        delete typingTimeout.value[data.userId]
      }, 3000)
    }
  })
  
  socket.value.on('user_stopped_typing', (data) => {
    if (data.channel === channelId.value) {
      typingUsers.value = typingUsers.value.filter(u => u.id !== data.userId)
      if (typingTimeout.value[data.userId]) {
        clearTimeout(typingTimeout.value[data.userId])
        delete typingTimeout.value[data.userId]
      }
    }
  })
}

// Message editing/deleting functions
const canEditMessage = (message) => {
  if (!message || !authStore.user) return false
  const userId = authStore.user._id || authStore.user.id
  const messageUserId = message.user?._id || message.user
  return userId?.toString() === messageUserId?.toString()
}

const canDeleteMessage = (message) => {
  if (!message || !authStore.user || !workspace.value) return false
  const userId = authStore.user._id || authStore.user.id
  const messageUserId = message.user?._id || message.user
  
  // User can delete their own messages
  if (userId?.toString() === messageUserId?.toString()) return true
  
  // Admin can delete any message
  const adminId = workspace.value.admin?._id || workspace.value.admin
  return adminId?.toString() === userId?.toString()
}

const showMessageActions = (messageId) => {
  // Show actions on hover
}

const hideMessageActions = (messageId) => {
  // Hide actions after delay
  setTimeout(() => {
    if (showActionsFor.value === messageId) {
      showActionsFor.value = null
    }
  }, 200)
}

const toggleMessageActions = (messageId) => {
  showActionsFor.value = showActionsFor.value === messageId ? null : messageId
}

const startEdit = (message) => {
  editingMessageId.value = message._id
  editMessageText.value = message.text
  showActionsFor.value = null
  nextTick(() => {
    if (editInput.value) {
      editInput.value.focus()
    }
  })
}

const cancelEdit = () => {
  editingMessageId.value = null
  editMessageText.value = ''
}

const saveEdit = async (message) => {
  if (!editMessageText.value.trim()) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.patch(`${apiUrl}/api/messages/${message._id}`, {
      text: editMessageText.value.trim()
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // Update message in messages array
    const index = messages.value.findIndex(m => m._id === message._id)
    if (index >= 0) {
      messages.value[index] = response.data
    }
    
    // Update in thread replies if it's a thread reply
    for (const threadId in threadReplies.value) {
      const threadIndex = threadReplies.value[threadId].findIndex(m => m._id === message._id)
      if (threadIndex >= 0) {
        threadReplies.value[threadId][threadIndex] = response.data
      }
    }
    
    // Broadcast via socket
    if (socket.value) {
      socket.value.emit('update_message', {
        messageId: message._id,
        text: editMessageText.value.trim()
      })
    }
    
    cancelEdit()
  } catch (error) {
    console.error('❌ Failed to edit message:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

const confirmDelete = (message) => {
  if (confirm('Are you sure you want to delete this message?')) {
    deleteMessage(message)
  }
  showActionsFor.value = null
}

const deleteMessage = async (message) => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    await axios.delete(`${apiUrl}/api/messages/${message._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // Remove from messages array
    messages.value = messages.value.filter(m => m._id !== message._id)
    
    // Remove from thread replies
    for (const threadId in threadReplies.value) {
      threadReplies.value[threadId] = threadReplies.value[threadId].filter(m => m._id !== message._id)
    }
  } catch (error) {
    console.error('❌ Failed to delete message:', error)
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

// Typing indicator functions
const typingUsersText = computed(() => {
  if (typingUsers.value.length === 0) return ''
  if (typingUsers.value.length === 1) {
    return `${typingUsers.value[0].name} is typing...`
  }
  if (typingUsers.value.length === 2) {
    return `${typingUsers.value[0].name} and ${typingUsers.value[1].name} are typing...`
  }
  return `${typingUsers.value[0].name} and ${typingUsers.value.length - 1} others are typing...`
})

const handleTyping = () => {
  if (!socket.value || !channelId.value) return
  
  // Emit typing event
  socket.value.emit('typing', { channel: channelId.value })
  
  // Clear existing timer
  if (typingTimer) {
    clearTimeout(typingTimer)
  }
  
  // Set timer to stop typing after 3 seconds of inactivity
  typingTimer = setTimeout(() => {
    handleStopTyping()
  }, 3000)
}

const handleStopTyping = () => {
  if (!socket.value || !channelId.value) return
  
  socket.value.emit('stop_typing', { channel: channelId.value })
  
  if (typingTimer) {
    clearTimeout(typingTimer)
    typingTimer = null
  }
}

// Search functions
const performSearch = async () => {
  if (!searchQuery.value.trim() || searchQuery.value.length < 2) {
    searchResults.value = []
    return
  }
  
  searching.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/search`, {
      params: {
        q: searchQuery.value,
        workspaceId: workspace.value?._id || workspace.value?.id
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    searchResults.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('❌ Search failed:', error)
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

const highlightSearchText = (text, query) => {
  if (!text || !query) return text
  const escapedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const regex = new RegExp(`(${query})`, 'gi')
  return escapedText.replace(regex, '<mark>$1</mark>')
}

const navigateToMessage = (message) => {
  // Navigate to the channel and scroll to message
  if (message.channel?._id || message.channel) {
    const msgChannelId = message.channel._id || message.channel
    // If already in the channel, just scroll
    if (msgChannelId === channelId.value) {
      // Scroll to message
      nextTick(() => {
        const messageEl = document.querySelector(`[data-message-id="${message._id}"]`)
        if (messageEl) {
          messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
          messageEl.classList.add('highlight-message')
          setTimeout(() => {
            messageEl.classList.remove('highlight-message')
          }, 2000)
        }
      })
    } else {
      // Navigate to channel
      window.location.href = `/workspace/${workspace.value?._id || workspace.value?.id}/channel/${msgChannelId}`
    }
  }
  showSearch.value = false
}

const handleInput = () => {
  const text = newMessage.value
  const cursorPos = messageInput.value?.selectionStart || text.length
  const textBeforeCursor = text.substring(0, cursorPos)
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  if (lastAtIndex !== -1) {
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    // Check if we're still in a mention (no space after @)
    if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
      mentionStartPos.value = lastAtIndex
      const query = textAfterAt.toLowerCase()
      filterMentionSuggestions(query)
      showMentionAutocomplete.value = true
      selectedMentionIndex.value = 0
      return
    }
  }
  
  showMentionAutocomplete.value = false
}

const filterMentionSuggestions = (query) => {
  if (!query) {
    mentionSuggestions.value = workspaceMembers.value.filter(m => 
      m._id !== authStore.user?._id
    )
  } else {
    mentionSuggestions.value = workspaceMembers.value.filter(member => {
      if (member._id === authStore.user?._id) return false
      const name = (member.name || '').toLowerCase()
      const email = (member.email || '').toLowerCase()
      return name.startsWith(query) || email.startsWith(query)
    })
  }
}

const selectMention = (user) => {
  if (!messageInput.value) return
  
  const text = newMessage.value
  const beforeMention = text.substring(0, mentionStartPos.value)
  const afterMention = text.substring(messageInput.value.selectionStart || text.length)
  
  newMessage.value = `${beforeMention}@${user.name} ${afterMention}`
  showMentionAutocomplete.value = false
  
  // Focus input and set cursor position
  nextTick(() => {
    if (messageInput.value) {
      const newPos = mentionStartPos.value + user.name.length + 2 // +2 for @ and space
      messageInput.value.focus()
      messageInput.value.setSelectionRange(newPos, newPos)
    }
  })
}

const handleInputKeyup = (event) => {
  if (showMentionAutocomplete.value) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      selectedMentionIndex.value = Math.min(
        selectedMentionIndex.value + 1,
        mentionSuggestions.value.length - 1
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0)
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      if (mentionSuggestions.value[selectedMentionIndex.value]) {
        selectMention(mentionSuggestions.value[selectedMentionIndex.value])
      }
    } else if (event.key === 'Escape') {
      showMentionAutocomplete.value = false
    }
  }
}

const handleEnterKey = (event) => {
  if (!showMentionAutocomplete.value) {
    sendMessage()
  } else {
    event.preventDefault()
    if (mentionSuggestions.value[selectedMentionIndex.value]) {
      selectMention(mentionSuggestions.value[selectedMentionIndex.value])
    }
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !channelId.value) return
  
  const messageText = newMessage.value.trim()
  newMessage.value = ''
  showMentionAutocomplete.value = false
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.post(`${apiUrl}/api/messages`, {
      channel: channelId.value,
      text: messageText
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Message sent:', response.data)
    messages.value.push(response.data)
    scrollToBottom()
  } catch (error) {
    console.error('❌ Failed to send message:', error)
    newMessage.value = messageText // Restore message on error
    if (error.response?.status === 401) {
      authStore.logout()
      window.location.href = '/login'
    }
  }
}

const formatMessageText = (message) => {
  if (!message.text) return ''
  
  const mentions = message.mentions || []
  if (mentions.length === 0) {
    // No mentions, just escape and return
    const div = document.createElement('div')
    div.textContent = message.text
    return div.innerHTML
  }
  
  // Escape HTML first to prevent XSS
  const div = document.createElement('div')
  div.textContent = message.text
  let escaped = div.innerHTML
  
  // Apply mention highlighting to escaped text
  mentions.forEach(user => {
    if (!user) return
    const name = user.name || (typeof user === 'string' ? user : '')
    if (!name) return
    
    // Escape special regex characters in name
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`@${escapedName}\\b`, 'gi')
    escaped = escaped.replace(regex, `<span class="mention-highlight">@${name}</span>`)
  })
  
  return escaped
}

// Cleanup socket on unmount
onBeforeUnmount(() => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (date) => {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (error) {
    return ''
  }
}
</script>

<style scoped>
.channel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile */
  overflow: hidden;
}

.channel-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 3px solid var(--color-text);
  background: var(--color-bg);
  flex-shrink: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4);
  -webkit-overflow-scrolling: touch;
  min-height: 0; /* Important for flex scrolling */
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--space-8);
}

.empty-text {
  color: var(--color-text-muted);
  font-size: var(--text-base);
  font-weight: 600;
  text-align: center;
}

.message-item {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
  padding: var(--space-3);
  position: relative;
}

.message-item:hover {
  background: var(--color-bg-alt);
  margin-left: var(--space-2);
  margin-right: calc(-1 * var(--space-2));
  padding-left: var(--space-5);
}

.message-avatar {
  flex-shrink: 0;
}

.avatar-circle {
  width: 48px;
  height: 48px;
  border-radius: 0;
  border: 3px solid var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  background: var(--color-primary);
  color: white;
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
}

.message-content {
  flex: 1;
}

.message-header {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  align-items: baseline;
}

.message-author {
  font-weight: 700;
  font-size: var(--text-base);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.message-time {
  color: var(--color-text-muted);
  font-size: var(--text-sm);
}

.message-text {
  line-height: 1.6;
  font-size: var(--text-base);
  padding: var(--space-2) 0;
}

.message-files {
  margin-top: var(--space-2);
}

.file-item {
  margin-top: var(--space-2);
}

.message-input-container {
  padding: var(--space-4);
  border-top: 3px solid var(--color-text);
  display: flex;
  gap: var(--space-3);
  background: var(--color-bg);
  box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  z-index: 10;
}

.message-input-container .input {
  flex: 1;
  min-width: 0; /* Allow input to shrink */
  font-size: var(--text-base);
  padding: var(--space-3) var(--space-4);
}

.message-input-container .btn {
  flex-shrink: 0;
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 700;
  white-space: nowrap;
}

/* Mobile: Sticky input bar, clean scroll */
@media (max-width: 768px) {
  .channel-header {
    padding: var(--space-3) var(--space-4);
  }
  
  .channel-header h2 {
    font-size: var(--text-lg);
  }
  
  .messages-container {
    padding: var(--space-3);
  }
  
  .message-item {
    margin-bottom: var(--space-4);
    padding: var(--space-2);
  }
  
  .message-input-container {
    padding: var(--space-3);
    gap: var(--space-2);
  }
  
  .message-input-container .input {
    font-size: var(--text-sm);
    padding: var(--space-2) var(--space-3);
  }
  
  .message-input-container .btn {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs);
  }
  
  .avatar-circle {
    width: 36px;
    height: 36px;
    font-size: var(--text-xs);
    border-width: 2px;
  }
  
  .message-text {
    font-size: var(--text-sm);
    line-height: 1.5;
  }
  
  .message-author {
    font-size: var(--text-sm);
  }
  
  .message-time {
    font-size: var(--text-xs);
  }
}

.mention-highlight {
  background: var(--matisse-yellow);
  color: var(--bauhaus-black);
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 700;
  cursor: pointer;
}

.mention-autocomplete {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: var(--color-bg);
  border: 3px solid var(--color-text);
  border-radius: var(--radius-sm);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.2);
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  margin-bottom: var(--space-2);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-bottom: 1px solid var(--color-border);
}

.mention-item:last-child {
  border-bottom: none;
}

.mention-item:hover,
.mention-item.active {
  background: var(--color-bg-alt);
  transform: translateX(4px);
}

.mention-avatar {
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
  font-size: var(--text-sm);
}

.mention-info {
  flex: 1;
  min-width: 0;
}

.mention-name {
  font-weight: 700;
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-email {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.message-action-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-muted);
  font-weight: 600;
}

.message-action-btn:hover {
  background: var(--color-bg-alt);
  border-color: var(--matisse-yellow);
  color: var(--color-text);
}

.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

.reaction-button {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-weight: 600;
}

.reaction-button:hover {
  background: var(--color-bg);
  transform: scale(1.05);
}

.reaction-button.has-reacted {
  background: var(--matisse-yellow);
  border-color: var(--matisse-yellow);
  color: var(--bauhaus-black);
}

.reaction-emoji {
  font-size: var(--text-sm);
}

.reaction-count {
  font-size: var(--text-xs);
  font-weight: 700;
}

.reaction-add-btn {
  background: transparent;
  border: 1px dashed var(--color-border);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-muted);
  font-weight: 700;
  min-width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.reaction-add-btn:hover {
  background: var(--color-bg-alt);
  border-color: var(--matisse-yellow);
  color: var(--color-text);
}

.reaction-picker {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-bg);
  border: 2px solid var(--color-text);
  border-radius: var(--radius-sm);
  margin-top: var(--space-2);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
}

.reaction-picker-item {
  background: transparent;
  border: none;
  padding: var(--space-2);
  font-size: var(--text-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  border-radius: var(--radius-sm);
}

.reaction-picker-item:hover {
  background: var(--color-bg-alt);
  transform: scale(1.2);
}

.thread-replies {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 2px solid var(--color-border);
  margin-left: var(--space-4);
}

.thread-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.thread-reply-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2);
  background: var(--color-bg-alt);
  border-radius: var(--radius-sm);
}

.thread-reply-avatar {
  width: 24px;
  height: 24px;
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

.thread-reply-content {
  flex: 1;
  min-width: 0;
}

.thread-reply-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  align-items: baseline;
}

.thread-reply-author {
  font-weight: 700;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.thread-reply-time {
  color: var(--color-text-muted);
  font-size: 10px;
}

.thread-reply-text {
  font-size: var(--text-sm);
  line-height: 1.5;
}

.thread-reply-input {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.is-thread-reply {
  margin-left: var(--space-8);
  opacity: 0.9;
}

@media (max-width: 768px) {
  .message-actions {
    gap: var(--space-1);
  }
  
  .message-action-btn {
    font-size: 10px;
    padding: var(--space-1);
  }
  
  .reaction-button {
    font-size: 10px;
    padding: 2px var(--space-1);
  }
  
  .thread-replies {
    margin-left: var(--space-2);
  }
  
  .is-thread-reply {
    margin-left: var(--space-4);
  }
}

/* Message editing/deleting */
.message-edited {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-style: italic;
  margin-left: var(--space-2);
}

.message-edit-form {
  margin-top: var(--space-2);
}

.edit-actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.message-actions-menu {
  position: absolute;
  right: var(--space-2);
  top: var(--space-2);
  background: var(--color-bg);
  border: 2px solid var(--color-text);
  border-radius: var(--radius-sm);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 120px;
}

.message-menu-btn {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: all var(--transition-fast);
}

.message-menu-btn:hover {
  background: var(--color-bg-alt);
}

.message-menu-btn-danger {
  color: var(--matisse-red);
}

.message-menu-btn-danger:hover {
  background: var(--matisse-red);
  color: white;
}

.message-item {
  position: relative;
}

.message-item:hover .message-actions-menu {
  display: block;
}

.message-deleted {
  opacity: 0.5;
}

.message-deleted .message-text {
  text-decoration: line-through;
  font-style: italic;
}

.highlight-message {
  background: var(--matisse-yellow) !important;
  animation: highlightPulse 2s ease-in-out;
}

@keyframes highlightPulse {
  0%, 100% { background: var(--matisse-yellow); }
  50% { background: var(--color-bg); }
}

/* Typing indicator */
.typing-indicator {
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-alt);
  border-top: 1px solid var(--color-border);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-style: italic;
}

.typing-text {
  animation: typingDots 1.5s infinite;
}

@keyframes typingDots {
  0%, 20% { opacity: 0.3; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.3; }
}

/* Search modal */
.search-modal {
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

.search-modal-content {
  background: var(--color-bg);
  border: 3px solid var(--color-text);
  border-radius: var(--radius-md);
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 2px solid var(--color-text);
}

.search-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 700;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: var(--text-2xl);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.btn-close:hover {
  background: var(--color-bg-alt);
}

.search-input-container {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.search-loading {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.search-result-item {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.search-result-item:hover {
  background: var(--color-bg-alt);
}

.search-result-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  align-items: baseline;
  flex-wrap: wrap;
}

.search-result-author {
  font-weight: 700;
  font-size: var(--text-sm);
  text-transform: uppercase;
}

.search-result-channel {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
}

.search-result-time {
  color: var(--color-text-muted);
  font-size: 10px;
  margin-left: auto;
}

.search-result-text {
  font-size: var(--text-sm);
  line-height: 1.5;
}

.search-result-text mark {
  background: var(--matisse-yellow);
  color: var(--bauhaus-black);
  padding: 2px 4px;
  border-radius: 2px;
}

.search-empty {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
}

/* Channel header */
.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.channel-header-left {
  flex: 1;
}

.btn-icon {
  background: transparent;
  border: 2px solid var(--color-text);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-lg);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--color-bg-alt);
  transform: scale(1.1);
}
</style>

