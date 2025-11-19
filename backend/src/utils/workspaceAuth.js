/**
 * Utility functions for checking workspace permissions
 */

/**
 * Check if user is the workspace admin (owner)
 */
export const isWorkspaceAdmin = (workspace, userId) => {
  if (!workspace || !userId) return false
  
  try {
    const adminId = workspace.admin?._id || workspace.admin
    if (!adminId) return false
    
    const adminIdStr = adminId.toString()
    const userIdStr = userId.toString()
    return adminIdStr === userIdStr
  } catch (error) {
    console.error('Error checking workspace admin:', error)
    return false
  }
}

/**
 * Check if user is a workspace member (admin or regular member)
 */
export const isWorkspaceMember = (workspace, userId) => {
  if (!workspace || !userId) return false
  
  try {
    // Check if user is the admin
    if (isWorkspaceAdmin(workspace, userId)) return true
    
    // Check if user is in members array
    if (!workspace.members || !Array.isArray(workspace.members)) return false
    
    const userIdStr = userId.toString()
    return workspace.members.some(m => {
      if (!m) return false
      const memberId = m.user?._id || m.user
      if (!memberId) return false
      return memberId.toString() === userIdStr
    })
  } catch (error) {
    console.error('Error checking workspace member:', error)
    return false
  }
}

/**
 * Check if user has admin role in workspace (either owner or member with admin role)
 */
export const hasWorkspaceAdminRole = (workspace, userId) => {
  if (!workspace || !userId) return false
  
  try {
    // Check if user is the workspace owner
    if (isWorkspaceAdmin(workspace, userId)) return true
    
    // Check if user is a member with admin role
    if (!workspace.members || !Array.isArray(workspace.members)) return false
    
    const userIdStr = userId.toString()
    const member = workspace.members.find(m => {
      if (!m) return false
      const memberId = m.user?._id || m.user
      if (!memberId) return false
      return memberId.toString() === userIdStr
    })
    
    return member?.role === 'admin'
  } catch (error) {
    console.error('Error checking workspace admin role:', error)
    return false
  }
}

/**
 * Get user's role in workspace
 */
export const getUserWorkspaceRole = (workspace, userId) => {
  if (!workspace || !userId) return null
  
  try {
    if (isWorkspaceAdmin(workspace, userId)) {
      return 'owner'
    }
    
    if (!workspace.members || !Array.isArray(workspace.members)) return null
    
    const userIdStr = userId.toString()
    const member = workspace.members.find(m => {
      if (!m) return false
      const memberId = m.user?._id || m.user
      if (!memberId) return false
      return memberId.toString() === userIdStr
    })
    
    return member?.role || null
  } catch (error) {
    console.error('Error getting user workspace role:', error)
    return null
  }
}

