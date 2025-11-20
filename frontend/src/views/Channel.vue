<template>
  <div class="channel">
    <div class="channel-header">
      <div class="channel-header-left">
        <h2 class="heading-2"># {{ channel?.name }}</h2>
        <p v-if="channel?.description" class="text-muted" style="margin-top: var(--space-2);">{{ channel.description }}</p>
        <div v-if="channel?.privacy === 'private'" class="channel-privacy-badge" style="margin-top: var(--space-2); display: inline-block; padding: var(--space-1) var(--space-2); background: var(--color-bg-alt); border: 2px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase;">
          🔒 Private Channel
        </div>
      </div>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <button v-if="channel?.privacy === 'private' && canManageChannelMembers" @click="showChannelMembers = !showChannelMembers" class="btn-icon" title="Manage Members">
          👥
        </button>
        <button @click="showSearch = true" class="btn-icon" title="Search messages">
          🔍
        </button>
      </div>
    </div>
    
    <!-- Channel Members Panel (Private Channels Only) -->
    <div v-if="showChannelMembers && channel?.privacy === 'private'" class="channel-members-panel" style="padding: var(--space-4); background: var(--color-bg-alt); border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
        <h3 class="heading-4" style="margin: 0;">Channel Members</h3>
        <button @click="showChannelMembers = false" class="btn-icon" style="font-size: var(--text-lg);">✕</button>
      </div>
      
      <!-- Current Members -->
      <div style="margin-bottom: var(--space-4);">
        <h4 style="font-size: var(--text-sm); font-weight: 600; margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.5px;">Current Members ({{ channelMembers.length }})</h4>
        <div style="display: flex; flex-direction: column; gap: var(--space-2);">
          <div
            v-for="member in channelMembers"
            :key="member._id || member.id"
            style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2); background: var(--color-bg); border: 2px solid var(--color-border); border-radius: var(--radius-sm);"
          >
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--matisse-yellow); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: 700; text-transform: uppercase;">
                {{ (member.name || 'U').charAt(0) }}
              </div>
              <div>
                <div style="font-weight: 600; font-size: var(--text-sm);">{{ member.name }}</div>
                <div style="font-size: var(--text-xs); color: var(--color-text-muted);">{{ member.email }}</div>
              </div>
            </div>
            <button
              v-if="canRemoveMember(member)"
              @click="removeChannelMember(member)"
              class="btn btn-secondary"
              style="padding: var(--space-1) var(--space-2); font-size: var(--text-xs);"
              :disabled="removingMember"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      
      <!-- Add Members -->
      <div v-if="availableMembersToAdd.length > 0">
        <h4 style="font-size: var(--text-sm); font-weight: 600; margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.5px;">Add Members</h4>
        <div style="display: flex; flex-direction: column; gap: var(--space-2); max-height: 300px; overflow-y: auto;">
          <div
            v-for="member in availableMembersToAdd"
            :key="member._id || member.id"
            style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-2); background: var(--color-bg); border: 2px solid var(--color-border); border-radius: var(--radius-sm);"
          >
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--color-bg-alt); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); font-weight: 700; text-transform: uppercase;">
                {{ (member.name || 'U').charAt(0) }}
              </div>
              <div>
                <div style="font-weight: 600; font-size: var(--text-sm);">{{ member.name }}</div>
                <div style="font-size: var(--text-xs); color: var(--color-text-muted);">{{ member.email }}</div>
              </div>
            </div>
            <button
              @click="addChannelMember(member)"
              class="btn btn-accent"
              style="padding: var(--space-1) var(--space-2); font-size: var(--text-xs);"
              :disabled="addingMember"
            >
              Add
            </button>
          </div>
        </div>
      </div>
      <div v-else style="padding: var(--space-3); text-align: center; color: var(--color-text-muted); font-size: var(--text-sm); background: var(--color-bg); border: 2px solid var(--color-border); border-radius: var(--radius-sm);">
        All workspace members are already in this channel
      </div>
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
        :class="{ 
          'is-thread-reply': message.threadParent, 
          'message-deleted': message.deleted,
          'is-own-message': isOwnMessage(message)
        }"
      >
        <div v-if="!isOwnMessage(message)" class="message-avatar">
          <div class="avatar-circle">
            {{ message.user?.name?.charAt(0)?.toUpperCase() || 'U' }}
          </div>
        </div>
        <div class="message-content" :class="{ 'own-message-content': isOwnMessage(message) }" @mouseenter="showMessageActions(message._id)" @mouseleave="hideMessageActions(message._id)">
          <div class="message-header" :class="{ 'own-message-header': isOwnMessage(message) }">
            <div v-if="!isOwnMessage(message)" class="message-author-wrapper">
              <span class="message-author">{{ message.user?.name || 'Unknown' }}</span>
              <span 
                v-if="message.user?.status" 
                class="user-status-indicator"
                :class="`status-${message.user.status}`"
                :title="message.user.status === 'online' ? 'Online' : message.user.status === 'away' ? 'Away' : 'Offline'"
              ></span>
            </div>
            <div v-else class="message-author-wrapper">
              <span class="message-author own-message-label">You</span>
            </div>
            <div class="message-time-wrapper">
              <span v-if="formatTime(message.createdAt)" class="message-time">{{ formatTime(message.createdAt) }}</span>
              <span v-if="message.edited" class="message-edited">(edited)</span>
            </div>
          </div>
          
          <!-- Read Receipts -->
          <div v-if="message.readBy && message.readBy.length > 0 && !message.threadParent" class="read-receipts">
            <span class="read-receipts-label">Read by:</span>
            <div class="read-receipts-avatars">
              <span
                v-for="read in message.readBy.slice(0, 5)"
                :key="read.user?._id || read.user"
                class="read-receipt-avatar"
                :title="read.user?.name || 'Unknown'"
              >
                {{ read.user?.name?.charAt(0)?.toUpperCase() || '?' }}
              </span>
              <span v-if="message.readBy.length > 5" class="read-receipt-more">
                +{{ message.readBy.length - 5 }}
              </span>
            </div>
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
          <div v-if="message.files?.length" class="message-files" :class="{ 'own-message-files': isOwnMessage(message) }">
            <div v-for="file in message.files" :key="file.driveFileId" class="file-item">
              <a :href="file.driveUrl" target="_blank">{{ file.name }}</a>
            </div>
          </div>
          
          <!-- Reactions -->
          <div v-if="message.reactions && message.reactions.length > 0" class="message-reactions" :class="{ 'own-message-reactions': isOwnMessage(message) }">
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
              <span v-if="getThreadUnreadCount(message) > 0" class="thread-unread-badge">{{ getThreadUnreadCount(message) }}</span>
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
        <div class="search-filters-container">
          <div class="search-filter-group">
            <label for="filter-user">From:</label>
            <select
              id="filter-user"
              v-model="searchFilterUser"
              @change="performSearch"
              class="select-filter"
            >
              <option :value="null">All Users</option>
              <option
                v-for="member in workspaceMembers"
                :key="member._id || member.id"
                :value="member._id || member.id"
              >
                {{ member.name || member.email || 'Unknown' }}
              </option>
            </select>
          </div>
          <div class="search-filter-group">
            <label for="filter-channel">In:</label>
            <select
              id="filter-channel"
              v-model="searchFilterChannel"
              @change="performSearch"
              class="select-filter"
            >
              <option :value="null">All Channels</option>
              <option
                v-for="ch in availableChannels"
                :key="ch._id || ch.id"
                :value="ch._id || ch.id"
              >
                # {{ ch.name }}
              </option>
            </select>
          </div>
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
import { useWorkspaceAuth } from '../composables/useWorkspaceAuth'

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
const searchFilterUser = ref(null)
const searchFilterChannel = ref(null)
const availableChannels = ref([])

// Notifications
const threadUnreadCounts = ref({}) // Map of messageId -> count

// Channel members management (private channels)
const showChannelMembers = ref(false)
const addingMember = ref(false)
const removingMember = ref(false)

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
  
  // Fetch thread notifications
  await fetchThreadNotifications()
  
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

// Watch for search modal opening to fetch channels and reset filters
watch(showSearch, async (isOpen) => {
  if (isOpen && workspace.value) {
    await fetchChannelsForSearch()
    // Focus search input when modal opens
    nextTick(() => searchInput.value?.focus())
  } else if (!isOpen) {
    // Reset search filters when modal closes
    searchFilterUser.value = null
    searchFilterChannel.value = null
    searchQuery.value = ''
    searchResults.value = []
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
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on channel fetch, will retry later')
      // Don't clear channel on rate limit, keep existing data
    } else {
      console.error('❌ Failed to fetch channel:', error)
      if (error.response?.status === 401) {
        authStore.logout()
        window.location.href = '/login'
      }
    }
  }
}

const fetchWorkspace = async () => {
  if (!channel.value?.workspace) return
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Extract workspace ID - handle both string and object cases
    let workspaceId = channel.value.workspace
    if (typeof workspaceId === 'object' && workspaceId !== null) {
      workspaceId = workspaceId._id || workspaceId.id || workspaceId
    }
    if (!workspaceId) {
      console.error('❌ No workspace ID found in channel')
      return
    }
    
    // Convert to string if it's not already
    workspaceId = String(workspaceId)
    
    const response = await axios.get(`${apiUrl}/api/workspaces/${workspaceId}`, {
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
        avatar: workspace.value.admin.avatar,
        status: workspace.value.admin.status || 'offline'
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
            avatar: user.avatar,
            status: user.status || 'offline'
          })
        }
      })
    }
    
    // Update online users from workspace
    if (workspace.value.onlineUsers) {
      workspace.value.onlineUsers.forEach(onlineUser => {
        updateUserStatus(onlineUser._id || onlineUser, onlineUser.status || 'online')
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
    
    // Preserve threadCount from backend and ensure it's set
    messages.value = parentMessages.map(msg => ({
      ...msg,
      threadCount: msg.threadCount || 0, // Preserve threadCount from backend
      reactions: msg.reactions || [],
      mentions: msg.mentions || [],
      readBy: msg.readBy || []
    }))
    
    // Mark messages as read when loaded
    markMessagesAsRead()
    
    // Mark channel as read
    markChannelAsRead()
    
    scrollToBottom()
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on messages fetch, will retry later')
      // Don't clear messages on rate limit, keep existing data
    } else {
      console.error('❌ Failed to fetch messages:', error)
      messages.value = []
      if (error.response?.status === 401) {
        authStore.logout()
        window.location.href = '/login'
      }
    }
  }
}

const getThreadCount = (message) => {
  // This will be updated when we fetch threads
  return message.threadCount || 0
}

const getThreadUnreadCount = (message) => {
  return threadUnreadCounts.value[message._id] || 0
}

const fetchThreadNotifications = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/notifications?unreadOnly=true&type=thread_reply`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const notifications = Array.isArray(response.data) ? response.data : []
    const counts = {}
    
    notifications.forEach(notif => {
      if (notif.threadParent) {
        const threadId = notif.threadParent._id || notif.threadParent
        counts[threadId] = (counts[threadId] || 0) + 1
      }
    })
    
    threadUnreadCounts.value = counts
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on thread notifications fetch, will retry later')
      // Don't clear counts on rate limit, keep existing data
    } else {
      console.error('❌ Failed to fetch thread notifications:', error)
    }
  }
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
    
    // Mark thread notifications as read
    try {
      await axios.patch(`${apiUrl}/api/notifications/read/all`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          threadParent: messageId
        }
      })
      // Clear unread count for this thread
      threadUnreadCounts.value[messageId] = 0
    } catch (err) {
      console.error('Failed to mark thread notifications as read:', err)
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
    
    console.log('✅ Thread reply sent via API:', response.data)
    
    // CRITICAL: Normalize parent ID to string (with trim) to match socket handler normalization
    // This ensures both code paths use the same key format in threadReplies object
    const parentIdRaw = parentMessage._id?.toString() || parentMessage._id
    const parentId = parentIdRaw ? String(parentIdRaw).trim() : null
    
    if (!parentId) {
      console.error('❌ Parent message ID is missing')
      return
    }
    
    // CRITICAL: Check if reply already exists before adding (socket event might have already added it)
    if (!threadReplies.value[parentId]) {
      threadReplies.value[parentId] = []
    }
    
    const replyId = response.data._id?.toString() || response.data._id
    const existingReply = threadReplies.value[parentId].find(r => {
      const rId = r._id?.toString() || r._id
      return rId === replyId
    })
    
    if (!existingReply) {
      threadReplies.value[parentId].push(response.data)
      console.log('✅ Added own thread reply optimistically')
      
      // Update thread count - normalize both sides for reliable comparison
      const parent = messages.value.find(m => {
        const mId = m._id?.toString() || m._id
        const normalizedMId = mId ? String(mId).trim() : null
        return normalizedMId === parentId
      })
      if (parent) {
        parent.threadCount = (parent.threadCount || 0) + 1
      }
    } else {
      console.log('⏭️ Thread reply already exists (from socket), skipping duplicate')
      // Still update thread count if needed (socket might have already done it)
      const parent = messages.value.find(m => {
        const mId = m._id?.toString() || m._id
        const normalizedMId = mId ? String(mId).trim() : null
        return normalizedMId === parentId
      })
      if (parent && !parent.threadCount) {
        parent.threadCount = threadReplies.value[parentId].length
      }
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
  
  // CRITICAL: Default to localhost:3000 if VITE_API_URL is not set
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  
  if (!apiUrl) {
    console.error('❌ No API URL configured for Socket.IO connection')
    return
  }
  
  // Disconnect existing socket if any
  if (socket.value) {
    console.log('🔄 Disconnecting existing channel socket before reconnecting...')
    socket.value.removeAllListeners() // Remove all listeners to prevent duplicates
    socket.value.disconnect()
    socket.value = null
  }
  
  // CRITICAL: Get token from multiple sources to ensure it's available
  const token = authStore.token || localStorage.getItem('token')
  
  if (!token) {
    console.error('❌ No authentication token available for Socket.IO connection')
    return
  }
  
  console.log('🔌 Initializing Channel Socket.IO connection', {
    apiUrl,
    channelId: channelId.value,
    tokenLength: token.length
  })
  
  try {
    socket.value = io(apiUrl, {
      auth: {
        token: token,
        userId: authStore.user?.id || authStore.user?._id
      },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    })
  } catch (error) {
    console.error('❌ Failed to create Socket.IO instance:', error)
    return
  }
  
  socket.value.on('connect', () => {
    console.log('🔌 Channel Socket connected, joining channel:', channelId.value)
    
    // Join channel room for messages - ensure ID is normalized
    if (channelId.value) {
      const normalizedChannelId = String(channelId.value).trim()
      console.log('📡 Emitting join_channel with ID:', normalizedChannelId)
      socket.value.emit('join_channel', normalizedChannelId)
    } else {
      console.error('❌ Cannot join channel - channelId.value is null/undefined')
    }
    
    // Join workspace for presence updates and sidebar updates
    if (workspace.value?._id) {
      const workspaceId = workspace.value._id?._id || workspace.value._id
      if (workspaceId) {
        const normalizedWorkspaceId = String(workspaceId).trim()
        console.log('📡 Emitting join_workspace with ID:', normalizedWorkspaceId)
        socket.value.emit('join_workspace', normalizedWorkspaceId)
      }
    }
  })
  
  // Listen for successful channel join confirmation
  socket.value.on('joined_channel', (data) => {
    console.log('✅ Successfully joined channel room:', data.channelId)
    console.log('📡 Channel socket is ready to receive messages')
  })
  
  socket.value.on('disconnect', (reason) => {
    console.log('🔌 Channel Socket disconnected:', reason)
  })
  
  socket.value.on('reconnect', (attemptNumber) => {
    console.log(`🔌 Channel Socket reconnected (attempt ${attemptNumber})`)
    // Rejoin channel and workspace on reconnect
    if (channelId.value) {
      const normalizedChannelId = String(channelId.value).trim()
      socket.value.emit('join_channel', normalizedChannelId)
    }
    if (workspace.value?._id) {
      const workspaceId = workspace.value._id?._id || workspace.value._id
      if (workspaceId) {
        socket.value.emit('join_workspace', String(workspaceId).trim())
      }
    }
  })
  
  socket.value.on('error', (error) => {
    console.error('❌ Channel Socket error:', error)
  })
  
  socket.value.on('message_created', async (message) => {
    console.log('📨📨📨 Message created event received in channel view:', {
      messageId: message._id?.toString() || message._id,
      messageChannel: message.channel,
      messageChannelType: typeof message.channel,
      currentChannel: channelId.value,
      currentChannelType: typeof channelId.value,
      hasThreadParent: !!message.threadParent,
      fullMessage: message
    })
    
    // Normalize channel ID comparison - handle all possible formats
    let messageChannelId = null
    if (message.channel) {
      if (typeof message.channel === 'string') {
        messageChannelId = message.channel.trim()
      } else if (message.channel._id) {
        messageChannelId = String(message.channel._id).trim()
      } else if (message.channel.toString) {
        messageChannelId = String(message.channel.toString()).trim()
      } else {
        messageChannelId = String(message.channel).trim()
      }
    }
    
    const currentChannelId = channelId.value ? String(channelId.value).trim() : null
    
    console.log('🔍 Channel ID comparison - message:', messageChannelId, 'current:', currentChannelId, 'match:', messageChannelId === currentChannelId)
    
    // CRITICAL: Only add if it's for this channel and not a thread reply
    // Also check if message already exists to prevent duplicates
    if (messageChannelId && currentChannelId && messageChannelId === currentChannelId) {
      if (!message.threadParent) {
        // Check if message already exists - prevent duplicates
        const existingMessage = messages.value.find(m => {
          const mId = m._id?.toString() || m._id
          const msgId = message._id?.toString() || message._id
          return mId === msgId
        })
        
        if (existingMessage) {
          console.log('⏭️ Message already exists in channel view, skipping:', message._id?.toString() || message._id)
          return
        }
        
        // Ensure message has all required fields
        const newMessage = {
          ...message,
          channel: currentChannelId,
          reactions: message.reactions || [],
          mentions: message.mentions || [],
          readBy: message.readBy || [],
          threadCount: message.threadCount || 0,
          // Ensure user is properly formatted
          user: message.user || message.user
        }
        
        console.log('✅ Adding new message to channel view:', {
          messageId: newMessage._id?.toString() || newMessage._id,
          channel: newMessage.channel,
          user: newMessage.user,
          text: newMessage.text?.substring(0, 50)
        })
        
        messages.value.push(newMessage)
        console.log('✅ Message added successfully. Total messages:', messages.value.length)
          
          // CRITICAL: Check if this is our own message - don't play sound for own messages
          // Normalize both IDs to strings for reliable comparison
          const userId = authStore.user?._id || authStore.user?.id
          const userIdStr = userId ? String(userId).trim() : null
          
          let messageUserId = null
          if (newMessage.user) {
            if (typeof newMessage.user === 'string') {
              messageUserId = newMessage.user.trim()
            } else if (newMessage.user._id) {
              messageUserId = String(newMessage.user._id).trim()
            } else {
              messageUserId = String(newMessage.user).trim()
            }
          }
          
          const normalizedUserId = userIdStr ? String(userIdStr).trim() : null
          const normalizedMessageUserId = messageUserId ? String(messageUserId).trim() : null
          const isOwnMessage = normalizedUserId && normalizedMessageUserId && normalizedUserId === normalizedMessageUserId
          
          console.log('🔍 Message ownership check:', {
            userId: normalizedUserId,
            messageUserId: normalizedMessageUserId,
            isOwnMessage,
            messageId: newMessage._id
          })
          
          // CRITICAL: Only play sound for messages from OTHER users
          // Sound should NOT play when you send your own message
          if (!isOwnMessage && normalizedMessageUserId) {
            console.log('🔔 New message received from another user, playing sound')
            try {
              // Use shared audio context (same as Workspace.vue)
              if (!window.notificationAudioContext) {
                window.notificationAudioContext = new (window.AudioContext || window.webkitAudioContext)()
              }
              const ctx = window.notificationAudioContext
              
              // Resume if suspended
              if (ctx.state === 'suspended') {
                ctx.resume().then(() => playSound(ctx)).catch(() => playSound(ctx))
              } else {
                playSound(ctx)
              }
              
              function playSound(audioCtx) {
                try {
                  const oscillator = audioCtx.createOscillator()
                  const gainNode = audioCtx.createGain()
                  oscillator.connect(gainNode)
                  gainNode.connect(audioCtx.destination)
                  oscillator.frequency.value = 800
                  oscillator.type = 'sine'
                  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
                  oscillator.start(audioCtx.currentTime)
                  oscillator.stop(audioCtx.currentTime + 0.2)
                  console.log('🔔 Notification sound played for new message from another user')
                } catch (e) {
                  console.warn('⚠️ Could not play sound:', e)
                }
              }
            } catch (e) {
              console.warn('⚠️ Could not initialize notification sound:', e)
            }
          } else {
            console.log('⏭️ Skipping sound - own message or missing user ID')
          }
          
          // Use nextTick to ensure Vue has updated the DOM before scrolling
          await nextTick()
          scrollToBottom()
          
          // Mark as read if viewing the channel (with a small delay to ensure message is rendered)
          setTimeout(() => {
            markMessagesAsRead()
            markChannelAsRead()
          }, 100)
      } else {
        console.log('⚠️ Message is a thread reply, skipping (handled by thread_reply_created)')
      }
    } else {
      console.log('⚠️ Message is for different channel or channel ID mismatch:', {
        messageChannel: messageChannelId,
        currentChannel: currentChannelId
      })
    }
  })
  
  socket.value.on('thread_reply_created', (reply) => {
    console.log('📨 Thread reply created event received:', reply)
    
    // Add thread reply to the appropriate thread
    // CRITICAL: Normalize parentId to string for consistent comparison and object key usage
    const parentIdRaw = reply.threadParent?._id || reply.threadParent
    const parentId = parentIdRaw ? String(parentIdRaw).trim() : null
    
    if (parentId) {
      // Initialize array if it doesn't exist
      if (!threadReplies.value[parentId]) {
        threadReplies.value[parentId] = []
      }
      
      // Check if reply already exists to prevent duplicates
      const replyId = reply._id?.toString() || reply._id
      const existingReply = threadReplies.value[parentId].find(r => {
        const rId = r._id?.toString() || r._id
        return rId === replyId
      })
      
      if (!existingReply) {
        threadReplies.value[parentId].push(reply)
        console.log('✅ Added thread reply from socket:', replyId, 'to parent:', parentId)
        
        // Update thread count on parent message
        // CRITICAL: Normalize both sides of comparison to strings for reliable equality
        const parent = messages.value.find(m => {
          const mId = m._id?.toString() || m._id
          const normalizedMId = mId ? String(mId).trim() : null
          const normalizedParentId = parentId ? String(parentId).trim() : null
          return normalizedMId === normalizedParentId
        })
        if (parent) {
          parent.threadCount = (parent.threadCount || 0) + 1
          console.log('✅ Updated thread count for parent:', parentId, 'new count:', parent.threadCount)
        } else {
          console.warn('⚠️ Parent message not found for thread reply:', {
            parentId,
            availableMessageIds: messages.value.map(m => m._id?.toString() || m._id)
          })
        }
      } else {
        console.log('⏭️ Thread reply already exists, skipping duplicate:', replyId)
      }
    } else {
      console.warn('⚠️ Thread reply received but parent ID is missing:', reply)
    }
  })
  
  socket.value.on('notification', (notification) => {
    // Update thread unread counts
    if (notification.type === 'thread_reply' && notification.threadParent) {
      const threadId = notification.threadParent._id || notification.threadParent
      threadUnreadCounts.value[threadId] = (threadUnreadCounts.value[threadId] || 0) + 1
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
  
  // Presence updates
  socket.value.on('user_online', (data) => {
    // Update user status in workspace
    if (workspace.value && data.user) {
      updateUserStatus(data.userId, data.user.status)
    }
  })
  
  socket.value.on('user_offline', (data) => {
    // Update user status in workspace
    if (workspace.value && data.userId) {
      updateUserStatus(data.userId, 'offline')
    }
  })
  
  socket.value.on('user_status_changed', (data) => {
    // Update user status in workspace
    if (workspace.value && data.user) {
      updateUserStatus(data.userId, data.user.status)
    }
  })
  
  // Read receipt updates
  socket.value.on('message_read', (data) => {
    // Update readBy in message
    const index = messages.value.findIndex(m => m._id === data.messageId)
    if (index >= 0) {
      messages.value[index] = {
        ...messages.value[index],
        readBy: data.readBy || []
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
const isOwnMessage = (message) => {
  if (!message || !authStore.user) return false
  const userId = authStore.user._id || authStore.user.id
  const messageUserId = message.user?._id || message.user
  return userId?.toString() === messageUserId?.toString()
}

const canEditMessage = (message) => {
  return isOwnMessage(message)
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

// Fetch channels for search filter
const fetchChannelsForSearch = async () => {
  if (!workspace.value?._id && !workspace.value?.id) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    const workspaceId = workspace.value?._id || workspace.value?.id
    
    const response = await axios.get(`${apiUrl}/api/channels/workspace/${workspaceId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    availableChannels.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('❌ Failed to fetch channels for search:', error)
    availableChannels.value = []
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
    
    const params = {
      q: searchQuery.value,
      workspaceId: workspace.value?._id || workspace.value?.id
    }
    
    // Add filters if selected
    if (searchFilterUser.value) {
      params.userId = searchFilterUser.value
    }
    
    if (searchFilterChannel.value) {
      params.channelId = searchFilterChannel.value
    }
    
    const response = await axios.get(`${apiUrl}/api/search`, {
      params,
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

// Mark messages as read
const markChannelAsRead = async () => {
  if (!channelId.value) return
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    await axios.post(`${apiUrl}/api/channels/${channelId.value}/read`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // Emit event to update channel list in workspace
    if (socket.value) {
      socket.value.emit('channel_read', { channelId: channelId.value.toString() })
    }
    
    console.log('✅ Channel marked as read:', channelId.value)
  } catch (error) {
    console.error('❌ Failed to mark channel as read:', error)
  }
}

const markMessagesAsRead = async () => {
  if (!channelId.value || !messages.value.length) return
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Get message IDs that haven't been read by current user
    const unreadMessageIds = messages.value
      .filter(msg => {
        if (!msg.readBy || !Array.isArray(msg.readBy)) return true
        const userId = authStore.user?.id || authStore.user?._id
        if (!userId) return false
        return !msg.readBy.some(read => {
          const readUserId = read.user?._id || read.user
          return readUserId?.toString() === userId.toString()
        })
      })
      .map(msg => msg._id)
      .slice(0, 50) // Limit to 50 messages at a time
    
    if (unreadMessageIds.length > 0) {
      await axios.post(
        `${apiUrl}/api/messages/channel/${channelId.value}/read`,
        { messageIds: unreadMessageIds },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
    }
  } catch (error) {
    console.error('❌ Failed to mark messages as read:', error)
  }
}

// Update user status in workspace members
const updateUserStatus = (userId, status) => {
  if (!workspaceMembers.value || !userId) return
  
  const userIdStr = userId.toString()
  
  // Update in workspace members
  const memberIndex = workspaceMembers.value.findIndex(m => {
    const mId = (m._id || m.id)?.toString()
    return mId === userIdStr
  })
  
  if (memberIndex >= 0) {
    workspaceMembers.value[memberIndex] = {
      ...workspaceMembers.value[memberIndex],
      status
    }
  }
  
  // Update in messages
  messages.value.forEach((msg, index) => {
    if (msg.user) {
      const msgUserId = (msg.user._id || msg.user)?.toString()
      if (msgUserId === userIdStr) {
        messages.value[index] = {
          ...messages.value[index],
          user: {
            ...msg.user,
            status
          }
        }
      }
    }
  })
  
  // Update in thread replies
  for (const threadId in threadReplies.value) {
    threadReplies.value[threadId].forEach((reply, index) => {
      if (reply.user) {
        const replyUserId = (reply.user._id || reply.user)?.toString()
        if (replyUserId === userIdStr) {
          threadReplies.value[threadId][index] = {
            ...threadReplies.value[threadId][index],
            user: {
              ...reply.user,
              status
            }
          }
        }
      }
    })
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
    
    console.log('✅ Message sent via API:', response.data)
    
    // CRITICAL: Add message optimistically for immediate feedback
    // The socket event will also fire, but we check for duplicates
    // This ensures the sender sees their message immediately
    const existingMessage = messages.value.find(m => {
      const mId = m._id?.toString() || m._id
      const msgId = response.data._id?.toString() || response.data._id
      return mId === msgId
    })
    
    if (!existingMessage) {
      messages.value.push(response.data)
      console.log('✅ Added own message optimistically')
    } else {
      console.log('⏭️ Own message already exists (from socket), skipping duplicate')
    }
    
    await nextTick()
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
// Channel members management (private channels)
const canManageChannelMembers = computed(() => {
  if (!channel.value || !workspace.value || !authStore.user) return false
  
  const userId = authStore.user._id || authStore.user.id
  const workspaceId = workspace.value._id || workspace.value.id
  
  // Workspace admin can manage
  const isAdmin = workspace.value.admin?._id?.toString() === userId?.toString() ||
                  workspace.value.admin?.toString() === userId?.toString()
  
  // Channel creator or admin can manage
  return isAdmin
})

const channelMembers = computed(() => {
  if (!channel.value || !channel.value.members) return []
  return channel.value.members.map(member => {
    const memberId = member._id || member.id || member
    // Find full user details from workspace members
    const fullMember = workspaceMembers.value.find(wm => {
      const wmId = wm._id || wm.id
      return wmId?.toString() === memberId?.toString()
    })
    return fullMember || {
      _id: memberId,
      id: memberId,
      name: member.name || 'Unknown',
      email: member.email || '',
      avatar: member.avatar
    }
  })
})

const availableMembersToAdd = computed(() => {
  if (!channel.value || !workspaceMembers.value) return []
  
  const channelMemberIds = channelMembers.value.map(m => (m._id || m.id)?.toString())
  return workspaceMembers.value.filter(member => {
    const memberId = (member._id || member.id)?.toString()
    return !channelMemberIds.includes(memberId)
  })
})

const canRemoveMember = (member) => {
  if (!canManageChannelMembers.value) return false
  if (!channel.value || !authStore.user) return false
  
  const userId = authStore.user._id || authStore.user.id
  const memberId = member._id || member.id
  
  // Can't remove yourself
  if (userId?.toString() === memberId?.toString()) return false
  
  // Workspace admin can remove anyone
  const workspaceId = workspace.value._id || workspace.value.id
  const isAdmin = workspace.value.admin?._id?.toString() === userId?.toString() ||
                  workspace.value.admin?.toString() === userId?.toString()
  
  return isAdmin
}

const addChannelMember = async (member) => {
  if (addingMember.value || !channel.value || !canManageChannelMembers.value) return
  
  addingMember.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Get current members
    const currentMemberIds = (channel.value.members || []).map(m => {
      const id = m._id || m.id || m
      return id.toString()
    })
    
    // Add new member
    const memberId = member._id || member.id
    const updatedMembers = [...currentMemberIds, memberId.toString()]
    
    // Update channel
    const response = await axios.patch(`${apiUrl}/api/channels/${channel.value._id}`, {
      members: updatedMembers
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Member added to channel:', response.data)
    
    // Refresh channel data
    await fetchChannel()
  } catch (error) {
    console.error('❌ Failed to add member to channel:', error)
    alert(error.response?.data?.message || 'Failed to add member to channel')
  } finally {
    addingMember.value = false
  }
}

const removeChannelMember = async (member) => {
  if (removingMember.value || !channel.value || !canRemoveMember(member)) return
  
  removingMember.value = true
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    // Get current members and filter out the one to remove
    const memberId = (member._id || member.id)?.toString()
    const currentMemberIds = (channel.value.members || []).map(m => {
      const id = m._id || m.id || m
      return id.toString()
    }).filter(id => id !== memberId)
    
    // Update channel
    const response = await axios.patch(`${apiUrl}/api/channels/${channel.value._id}`, {
      members: currentMemberIds
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log('✅ Member removed from channel:', response.data)
    
    // Refresh channel data
    await fetchChannel()
  } catch (error) {
    console.error('❌ Failed to remove member from channel:', error)
    alert(error.response?.data?.message || 'Failed to remove member from channel')
  } finally {
    removingMember.value = false
  }
}

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

.message-item.is-own-message {
  flex-direction: row-reverse;
}

.message-item.is-own-message:hover {
  background: var(--color-bg-alt);
  margin-right: var(--space-2);
  margin-left: calc(-1 * var(--space-2));
  padding-right: var(--space-5);
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
  max-width: 70%;
}

.message-content.own-message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-header {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  align-items: baseline;
}

.message-header.own-message-header {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.message-time-wrapper {
  display: flex;
  gap: var(--space-1);
  align-items: baseline;
}

.own-message-label {
  color: var(--bauhaus-blue);
  font-weight: 700;
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
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-bg-alt);
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-content.own-message-content .message-text {
  background: var(--bauhaus-blue);
  color: white;
  border-color: var(--color-text);
  box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.15);
}

.message-files {
  margin-top: var(--space-2);
}

.message-content.own-message-content .message-files {
  text-align: right;
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

.message-content.own-message-content .message-actions {
  justify-content: flex-end;
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

.message-content.own-message-content .message-reactions {
  justify-content: flex-end;
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

.search-filters-container {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-3);
}

.search-filter-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.search-filter-group label {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.select-filter {
  width: 100%;
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  border: 2px solid var(--color-text);
  border-radius: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.select-filter:focus {
  outline: none;
  border-color: var(--bauhaus-blue);
  box-shadow: 3px 3px 0 var(--bauhaus-blue);
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

/* User Presence Indicators */
.user-status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.user-status-indicator.status-online {
  background: #10b981;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px #10b98133;
}

.user-status-indicator.status-away {
  background: #f59e0b;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px #f59e0b33;
}

.user-status-indicator.status-offline {
  background: #6b7280;
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px #6b728033;
}

/* Read Receipts */
.read-receipts {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.read-receipts-label {
  font-size: var(--text-xs);
}

.read-receipts-avatars {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.read-receipt-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: help;
}

.read-receipt-more {
  font-size: 10px;
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

.thread-unread-badge {
  background: var(--matisse-red);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  margin-left: var(--space-1);
}
</style>

