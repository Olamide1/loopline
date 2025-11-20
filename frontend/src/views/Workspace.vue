<template>
  <div class="workspace">
    <!-- Top Bar -->
    <div class="workspace-topbar">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4) var(--space-5); background: var(--color-bg); border-bottom: 3px solid var(--color-text);">
        <h2 class="heading-2" style="margin: 0;">{{ workspace?.name || 'Workspace' }}</h2>
        <div style="display: flex; align-items: center; gap: var(--space-4);">
          <router-link :to="`/workspace/${workspaceId}/dm`" class="btn-icon-header" title="Direct Messages">
            💬
            <span v-if="unreadDMCount > 0" class="notification-badge">{{ unreadDMCount > 99 ? '99+' : unreadDMCount }}</span>
          </router-link>
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
        
      
      <!-- Direct Messages Section -->
      <div style="margin-bottom: var(--space-4); border-bottom: 2px solid var(--color-border); padding-bottom: var(--space-3);">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3) var(--space-4);">
          <h4 class="text-muted" style="margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: var(--text-sm);">Direct Messages</h4>
          <router-link 
            :to="`/workspace/${workspaceId}/dm`"
            class="btn-create-channel"
            style="background: var(--matisse-yellow); color: var(--bauhaus-black); border: none; width: 28px; height: 28px; border-radius: var(--radius-sm); font-weight: 900; font-size: var(--text-base); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.1); transition: all var(--transition-fast); flex-shrink: 0; text-decoration: none;"
            title="New Message"
          >
            +
          </router-link>
        </div>
        <div 
          class="channel-item"
          :class="{ active: route.name === 'DirectMessages' || route.name === 'DirectMessageChat' }"
          @click="router.push(`/workspace/${workspaceId}/dm`)"
          style="cursor: pointer;"
        >
          <div style="display: flex; align-items: center; gap: var(--space-2); width: 100%;">
            <span style="font-weight: 600; font-size: var(--text-sm);">💬 Direct Messages</span>
            <span v-if="(unreadDMCount || 0) > 0" class="thread-notification-badge" style="margin-left: auto;">{{ unreadDMCount > 99 ? '99+' : unreadDMCount }}</span>
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
            
            <!-- Member Selection for Private Channels -->
            <div v-if="newChannel.privacy === 'private'" style="margin-bottom: var(--space-3);">
              <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 600;">Add Members (optional)</label>
              <div style="max-height: 200px; overflow-y: auto; border: 2px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--space-2); background: var(--color-bg-alt);">
                <div
                  v-for="member in workspaceMembers"
                  :key="member._id || member.id"
                  style="display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2); cursor: pointer; border-radius: var(--radius-sm); transition: background var(--transition-fast);"
                  :style="{ background: isMemberSelected(member) ? 'var(--matisse-yellow)' : 'transparent' }"
                  @click="toggleChannelMember(member)"
                >
                  <input
                    type="checkbox"
                    :checked="isMemberSelected(member)"
                    @change="toggleChannelMember(member)"
                    style="cursor: pointer;"
                  />
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg); border: 2px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;">
                    {{ (member.name || 'U').charAt(0) }}
                  </div>
                  <span style="font-size: var(--text-sm);">{{ member.name }}</span>
                  <span v-if="member._id === workspace?.admin?._id || member.id === workspace?.admin?._id" style="font-size: var(--text-xs); color: var(--color-text-muted);">(Admin)</span>
                </div>
                <div v-if="workspaceMembers.length === 0" style="padding: var(--space-2); text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
                  No workspace members available
                </div>
              </div>
              <p style="margin-top: var(--space-1); font-size: var(--text-xs); color: var(--color-text-muted);">
                You will be automatically added as a member. Select additional members to include.
              </p>
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
          :class="{ active: (currentChannelId === channel._id || route.params.channelId === channel._id) && route.name !== 'DirectMessages' && route.name !== 'DirectMessageChat' }"
          @click="selectChannel(channel._id)"
        >
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span v-if="channel.privacy === 'private'" style="font-size: var(--text-xs); flex-shrink: 0;" title="Private channel">🔒</span>
            <span style="font-weight: 600; font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"># {{ channel.name }}</span>
            <span 
              v-if="((channel.unreadCount || 0) > 0 || (threadNotifications[channel._id] || 0) > 0)" 
              class="thread-notification-badge" 
              style="margin-left: auto;"
            >
              {{ ((channel.unreadCount || 0) + (threadNotifications[channel._id] || 0)) > 99 ? '99+' : ((channel.unreadCount || 0) + (threadNotifications[channel._id] || 0)) }}
            </span>
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
        
        <!-- Invite Code -->
        <div style="margin-bottom: var(--space-4);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Invite Code</label>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <input
              :value="workspace?.inviteCode || workspaceSettings?.inviteCode || 'Loading...'"
              type="text"
              class="input"
              readonly
              style="flex: 1; font-size: var(--text-base); font-weight: 700; letter-spacing: 1px; background: var(--color-bg-alt);"
            />
            <button
              type="button"
              @click="regenerateInviteCode"
              class="btn btn-secondary"
              :disabled="regeneratingCode"
              style="flex-shrink: 0; padding: var(--space-2) var(--space-3); font-size: var(--text-xs);"
            >
              {{ regeneratingCode ? '...' : 'Regenerate' }}
            </button>
            <button
              type="button"
              @click="copyInviteCode"
              class="btn btn-accent"
              style="flex-shrink: 0; padding: var(--space-2) var(--space-3); font-size: var(--text-xs);"
              title="Copy invite code"
            >
              📋
            </button>
          </div>
          <p style="margin-top: var(--space-2); font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.5;">
            Share this code with others to invite them to your workspace. They can use it at <router-link to="/invite" style="color: var(--color-primary); font-weight: 600;">/invite</router-link>
          </p>
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
      
      <!-- Invite Code & Link Section -->
      <div style="margin-bottom: var(--space-5); padding: var(--space-4); background: var(--color-bg-alt); border-radius: var(--radius-sm); border: 2px solid var(--color-border);">
        <h4 style="margin: 0 0 var(--space-3) 0; font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text);">Share Workspace</h4>
        
        <!-- Invite Code -->
        <div style="margin-bottom: var(--space-3);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Invite Code</label>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <input
              :value="workspace?.inviteCode || 'Loading...'"
              type="text"
              class="input"
              readonly
              style="flex: 1; font-size: var(--text-base); font-weight: 700; letter-spacing: 1px; background: var(--color-bg); font-family: monospace;"
              :id="'invite-code-input'"
            />
            <button
              type="button"
              @click="copyInviteCode"
              class="btn btn-accent"
              style="flex-shrink: 0; padding: var(--space-2) var(--space-3); font-size: var(--text-xs);"
              title="Copy invite code"
            >
              📋 Copy
            </button>
          </div>
        </div>
        
        <!-- Invite Link -->
        <div style="margin-bottom: var(--space-3);">
          <label style="display: block; margin-bottom: var(--space-2); font-size: var(--text-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);">Invite Link</label>
          <div style="display: flex; gap: var(--space-2); align-items: center;">
            <input
              :value="inviteLink"
              type="text"
              class="input"
              readonly
              style="flex: 1; font-size: var(--text-sm); background: var(--color-bg); font-family: monospace;"
              :id="'invite-link-input'"
            />
            <button
              type="button"
              @click="copyInviteLink"
              class="btn btn-accent"
              style="flex-shrink: 0; padding: var(--space-2) var(--space-3); font-size: var(--text-xs);"
              title="Copy invite link"
            >
              📋 Copy
            </button>
          </div>
        </div>
        
        <!-- Instructions -->
        <div style="padding: var(--space-3); background: var(--color-bg); border-radius: var(--radius-sm); border: 2px solid var(--color-border);">
          <p style="margin: 0; font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.6;">
            <strong style="color: var(--color-text);">Instructions:</strong><br>
            Share the invite code or link with others. They can:
            <br>• Use the code at <strong>/invite</strong> to join
            <br>• Or click the invite link directly
          </p>
        </div>
      </div>
      
      <div style="margin-bottom: var(--space-4); padding-top: var(--space-4); border-top: 2px solid var(--color-border);">
        <h4 style="margin: 0 0 var(--space-3) 0; font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text);">Or Invite by Email</h4>
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
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useWorkspaceAuth } from '../composables/useWorkspaceAuth'
import axios from 'axios'
import { io } from 'socket.io-client'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const workspace = ref(null)
const channels = ref([])
const currentChannelId = ref(null)
const error = ref('')
const loading = ref(false)
const unreadNotificationCount = ref(0)
const threadNotifications = ref({}) // Map of channelId -> count
const unreadDMCount = ref(0)
const dmConversations = ref([])

// Socket.IO for real-time updates
const socket = ref(null)

// Track authentication failures across socket reconnections (module scope to persist across setupSocket() calls)
let authFailureCount = 0
const MAX_AUTH_FAILURES = 3

const showCreateChannel = ref(false)
const creatingChannel = ref(false)
const createChannelError = ref('')
const newChannel = ref({
  name: '',
  description: '',
  privacy: 'public',
  members: [] // Selected members for private channels
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
const regeneratingCode = ref(false)
const workspaceSettings = ref({
  name: '',
  retentionDays: null,
  allowPublicChannels: true,
  driveLinked: false,
  inviteCode: null
})

const workspaceId = route.params.workspaceId

// Use workspace auth composable
const { isWorkspaceAdmin, hasAdminRole } = useWorkspaceAuth(workspace)

// Notification sound functionality - simple and cross-browser compatible
// Use shared global audio context so all components can use it
// Use Web Audio API with automatic resume - works in all modern browsers

// Play notification sound - simple beep that works everywhere
const playNotificationSound = () => {
  try {
    // Use shared global audio context (accessible from all components)
    if (!window.notificationAudioContext) {
      try {
        window.notificationAudioContext = new (window.AudioContext || window.webkitAudioContext)()
        console.log('🔊 Created new audio context')
      } catch (e) {
        console.error('❌ Failed to create audio context:', e)
        return false
      }
    }
    
    const ctx = window.notificationAudioContext
    
    // Function to actually play the sound
    const playSoundNow = (audioCtx) => {
      try {
        // Create a simple beep
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
        
        console.log('🔔 Notification sound played successfully')
      } catch (e) {
        console.error('❌ Could not play sound:', e)
      }
    }
    
    // Resume if suspended (browsers suspend by default)
    if (ctx.state === 'suspended') {
      console.log('🔄 Audio context suspended, resuming...')
      ctx.resume().then(() => {
        console.log('✅ Audio context resumed, playing sound')
        playSoundNow(ctx)
      }).catch((err) => {
        console.warn('⚠️ Failed to resume audio context, trying to play anyway:', err)
        // Try playing anyway - might work
        try {
          playSoundNow(ctx)
        } catch (e) {
          console.error('❌ Could not play sound after resume failure:', e)
        }
      })
    } else {
      // Context is running, play immediately
      playSoundNow(ctx)
    }
    
    return true
  } catch (e) {
    console.error('❌ Could not initialize notification sound:', e)
    return false
  }
}

// Initialize audio on first user interaction
const initAudioOnInteraction = () => {
  if (window.notificationAudioContext) return
  playNotificationSound() // This will create the context
}

// Register audio initialization on user interaction
if (typeof window !== 'undefined') {
  const initEvents = ['click', 'touchstart', 'keydown', 'pointerdown']
  initEvents.forEach(eventType => {
    document.addEventListener(eventType, initAudioOnInteraction, { once: true, passive: true })
  })
}

// Debounce timers for API calls to prevent rate limiting
const fetchNotificationsTimer = ref(null)
const fetchChannelsTimer = ref(null)
const fetchDMConversationsTimer = ref(null)
const notificationPollInterval = ref(null)

// Debounced versions of fetch functions
const debouncedFetchNotifications = () => {
  if (fetchNotificationsTimer.value) {
    clearTimeout(fetchNotificationsTimer.value)
  }
  fetchNotificationsTimer.value = setTimeout(() => {
    fetchNotifications()
    fetchNotificationsTimer.value = null
  }, 500) // 500ms debounce
}

const debouncedFetchChannels = () => {
  if (fetchChannelsTimer.value) {
    clearTimeout(fetchChannelsTimer.value)
  }
  fetchChannelsTimer.value = setTimeout(() => {
    fetchChannels()
    fetchChannelsTimer.value = null
  }, 500) // 500ms debounce
}

const debouncedFetchDMConversations = () => {
  if (fetchDMConversationsTimer.value) {
    clearTimeout(fetchDMConversationsTimer.value)
  }
  fetchDMConversationsTimer.value = setTimeout(() => {
    fetchDMConversations()
    fetchDMConversationsTimer.value = null
  }, 500) // 500ms debounce
}

// Setup Socket.IO connection
const setupSocket = () => {
  if (socket.value) {
    console.log('🔄 Disconnecting existing socket before reconnecting...')
    socket.value.disconnect()
    socket.value = null
  }
  
  // CRITICAL: Default to localhost:3000 if VITE_API_URL is not set
  // This prevents socket from trying to connect to empty string
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
  
  if (!apiUrl) {
    console.error('❌ No API URL configured for Socket.IO connection')
    return
  }
  
  // CRITICAL: Get token from multiple sources to ensure it's available
  const token = authStore.token || localStorage.getItem('token')
  
  if (!token) {
    console.error('❌ No authentication token available for Socket.IO connection')
    console.error('Auth store token:', authStore.token)
    console.error('LocalStorage token:', localStorage.getItem('token'))
    console.error('Auth store user:', authStore.user)
    console.error('⚠️ Socket.IO connection aborted - no token available')
    // Don't attempt connection without token
    return
  }
  
  console.log('🔌 Initializing Socket.IO connection', {
    apiUrl,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 20) + '...',
    userId: authStore.user?.id || authStore.user?._id
  })
  
  try {
    socket.value = io(apiUrl, {
      auth: {
        token: token, // Use the token we just retrieved
        userId: authStore.user?.id || authStore.user?._id
      },
      // Socket.IO reconnection options
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      // Force new connection to avoid stale connections
      forceNew: false
    })
  } catch (error) {
    console.error('❌ Failed to create Socket.IO instance:', error)
    return
  }
  
  socket.value.on('connect', () => {
    console.log('🔌 Workspace Socket connected')
    
    // Reset auth failure count on successful connection
    authFailureCount = 0
    console.log('✅ Socket connected - authentication successful')
    
    // Fetch notifications immediately on connect to catch any missed while offline
    console.log('📥 Fetching notifications on socket connect...')
    fetchNotifications().catch(err => {
      console.error('❌ Failed to fetch notifications on connect:', err)
    })
    
    // Join workspace room immediately on connect
    if (workspaceId) {
      socket.value.emit('join_workspace', workspaceId)
      console.log('✅ Emitted join_workspace for:', workspaceId)
      
      // Don't immediately refresh - wait a bit and use debounced versions
      setTimeout(() => {
        // Use debounced versions to prevent rate limiting
        debouncedFetchChannels()
        debouncedFetchDMConversations()
      }, 1000) // Wait 1 second after connect
    }
  })
  
  // Handle reconnection
  socket.value.on('reconnect', (attemptNumber) => {
    console.log(`🔌 Workspace Socket reconnected (attempt ${attemptNumber})`)
    
    // Fetch notifications on reconnect
    console.log('📥 Fetching notifications on socket reconnect...')
    fetchNotifications().catch(err => {
      console.error('❌ Failed to fetch notifications on reconnect:', err)
    })
    
    if (workspaceId) {
      socket.value.emit('join_workspace', workspaceId)
      // Use debounced versions to prevent rate limiting on reconnect
      setTimeout(() => {
        debouncedFetchChannels()
        debouncedFetchDMConversations()
      }, 1000)
    }
  })
  
  socket.value.on('disconnect', (reason) => {
    console.log('🔌 Workspace Socket disconnected, reason:', reason)
    // If disconnect was due to server closing, don't try to reconnect immediately
    if (reason === 'io server disconnect') {
      console.log('⚠️ Server closed connection, will not auto-reconnect')
    }
    // If it's an authentication error, log it
    if (reason === 'Authentication error' || reason?.includes('Authentication')) {
      console.error('❌ Socket disconnected due to authentication error:', reason)
    }
  })
  
  // Track authentication failures to prevent infinite reconnection loops
  // Note: authFailureCount is declared at module scope to persist across multiple setupSocket() calls
  
  socket.value.on('connect_error', (error) => {
    const errorMessage = error.message || 'Unknown error'
    console.error('❌ Socket connection error:', {
      message: errorMessage,
      description: error.description,
      type: error.type,
      data: error.data
    })
    
    // Check if it's an authentication error
    const isAuthError = errorMessage.includes('Authentication error') || 
                       errorMessage.includes('token') || 
                       errorMessage.includes('server error') // "server error" is often auth-related
    
    if (isAuthError) {
      authFailureCount++
      console.warn(`⚠️ Authentication error detected (attempt ${authFailureCount}/${MAX_AUTH_FAILURES})`)
      
      if (authFailureCount >= MAX_AUTH_FAILURES) {
        console.error('❌ Too many authentication failures, stopping reconnection attempts')
        // Disconnect and prevent further reconnection attempts
        socket.value.disconnect()
        socket.value.io.opts.reconnection = false
        
        // Show user-friendly message (optional - you can add a toast/notification here)
        console.error('💡 Please refresh the page or re-login to reconnect')
      } else {
        // For auth errors, wait longer before reconnecting
        console.log('⏳ Waiting before retry...')
      }
    } else {
      // Reset counter for non-auth errors
      authFailureCount = 0
    }
  })
  
  socket.value.on('error', (error) => {
    console.error('❌ Socket error:', {
      message: error.message,
      error: error
    })
  })
  
  // Listen for channel updates
  socket.value.on('channel_created', (channel) => {
    console.log('✅ Channel created (real-time):', channel)
    // Add to channels list if not already there
    const exists = channels.value.find(c => {
      const cId = c._id?.toString() || c._id
      const chId = channel._id?.toString() || channel._id
      return cId === chId
    })
    if (!exists) {
      // Ensure unreadCount is initialized
      channels.value.push({
        ...channel,
        unreadCount: channel.unreadCount || 0
      })
    }
  })
  
  socket.value.on('channel_updated', (data) => {
    console.log('✅ Channel updated (real-time):', data)
    // Update channel in list
    const index = channels.value.findIndex(c => {
      const cId = c._id?.toString() || c._id
      const dId = data._id?.toString() || data._id
      return cId === dId
    })
    if (index >= 0) {
      // Preserve unreadCount when updating
      const currentUnreadCount = channels.value[index].unreadCount || 0
      channels.value[index] = { 
        ...channels.value[index], 
        ...data,
        unreadCount: data.unreadCount !== undefined ? data.unreadCount : currentUnreadCount
      }
    } else {
      // Channel not in list, use debounced refresh
      debouncedFetchChannels()
    }
  })
  
  socket.value.on('channel_read', (data) => {
    console.log('✅ Channel read event received:', data)
    // Update unread count for channel
    const channelIdStr = data.channelId?.toString() || data.channelId
    const index = channels.value.findIndex(c => {
      const cId = c._id?.toString() || c._id
      return cId === channelIdStr
    })
    if (index >= 0) {
      // Create new array to trigger reactivity
      const updatedChannels = [...channels.value]
      updatedChannels[index] = {
        ...updatedChannels[index],
        unreadCount: 0
      }
      channels.value = updatedChannels
      
      // Also clear thread notifications for this channel
      if (threadNotifications.value[channelIdStr]) {
        threadNotifications.value = {
          ...threadNotifications.value,
          [channelIdStr]: 0
        }
      }
      
      console.log('✅ Channel unread count reset to 0:', channelIdStr)
      
      // Debounce notification refresh to prevent rate limiting
      debouncedFetchNotifications()
    }
  })
  
  // Listen for workspace activity
  socket.value.on('workspace_activity', (activity) => {
    // Don't refresh on every workspace activity - it's too frequent
    // Only handle specific cases if needed
  })
  
  // Listen for new notifications in real-time
  socket.value.on('notification', async (notification) => {
    console.log('🔔🔔🔔 Notification received via socket:', {
      notificationId: notification._id,
      type: notification.type,
      user: notification.user,
      fromUser: notification.fromUser,
      channel: notification.channel,
      read: notification.read,
      fullNotification: notification
    })
    
    // Check if this notification is for the current user
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId ? String(userId).trim() : null
    let notificationTargetUserId = null
    
    // Extract target user ID from notification
    if (notification.user) {
      if (typeof notification.user === 'string') {
        notificationTargetUserId = notification.user.trim()
      } else if (notification.user._id) {
        notificationTargetUserId = String(notification.user._id).trim()
      } else {
        notificationTargetUserId = String(notification.user).trim()
      }
    }
    
    // Only process notifications that are FOR the current user (notification.user is the target/recipient)
    if (!userIdStr || !notificationTargetUserId) {
      console.log('⏭️ Skipping notification - missing user IDs. userIdStr:', userIdStr, 'notificationTargetUserId:', notificationTargetUserId)
      return
    }
    
    // Normalize both for comparison
    const normalizedTargetUserId = String(notificationTargetUserId).trim()
    const normalizedCurrentUserId = String(userIdStr).trim()
    
    if (normalizedTargetUserId !== normalizedCurrentUserId) {
      console.log('⏭️ Skipping notification - not for current user. Target:', normalizedTargetUserId, 'Current:', normalizedCurrentUserId)
      return
    }
    
    console.log('✅ Notification is for current user, processing...')
    
    // CRITICAL: Check if notification is from the current user (don't notify about own actions)
    // IMPORTANT: notification.fromUser is the person who triggered the notification (e.g., reply author, message sender)
    // notification.user is the person who should receive it (e.g., parent message author, channel member)
    // Handle both populated object format {_id: "...", name: "..."} and string ID format
    let notificationFromUserId = null
    if (notification.fromUser) {
      if (typeof notification.fromUser === 'string') {
        notificationFromUserId = notification.fromUser
      } else if (notification.fromUser._id) {
        notificationFromUserId = notification.fromUser._id.toString()
      } else if (notification.fromUser.toString) {
        notificationFromUserId = notification.fromUser.toString()
      } else {
        notificationFromUserId = String(notification.fromUser)
      }
    }
    
    // Normalize both IDs for comparison (ensure they're both trimmed strings)
    // normalizedCurrentUserId is already declared above, reuse it
    const normalizedFromUserId = notificationFromUserId ? String(notificationFromUserId).trim() : null
    
    // CRITICAL: If the notification is FROM the current user, skip it (they sent the message)
    if (normalizedFromUserId && normalizedCurrentUserId) {
      // Compare as trimmed strings to ensure exact match
      if (normalizedFromUserId === normalizedCurrentUserId) {
        console.log('⏭️ Skipping notification - from current user (own action).', {
          fromUser: normalizedFromUserId,
          currentUser: normalizedCurrentUserId,
          notificationType: notification.type,
          notificationId: notification._id,
          fromUserRaw: notification.fromUser
        })
        return
      }
    }
    
    console.log('✅ Processing notification - type:', notification.type, 'fromUser:', normalizedFromUserId, 'forUser:', normalizedCurrentUserId)
    
    // Update notification count - only if unread
    if (!notification.read) {
      const previousCount = unreadNotificationCount.value
      unreadNotificationCount.value = (unreadNotificationCount.value || 0) + 1
      console.log('📊 Notification count updated:', previousCount, '->', unreadNotificationCount.value)
      
      // Determine if we should play sound
      let shouldPlaySound = false
      let soundReason = ''
      
      // Update thread notifications if it's a thread reply
      if (notification.type === 'thread_reply' && notification.channel) {
        const channelId = notification.channel?._id?.toString() || notification.channel?.toString() || notification.channel
        if (channelId) {
          const currentThreadCount = threadNotifications.value[channelId] || 0
          threadNotifications.value = {
            ...threadNotifications.value,
            [channelId]: currentThreadCount + 1
          }
          console.log('✅ Updated thread notification count for channel:', channelId, 'old:', currentThreadCount, 'new:', currentThreadCount + 1)
          
          // Check if user is viewing this channel
          const currentChannelIdStr = currentChannelId.value?.toString()
          const isViewingDM = route.name === 'DirectMessages' || route.name === 'DirectMessageChat'
          const isViewingThisChannel = channelId === currentChannelIdStr && !isViewingDM
          
          // Play notification sound if not viewing this channel
          if (!isViewingThisChannel) {
            shouldPlaySound = true
            soundReason = 'thread notification (not viewing channel)'
          } else {
            soundReason = 'thread notification (viewing channel)'
          }
        } else {
          console.warn('⚠️ Thread notification received but channel ID is missing:', notification)
        }
      } else {
        // For other notification types, always play sound when a new notification arrives
        // (not just when count increases, because count might have been updated elsewhere)
        shouldPlaySound = true
        soundReason = `notification (type: ${notification.type})`
      }
      
      // Play sound if appropriate
      if (shouldPlaySound) {
        console.log(`🔔 Playing sound for ${soundReason}`)
        const soundPlayed = playNotificationSound() // Fire and forget, but log result
        if (!soundPlayed) {
          console.warn('⚠️ Sound play returned false - audio may not be initialized')
        }
      } else {
        console.log(`⏭️ Not playing sound - ${soundReason}`)
      }
      
      // CRITICAL: Refresh notifications list in real-time
      // Fetch notifications to update the UI immediately
      console.log('🔄 Fetching notifications to update UI...')
      debouncedFetchNotifications()
    } else {
      console.log('⏭️ Skipping notification - already read')
    }
  })
  
  // Listen for notification count updates
  socket.value.on('notification_count_updated', (data) => {
    console.log('🔔 Notification count updated event received:', data)
    
    // CRITICAL: Don't blindly trust the backend count - it might include sender's own notifications
    // We'll fetch the actual count from the API which filters correctly
    // But we can use this as a hint that something changed
    if (data.count !== undefined && data.count !== null) {
      // Only update if it's higher than current (might be a new notification)
      // But we'll verify by fetching notifications to ensure sender's notifications are filtered
      const currentCount = unreadNotificationCount.value || 0
      if (data.count > currentCount) {
        console.log('📊 Notification count increased, will verify by fetching notifications...')
        // Fetch notifications to get the correct filtered count
        debouncedFetchNotifications()
      } else {
        // If count decreased or stayed same, trust the backend
        unreadNotificationCount.value = data.count
      }
    }
  })
  
  // Listen for new messages to update unread counts in real-time
  socket.value.on('message_created', (message) => {
    console.log('📨 Message created event received in workspace:', message)
    
    // Check if this is our own message - don't update unread counts for own messages
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId?.toString()
    const messageUserId = message.user?._id?.toString() || message.user?.toString() || message.user
    const isOwnMessage = userIdStr && messageUserId && userIdStr === messageUserId
    
    if (isOwnMessage) {
      console.log('⏭️ Skipping own message for unread count')
      return
    }
    
    // Skip thread replies for unread counts (they have their own notifications)
    if (message.threadParent) {
      console.log('⏭️ Skipping thread reply for unread count (handled by notifications)')
      // Thread replies are handled by notifications - don't need to fetch immediately
      // The notification event will handle updating counts
      return
    }
    
    // Normalize channel ID - handle all possible formats
    let messageChannelId = null
    if (message.channel) {
      if (typeof message.channel === 'string') {
        messageChannelId = message.channel
      } else if (message.channel._id) {
        messageChannelId = message.channel._id.toString()
      } else if (message.channel.toString) {
        messageChannelId = message.channel.toString()
      }
    }
    
    const currentChannelIdStr = currentChannelId.value?.toString() || null
    const isViewingDM = route.name === 'DirectMessages' || route.name === 'DirectMessageChat'
    const isViewingThisChannel = messageChannelId === currentChannelIdStr && !isViewingDM
    
    console.log('🔍 Comparing channel IDs - message:', messageChannelId, 'current:', currentChannelIdStr)
    console.log('📊 Current channels:', channels.value.map(c => ({ id: c._id?.toString(), name: c.name, unread: c.unreadCount })))
    
    if (!messageChannelId) {
      console.error('❌ Could not determine message channel ID')
      // Debounce channel refresh to prevent rate limiting
      debouncedFetchChannels()
      return
    }
    
    // Update unread count for the channel if not currently viewing it
    if (!isViewingThisChannel) {
      const index = channels.value.findIndex(c => {
        const channelId = c._id?.toString() || c._id
        return channelId === messageChannelId
      })
      
      if (index >= 0) {
        // Increment unread count - use Vue's reactivity with proper array replacement
        const currentCount = channels.value[index].unreadCount || 0
        const newCount = currentCount + 1
        
        // Create new array to trigger reactivity
        const updatedChannels = [...channels.value]
        updatedChannels[index] = {
          ...updatedChannels[index],
          unreadCount: newCount
        }
        channels.value = updatedChannels
        
        console.log('✅ Updated unread count for channel:', messageChannelId, 'old:', currentCount, 'new:', newCount)
        
        // Play notification sound for new message in channel
        console.log('🔔 Playing sound for new channel message')
        playNotificationSound()
      } else {
        // Channel not in list, debounce refresh to prevent rate limiting
        console.log('⚠️ Channel not in list, will refresh channels')
        debouncedFetchChannels()
      }
    } else {
      // User is viewing this channel, ensure unread count is 0
      const index = channels.value.findIndex(c => {
        const channelId = c._id?.toString() || c._id
        return channelId === messageChannelId
      })
      if (index >= 0) {
        const currentCount = channels.value[index].unreadCount || 0
        if (currentCount > 0) {
          const updatedChannels = [...channels.value]
          updatedChannels[index] = {
            ...updatedChannels[index],
            unreadCount: 0
          }
          channels.value = updatedChannels
          console.log('✅ Reset unread count to 0 for current channel')
        }
      }
    }
    
    // Don't refresh notifications on every message - too frequent
    // Only refresh if we haven't refreshed recently
  })
  
  // Listen for thread reply events to update thread notification counts
  socket.value.on('thread_reply_created', (message) => {
    console.log('🧵 Thread reply created event received in workspace:', message)
    // Don't fetch notifications - the notification event will handle it
  })
  
  // Listen for DM messages to update sidebar unread count
  socket.value.on('dm_message', (data) => {
    console.log('💬 DM message received in workspace:', data)
    
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId?.toString()
    
    if (!userIdStr) {
      console.error('❌ No user ID found for DM update')
      fetchDMConversations()
      return
    }
    
    // Check if this message is from the current user FIRST - before any state updates
    const messageSenderId = data.message?.sender?._id?.toString() || data.message?.sender?.toString() || data.message?.sender
    const isOwnMessage = messageSenderId === userIdStr
    
    if (isOwnMessage) {
      console.log('⏭️ Skipping own DM message - no unread count update needed')
      // Still update lastMessage and lastMessageAt for UI consistency, but don't update unreadCount
      if (data.conversation) {
        const convId = data.conversation._id?.toString() || data.conversation._id
        const convIndex = dmConversations.value.findIndex(c => {
          const cId = c._id?.toString() || c._id
          return cId === convId
        })
        
        if (convIndex >= 0) {
          // Only update lastMessage and lastMessageAt, preserve existing unreadCount
          dmConversations.value[convIndex] = {
            ...dmConversations.value[convIndex],
            lastMessage: data.message,
            lastMessageAt: data.message?.createdAt || new Date()
          }
        } else {
          // New conversation from own message - should not happen, but handle gracefully
          const filteredUnreadCount = {}
          if (data.conversation.unreadCount) {
            if (typeof data.conversation.unreadCount === 'object' && !Array.isArray(data.conversation.unreadCount)) {
              // Only keep current user's unread count
              filteredUnreadCount[userIdStr] = data.conversation.unreadCount[userIdStr] || 0
            }
          }
          dmConversations.value.push({
            ...data.conversation,
            unreadCount: filteredUnreadCount,
            lastMessage: data.message,
            lastMessageAt: data.message?.createdAt || new Date()
          })
        }
      }
      return // Exit early - no unread count update, no sound
    }
    
    // Check if user is currently viewing this DM conversation
    const currentConvId = route.params.conversationId?.toString()
    const messageConvId = data.conversation?._id?.toString() || data.conversation?._id
    const isViewingThisDM = route.name === 'DirectMessageChat' && currentConvId === messageConvId
    
    // Update unread count immediately from the conversation data
    if (data.conversation) {
      // Filter unreadCount to only include current user's count before saving to state
      let filteredUnreadCount = {}
      if (data.conversation.unreadCount) {
        if (data.conversation.unreadCount instanceof Map) {
          // Convert Map to object with only current user's count
          filteredUnreadCount[userIdStr] = data.conversation.unreadCount.get(userIdStr) || 0
        } else if (typeof data.conversation.unreadCount === 'object' && !Array.isArray(data.conversation.unreadCount)) {
          // Only keep current user's unread count from the object
          filteredUnreadCount[userIdStr] = data.conversation.unreadCount[userIdStr] || 0
        } else if (typeof data.conversation.unreadCount === 'number') {
          // If it's a number, assume it's for current user (legacy format)
          filteredUnreadCount[userIdStr] = data.conversation.unreadCount
        }
      }
      
      // Find or update conversation in list
      const convId = data.conversation._id?.toString() || data.conversation._id
      const convIndex = dmConversations.value.findIndex(c => {
        const cId = c._id?.toString() || c._id
        return cId === convId
      })
      
      if (convIndex >= 0) {
        // Update existing conversation with filtered unreadCount
        dmConversations.value[convIndex] = {
          ...dmConversations.value[convIndex],
          ...data.conversation,
          unreadCount: filteredUnreadCount, // Use filtered unreadCount
          lastMessage: data.message,
          lastMessageAt: data.message?.createdAt || new Date()
        }
      } else {
        // Add new conversation with filtered unreadCount
        dmConversations.value.push({
          ...data.conversation,
          unreadCount: filteredUnreadCount, // Use filtered unreadCount
          lastMessage: data.message,
          lastMessageAt: data.message?.createdAt || new Date()
        })
      }
      
      // Recalculate total unread DM count
      const previousUnreadCount = unreadDMCount.value
      unreadDMCount.value = dmConversations.value.reduce((total, conv) => {
        if (conv.unreadCount instanceof Map) {
          return total + (conv.unreadCount.get(userIdStr) || 0)
        } else if (typeof conv.unreadCount === 'object' && !Array.isArray(conv.unreadCount)) {
          return total + (conv.unreadCount[userIdStr] || 0)
        } else if (typeof conv.unreadCount === 'number') {
          // Handle case where unreadCount might be a number for the current user
          return total + (conv.unreadCount || 0)
        }
        return total
      }, 0)
      
      console.log('✅ Updated DM unread count:', unreadDMCount.value, 'isOwnMessage:', isOwnMessage, 'conversations:', dmConversations.value.length, 'previous:', previousUnreadCount)
      
      // Play notification sound if:
      // 1. Not our own message (already checked above)
      // 2. Not currently viewing this conversation
      // 3. Unread count increased
      if (!isViewingThisDM && unreadDMCount.value > previousUnreadCount) {
        console.log('🔔 Playing sound for new DM message')
        playNotificationSound() // Returns boolean, not Promise - no .catch() needed
      } else {
        if (isViewingThisDM) {
          console.log('⏭️ Not playing sound - viewing this DM')
        } else if (unreadDMCount.value <= previousUnreadCount) {
          console.log('⏭️ Not playing sound - unread count did not increase')
        }
      }
    } else {
      // Fallback to debounced refresh
      console.log('⚠️ No conversation data in DM message, will refresh')
      debouncedFetchDMConversations()
    }
  })
  
  // Also listen for dm_unread_update events
  socket.value.on('dm_unread_update', (data) => {
    console.log('💬 DM unread update event:', data)
    // Use debounced version to prevent rate limiting
    debouncedFetchDMConversations()
  })
}

// Polling interval ref (must be declared at top level)
const pollInterval = ref(null)

onMounted(async () => {
  // Don't attempt audio initialization on mount - browsers require user interaction
  // Audio will be initialized on first user interaction (click, keydown, etc.)
  await nextTick()
  
  await fetchWorkspace()
  
  // Setup Socket.IO for real-time updates BEFORE fetching data
  // This ensures we don't miss any real-time events
  // CRITICAL: Ensure token is available before setting up socket
  const token = authStore.token || localStorage.getItem('token')
  if (!token) {
    console.error('❌ Cannot setup Socket.IO - no token available')
    console.error('Attempting to fetch user to refresh token...')
    try {
      await authStore.fetchUser()
      // Retry socket setup if token is now available
      const retryToken = authStore.token || localStorage.getItem('token')
      if (retryToken) {
        console.log('✅ Token retrieved, setting up socket...')
        setupSocket()
      } else {
        console.error('❌ Still no token after fetchUser, cannot connect Socket.IO')
        // Don't return - still try to fetch channels even without socket
      }
    } catch (error) {
      console.error('❌ Failed to fetch user:', error)
      // Don't return - still try to fetch channels even if socket setup fails
    }
  } else {
    setupSocket()
  }
  
  // Wait a bit for socket to connect and join workspace (if socket was set up)
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // Now fetch data - always fetch even if socket setup failed
  try {
    await fetchChannels()
  } catch (error) {
    console.error('❌ Failed to fetch channels in onMounted:', error)
  }
  
  try {
    await fetchNotifications()
  } catch (error) {
    console.error('❌ Failed to fetch notifications in onMounted:', error)
  }
  
  try {
    await fetchDMConversations()
  } catch (error) {
    console.error('❌ Failed to fetch DM conversations in onMounted:', error)
  }
  
  // If we have channels and no channel/DM is selected, redirect to the first channel (welcome)
  if (channels.value.length > 0 && !route.params.channelId && route.name !== 'DirectMessages' && route.name !== 'DirectMessageChat') {
    router.push(`/workspace/${workspaceId}/channel/${channels.value[0]._id}`)
  }
  
  // Note: Real-time updates via Socket.IO, no need for aggressive polling
  // Only poll if Socket.IO is disconnected (fallback)
  const startPolling = () => {
    if (pollInterval.value) clearInterval(pollInterval.value)
    pollInterval.value = setInterval(() => {
      // Only poll if socket is disconnected
      if (!socket.value || !socket.value.connected) {
        console.log('⚠️ Socket disconnected, polling for updates')
        // Use debounced versions and stagger them to prevent rate limiting
        setTimeout(() => debouncedFetchChannels(), 0)
        setTimeout(() => debouncedFetchNotifications(), 200)
        setTimeout(() => debouncedFetchDMConversations(), 400)
      }
    }, 60000) // 60 seconds as fallback - less frequent to avoid rate limiting
  }
  
  // Start polling as fallback (Socket.IO should handle real-time updates)
  startPolling()
  
  // Also poll for notifications if socket is disconnected
  const startNotificationPolling = () => {
    if (notificationPollInterval.value) clearInterval(notificationPollInterval.value)
    notificationPollInterval.value = setInterval(() => {
      // Only poll if socket is disconnected
      if (!socket.value || !socket.value.connected) {
        console.log('⚠️ Socket disconnected, polling for notifications...')
        debouncedFetchNotifications()
      }
    }, 30000) // Poll every 30 seconds when disconnected
  }
  
  // Start notification polling as fallback
  startNotificationPolling()
})

// Cleanup on unmount (must be at top level, not inside onMounted)
onBeforeUnmount(() => {
  if (pollInterval.value) clearInterval(pollInterval.value)
  if (fetchNotificationsTimer.value) clearTimeout(fetchNotificationsTimer.value)
  if (fetchChannelsTimer.value) clearTimeout(fetchChannelsTimer.value)
  if (fetchDMConversationsTimer.value) clearTimeout(fetchDMConversationsTimer.value)
  if (notificationPollInterval.value) clearInterval(notificationPollInterval.value)
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
  
  // Cleanup audio context (shared global context)
  if (window.notificationAudioContext && window.notificationAudioContext.state !== 'closed') {
    window.notificationAudioContext.close().catch(() => {})
    window.notificationAudioContext = null
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
    
    // Ensure inviteCode exists (for existing workspaces)
    if (!workspace.value.inviteCode) {
      // The backend should have generated it, but if not, we'll show a message
      console.warn('⚠️ Workspace missing inviteCode, backend should generate it')
    }
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
    const fetchedChannels = response.data || []
    
    // Ensure unreadCount is always a number
    channels.value = fetchedChannels.map(ch => ({
      ...ch,
      unreadCount: typeof ch.unreadCount === 'number' ? ch.unreadCount : 0
    }))
    
    if (!Array.isArray(channels.value)) {
      console.error('❌ Invalid channels data:', channels.value)
      channels.value = []
    }
    
    console.log('✅ Channels processed with unread counts:', channels.value.map(c => ({ name: c.name, unreadCount: c.unreadCount })))
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on channels fetch, will retry later')
      // Don't clear channels on rate limit, keep existing data
      error.value = ''
    } else {
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
    }
  } finally {
    loading.value = false
  }
}

const fetchNotifications = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId?.toString()
    
    // Get thread notifications grouped by channel
    const notificationsResponse = await axios.get(`${apiUrl}/api/notifications?unreadOnly=true&limit=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const notifications = Array.isArray(notificationsResponse.data) ? notificationsResponse.data : []
    
    // CRITICAL: Filter out notifications from the current user (sender shouldn't see their own notifications)
    const filteredNotifications = notifications.filter(notif => {
      const notifFromUserId = notif.fromUser?._id?.toString() || notif.fromUser?.toString() || notif.fromUser
      const notifTargetUserId = notif.user?._id?.toString() || notif.user?.toString() || notif.user
      
      // Only include if:
      // 1. The notification is FOR the current user (notif.user === current user)
      // 2. The notification is NOT FROM the current user (notif.fromUser !== current user)
      const isForCurrentUser = userIdStr && notifTargetUserId && userIdStr === notifTargetUserId
      const isFromCurrentUser = userIdStr && notifFromUserId && userIdStr === notifFromUserId
      
      if (isForCurrentUser && !isFromCurrentUser) {
        return true
      } else if (isFromCurrentUser) {
        console.log('⏭️ Filtering out notification from current user:', notif.type, 'fromUser:', notifFromUserId)
        return false
      }
      return false
    })
    
    // Update unread count to only include filtered notifications
    unreadNotificationCount.value = filteredNotifications.length
    
    const threadNotifs = filteredNotifications.filter(n => n.type === 'thread_reply' && n.channel)
    
    // Group by channel (handle both populated and non-populated channel objects)
    const channelCounts = {}
    threadNotifs.forEach(notif => {
      const channelId = notif.channel?._id?.toString() || notif.channel?.toString() || notif.channel
      if (channelId) {
        channelCounts[channelId] = (channelCounts[channelId] || 0) + 1
      }
    })
    
    threadNotifications.value = channelCounts
    console.log('✅ Fetched notifications - unread count:', unreadNotificationCount.value, 'thread notifications:', channelCounts, 'filtered from:', notifications.length, 'total')
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on notifications fetch, will retry later')
      // Don't log as error, just warn - it's expected during high activity
    } else {
      console.error('❌ Failed to fetch notifications:', error)
    }
  }
}

const fetchDMConversations = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.get(`${apiUrl}/api/direct-messages/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    dmConversations.value = Array.isArray(response.data) ? response.data : []
    
    // Calculate total unread DM count
    const userId = authStore.user?._id || authStore.user?.id
    const userIdStr = userId?.toString()
    
    if (!userIdStr) {
      console.error('❌ No user ID found for DM count calculation')
      unreadDMCount.value = 0
      return
    }
    
    unreadDMCount.value = dmConversations.value.reduce((total, conv) => {
      let count = 0
      
      if (conv.unreadCount instanceof Map) {
        count = conv.unreadCount.get(userIdStr) || 0
      } else if (typeof conv.unreadCount === 'object' && conv.unreadCount !== null && !Array.isArray(conv.unreadCount)) {
        count = conv.unreadCount[userIdStr] || 0
      } else if (typeof conv.unreadCount === 'number') {
        // If unreadCount is a number, use it directly (might be for single-user context)
        count = conv.unreadCount || 0
      }
      
      return total + count
    }, 0)
    
    console.log('✅ Calculated DM unread count:', unreadDMCount.value, 'from', dmConversations.value.length, 'conversations')
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn('⚠️ Rate limited on DM conversations fetch, will retry later')
      // Don't clear conversations on rate limit, keep existing data
    } else {
      console.error('❌ Failed to fetch DM conversations:', error)
    }
  }
}

const selectChannel = (channelId) => {
  currentChannelId.value = channelId
  router.push(`/workspace/${workspaceId}/channel/${channelId}`).catch(() => {
    // Ignore navigation errors (e.g., navigating to same route)
  })
}

// Watch route changes to update current channel
watch(() => route.params.channelId, async (newChannelId) => {
  if (newChannelId) {
    currentChannelId.value = newChannelId
    
    // Reset unread count for the channel being viewed
    const index = channels.value.findIndex(c => {
      const cId = c._id?.toString() || c._id
      return cId === newChannelId?.toString()
    })
    if (index >= 0 && channels.value[index].unreadCount > 0) {
      const updatedChannels = [...channels.value]
      updatedChannels[index] = {
        ...updatedChannels[index],
        unreadCount: 0
      }
      channels.value = updatedChannels
    }
    
    // Clear thread notifications for this channel
    if (threadNotifications.value[newChannelId]) {
      threadNotifications.value = {
        ...threadNotifications.value,
        [newChannelId]: 0
      }
    }
    
    // Debounce notification refresh when viewing channel
    debouncedFetchNotifications()
  }
}, { immediate: true })

// Watch for route changes to DM views to refresh DM counts
watch(() => route.name, (newRouteName) => {
  if (newRouteName === 'DirectMessages' || newRouteName === 'DirectMessageChat') {
    // Clear current channel selection when viewing DMs
    currentChannelId.value = null
    // Use debounced version when viewing DMs
    debouncedFetchDMConversations()
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
    
    // Prepare members array - convert to IDs only
    const memberIds = []
    if (newChannel.value.privacy === 'private' && newChannel.value.members && newChannel.value.members.length > 0) {
      newChannel.value.members.forEach(member => {
        const memberId = member._id || member.id || member
        if (memberId) {
          memberIds.push(memberId.toString())
        }
      })
    }
    
    const response = await axios.post(`${apiUrl}/api/channels`, {
      name: newChannel.value.name.trim(),
      workspace: workspaceId,
      privacy: newChannel.value.privacy,
      description: newChannel.value.description.trim() || undefined,
      members: newChannel.value.privacy === 'private' ? memberIds : undefined
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
      privacy: 'public',
      members: []
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
    privacy: 'public',
    members: []
  }
  createChannelError.value = ''
}

// Channel member selection helpers
const isMemberSelected = (member) => {
  const memberId = member._id || member.id
  return newChannel.value.members.some(m => (m._id || m.id) === memberId)
}

const toggleChannelMember = (member) => {
  const memberId = member._id || member.id
  const currentUserId = authStore.user?.id || authStore.user?._id
  
  // Don't allow removing yourself (you're always a member)
  if (memberId === currentUserId) return
  
  const index = newChannel.value.members.findIndex(m => (m._id || m.id) === memberId)
  if (index >= 0) {
    newChannel.value.members.splice(index, 1)
  } else {
    newChannel.value.members.push(member)
  }
}

const workspaceMembers = computed(() => {
  if (!workspace.value) return []
  
  const members = []
  
  // Add admin
  if (workspace.value.admin) {
    const adminId = workspace.value.admin._id || workspace.value.admin
    const currentUserId = authStore.user?.id || authStore.user?._id
    
    // Don't show current user in the list (they're always added automatically)
    if (adminId?.toString() !== currentUserId?.toString()) {
      members.push({
        _id: adminId,
        id: adminId,
        name: workspace.value.admin.name,
        email: workspace.value.admin.email,
        avatar: workspace.value.admin.avatar
      })
    }
  }
  
  // Add other members
  if (workspace.value.members) {
    workspace.value.members.forEach(member => {
      const user = member.user || member
      if (user && user._id) {
        const userId = user._id || user
        const currentUserId = authStore.user?.id || authStore.user?._id
        
        // Don't show current user in the list
        if (userId?.toString() !== currentUserId?.toString()) {
          members.push({
            _id: userId,
            id: userId,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          })
        }
      }
    })
  }
  
  return members
})

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
      driveLinked: response.data.driveLinked || false,
      inviteCode: response.data.inviteCode || null
    }
    
    // Update workspace inviteCode if returned
    if (response.data.inviteCode) {
      if (workspace.value) {
        workspace.value.inviteCode = response.data.inviteCode
      }
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

const regenerateInviteCode = async () => {
  if (!isWorkspaceAdmin.value) return
  
  regeneratingCode.value = true
  
  try {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    const token = authStore.token || localStorage.getItem('token')
    
    const response = await axios.post(`${apiUrl}/api/workspaces/${workspaceId}/invite-code/regenerate`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    // Update workspace with new code
    if (workspace.value) {
      workspace.value.inviteCode = response.data.inviteCode
    }
    
    // Refresh workspace data
    await fetchWorkspace()
  } catch (error) {
    console.error('❌ Failed to regenerate invite code:', error)
    alert(error.response?.data?.message || 'Failed to regenerate invite code')
  } finally {
    regeneratingCode.value = false
  }
}

const copyInviteCode = (event) => {
  const code = workspace.value?.inviteCode || workspaceSettings.value?.inviteCode
  if (!code) {
    alert('Invite code not available yet')
    return
  }
  
  const input = document.getElementById('invite-code-input')
  if (input) {
    input.select()
    input.setSelectionRange(0, 99999) // For mobile devices
    document.execCommand('copy')
    
    // Show feedback
    const btn = event?.target?.closest('button')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = '✓ Copied!'
      setTimeout(() => {
        btn.textContent = originalText
      }, 2000)
    }
  } else {
    // Fallback to clipboard API
    navigator.clipboard.writeText(code).then(() => {
      alert('Invite code copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy. Code: ' + code)
    })
  }
}

// Computed invite link
const inviteLink = computed(() => {
  const baseUrl = window.location.origin
  return `${baseUrl}/invite`
})

// Copy invite link
const copyInviteLink = (event) => {
  const link = inviteLink.value
  
  const input = document.getElementById('invite-link-input')
  if (input) {
    input.select()
    input.setSelectionRange(0, 99999) // For mobile devices
    document.execCommand('copy')
    
    // Show feedback
    const btn = event?.target?.closest('button')
    if (btn) {
      const originalText = btn.textContent
      btn.textContent = '✓ Copied!'
      setTimeout(() => {
        btn.textContent = originalText
      }, 2000)
    }
  } else {
    // Fallback to clipboard API
    navigator.clipboard.writeText(link).then(() => {
      alert('Invite link copied to clipboard!')
    }).catch(() => {
      alert('Failed to copy. Link: ' + link)
    })
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

.btn-icon-header {
  position: relative;
  background: transparent;
  border: 2px solid var(--color-text);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-lg);
  transition: all var(--transition-fast);
  text-decoration: none;
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-header:hover {
  background: var(--color-bg-alt);
  transform: scale(1.1);
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--matisse-red);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  border: 2px solid var(--color-bg);
}

.thread-notification-badge {
  background: var(--matisse-yellow);
  color: var(--bauhaus-black);
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
  margin-left: auto;
  flex-shrink: 0;
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

