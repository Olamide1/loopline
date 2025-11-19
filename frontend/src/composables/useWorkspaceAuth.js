import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'

/**
 * Composable for workspace authentication and permissions
 */
export function useWorkspaceAuth(workspace) {
  const authStore = useAuthStore()
  
  /**
   * Check if current user is the workspace admin (owner)
   */
  const isWorkspaceAdmin = computed(() => {
    if (!workspace.value || !authStore.user) return false
    
    const adminId = workspace.value.admin?._id || workspace.value.admin
    const userId = authStore.user.id || authStore.user._id
    
    return adminId?.toString() === userId?.toString()
  })
  
  /**
   * Check if current user is a workspace member
   */
  const isWorkspaceMember = computed(() => {
    if (!workspace.value || !authStore.user) return false
    
    // Check if user is the admin
    if (isWorkspaceAdmin.value) return true
    
    // Check if user is in members array
    const userId = authStore.user.id || authStore.user._id
    return workspace.value.members?.some(m => {
      const memberId = m.user?._id || m.user
      return memberId?.toString() === userId?.toString()
    })
  })
  
  /**
   * Check if current user has admin role (owner or member with admin role)
   */
  const hasAdminRole = computed(() => {
    if (!workspace.value || !authStore.user) return false
    
    // Check if user is the workspace owner
    if (isWorkspaceAdmin.value) return true
    
    // Check if user is a member with admin role
    const userId = authStore.user.id || authStore.user._id
    const member = workspace.value.members?.find(m => {
      const memberId = m.user?._id || m.user
      return memberId?.toString() === userId?.toString()
    })
    
    return member?.role === 'admin'
  })
  
  /**
   * Get current user's role in workspace
   */
  const userRole = computed(() => {
    if (!workspace.value || !authStore.user) return null
    
    if (isWorkspaceAdmin.value) {
      return 'owner'
    }
    
    const userId = authStore.user.id || authStore.user._id
    const member = workspace.value.members?.find(m => {
      const memberId = m.user?._id || m.user
      return memberId?.toString() === userId?.toString()
    })
    
    return member?.role || null
  })
  
  return {
    isWorkspaceAdmin,
    isWorkspaceMember,
    hasAdminRole,
    userRole
  }
}

