"use client"

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Check, X, User, Search } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role?: string
  workload?: number
  availability?: 'available' | 'busy' | 'offline'
}

interface TaskAssignmentDropdownProps {
  users: User[]
  currentAssigneeId?: string
  taskId: string
  taskTitle: string
  onAssignmentChange: (taskId: string, assigneeId: string | null) => Promise<void>
  isLoading?: boolean
  showWorkload?: boolean
}

export const TaskAssignmentDropdown: React.FC<TaskAssignmentDropdownProps> = ({
  users,
  currentAssigneeId,
  taskId,
  taskTitle,
  onAssignmentChange,
  isLoading = false,
  showWorkload = true
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAssigning, setIsAssigning] = useState(false)

  const currentAssignee = users.find(user => user.id === currentAssigneeId)

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAssignment = async (assigneeId: string | null) => {
    if (isAssigning) return
    
    setIsAssigning(true)
    try {
      await onAssignmentChange(taskId, assigneeId)
      
      const assigneeName = assigneeId ? users.find(u => u.id === assigneeId)?.name : 'Unassigned'
      toast.success(`Task assigned to ${assigneeName}`)
      setIsOpen(false)
      setSearchQuery('')
    } catch (error) {
      toast.error('Failed to assign task')
      console.error('Assignment error:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const getAvailabilityColor = (availability?: string) => {
    switch (availability) {
      case 'available': return 'bg-green-500'
      case 'busy': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-green-500'
    }
  }

  const getWorkloadBadge = (workload?: number) => {
    if (!workload) return null
    if (workload < 70) return <Badge variant="secondary" className="bg-green-100 text-green-800">Light</Badge>
    if (workload < 90) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Moderate</Badge>
    return <Badge variant="secondary" className="bg-red-100 text-red-800">Heavy</Badge>
  }

  return (
    <div className="relative">
      <Select open={isOpen} onOpenChange={setIsOpen}>
        <SelectTrigger 
          className={`w-full ${isLoading ? 'opacity-50' : ''}`}
          disabled={isLoading || isAssigning}
        >
          <div className="flex items-center space-x-2 w-full">
            {currentAssignee ? (
              <>
                <Avatar className="w-5 h-5">
                  <AvatarImage src={currentAssignee.avatar} />
                  <AvatarFallback className="text-xs">
                    {currentAssignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{currentAssignee.name}</span>
                {currentAssignee.availability && (
                  <div className={`w-2 h-2 rounded-full ${getAvailabilityColor(currentAssignee.availability)}`} />
                )}
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Assign to...</span>
              </>
            )}
          </div>
        </SelectTrigger>
        
        <SelectContent className="w-80">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Unassign option */}
          <SelectItem 
            value="unassigned" 
            onSelect={() => handleAssignment(null)}
            className="p-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="font-medium">Unassigned</div>
                <div className="text-xs text-gray-500">Remove assignment</div>
              </div>
            </div>
          </SelectItem>

          {/* Users list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredUsers.map((user) => (
              <SelectItem
                key={user.id}
                value={user.id}
                onSelect={() => handleAssignment(user.id)}
                className="p-3"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {user.availability && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getAvailabilityColor(user.availability)}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.role || user.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {showWorkload && getWorkloadBadge(user.workload)}
                    {user.id === currentAssigneeId && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </div>

          {filteredUsers.length === 0 && searchQuery && (
            <div className="p-4 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div className="text-sm">No users found</div>
              <div className="text-xs">Try a different search term</div>
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Assignment feedback */}
      {isAssigning && (
        <div className="absolute inset-0 bg-white/80 rounded flex items-center justify-center">
          <div className="text-sm text-gray-600">Assigning...</div>
        </div>
      )}
    </div>
  )
}

export default TaskAssignmentDropdown 