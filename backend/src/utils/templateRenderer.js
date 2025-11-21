/**
 * Enhanced template renderer for webhook message templates
 * Supports:
 * - Nested field access: {{data.repository.name}}
 * - Conditional logic: {{#if data.success}}✅{{else}}❌{{/if}}
 * - Default values: {{data.title || 'Untitled'}}
 * - Basic operations
 */

/**
 * Get nested property from object using dot notation
 */
const getNestedProperty = (obj, path) => {
  if (!path || !obj) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

/**
 * Evaluate simple expressions like "data.success || false"
 */
const evaluateExpression = (expr, context) => {
  // Handle default values: value || 'default'
  if (expr.includes('||')) {
    const [left, right] = expr.split('||').map(s => s.trim())
    const leftValue = evaluateExpression(left, context)
    return leftValue !== undefined && leftValue !== null && leftValue !== '' ? leftValue : evaluateExpression(right, context)
  }
  
  // Handle boolean expressions
  if (expr === 'true') return true
  if (expr === 'false') return false
  
  // Handle string literals
  if ((expr.startsWith('"') && expr.endsWith('"')) || 
      (expr.startsWith("'") && expr.endsWith("'"))) {
    return expr.slice(1, -1)
  }
  
  // Handle numbers
  if (!isNaN(expr) && expr.trim() !== '') {
    return Number(expr)
  }
  
  // Treat as property path
  return getNestedProperty(context, expr)
}

/**
 * Render template with enhanced features
 */
export const renderTemplate = (template, data = {}) => {
  if (!template) return ''
  
  let result = template
  
  // Handle conditional blocks: {{#if path}}content{{else}}other{{/if}}
  const conditionalRegex = /\{\{#if\s+([^}]+)\}\}(.*?)(?:\{\{else\}\}(.*?))?\{\{\/if\}\}/gs
  result = result.replace(conditionalRegex, (match, condition, trueContent, falseContent = '') => {
    const conditionValue = evaluateExpression(condition.trim(), data)
    const isTruthy = conditionValue !== undefined && conditionValue !== null && conditionValue !== '' && conditionValue !== false && conditionValue !== 0
    return isTruthy ? trueContent : falseContent
  })
  
  // Handle nested field access and expressions: {{data.repository.name}} or {{data.title || 'Untitled'}}
  const fieldRegex = /\{\{([^}]+)\}\}/g
  result = result.replace(fieldRegex, (match, expr) => {
    const trimmed = expr.trim()
    
    // Handle default values
    if (trimmed.includes('||')) {
      const value = evaluateExpression(trimmed, data)
      return value !== undefined && value !== null ? String(value) : ''
    }
    
    // Regular field access
    const value = getNestedProperty(data, trimmed)
    
    // Handle complex objects by stringifying them
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
    }
    
    // Return empty string if not found (don't show {{...}} in output)
    return ''
  })
  
  return result
}

/**
 * Preview template with sample data
 */
export const previewTemplate = (template, sampleData = null) => {
  if (!sampleData) {
    // Default sample data
    sampleData = {
      event: 'webhook',
      data: {
        action: 'opened',
        repository: {
          name: 'my-repo',
          full_name: 'user/my-repo'
        },
        pull_request: {
          title: 'Fix bug in login',
          number: 42
        },
        success: true,
        message: 'Build completed successfully'
      }
    }
  }
  
  return renderTemplate(template, sampleData)
}

