import React from 'react'

interface EntityTableProps {
  data: any[]
  onEdit?: (item: any) => void
  onDelete?: (item: any) => void
}

const formatValue = (key: string, value: any): string => {
  if (value === null || value === undefined) {
    return '-'
  }
  
  // Date formatting
  if (key.includes('Date') || key.includes('At')) {
    try {
      return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return String(value)
    }
  }
  
  // Boolean formatting
  if (typeof value === 'boolean') {
    return value ? '✅ Yes' : '❌ No'
  }
  
  // Status badge formatting
  if (key === 'status') {
    const statusMap: Record<string, string> = {
      'todo': '🕒 To Do',
      'in-progress': '🔄 In Progress',
      'done': '✅ Done',
      'active': '🟢 Active',
      'inactive': '🔴 Inactive',
      'archived': '📦 Archived'
    }
    return statusMap[value] || value
  }
  
  // Risk level formatting
  if (key === 'probability' || key === 'impact') {
    const level = parseInt(value)
    const levels = ['', '🟢 Very Low', '🟡 Low', '🟠 Medium', '🔴 High', '🔴 Very High']
    return levels[level] || value
  }
  
  // Progress formatting
  if (key === 'progress') {
    return `${value}% 📊`
  }
  
  // Truncate long text
  const stringValue = String(value)
  if (stringValue.length > 50) {
    return stringValue.substring(0, 47) + '...'
  }
  
  return stringValue
}

const getColumnHeader = (key: string): string => {
  // Convert camelCase to Title Case
  const formatted = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
  
  // Add icons for common fields
  const iconMap: Record<string, string> = {
    'Name': '📝 Name',
    'Title': '📝 Title',
    'Objective': '🎯 Objective',
    'Description': '📄 Description',
    'Status': '🔄 Status',
    'Progress': '📊 Progress',
    'Start Date': '📅 Start Date',
    'End Date': '📅 End Date',
    'Created At': '📅 Created',
    'Updated At': '📅 Updated',
    'Probability': '📊 Probability',
    'Impact': '💥 Impact',
    'Mitigation': '🛡️ Mitigation',
    'Key Result': '📈 Key Result'
  }
  
  return iconMap[formatted] || formatted
}

const shouldDisplayColumn = (key: string): boolean => {
  // Hide certain columns that are not user-friendly
  const hiddenColumns = ['id', 'ownerId', 'projectId', 'epicId', 'storyId', 'sprintId', 'initiativeId']
  return !hiddenColumns.includes(key)
}

export default function EntityTable({ data, onEdit, onDelete }: EntityTableProps) {
  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="text-4xl block mb-2">📋</span>
        No data available
      </div>
    )
  }

  // Get columns from the first item, excluding hidden ones
  const columns = Object.keys(data[0]).filter(shouldDisplayColumn)

  return (
    <div className="table-container">
      <div className="overflow-x-auto">
        <table className="min-w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {columns.map((column) => (
              <th key={column} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {getColumnHeader(column)}
              </th>
            ))}
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
              ⚡ Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr 
              key={item.id || index} 
              className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
              onDoubleClick={() => onEdit && onEdit(item)}
              title={onEdit ? "Double-click to edit" : ""}
            >
              {columns.map((column) => (
                <td key={column} className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs">
                    {formatValue(column, item[column])}
                  </div>
                </td>
              ))}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors duration-150"
                      title={`Edit ${item.name || item.title || item.objective || 'item'}`}
                    >
                      <span>✏️</span>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 transition-colors duration-150"
                      title={`Delete ${item.name || item.title || item.objective || 'item'}`}
                    >
                      <span>🗑️</span>
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}


