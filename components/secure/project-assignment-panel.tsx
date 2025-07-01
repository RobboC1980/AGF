"use client"

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRBAC, usePermission } from '@/hooks/use-rbac'
import { UserRole, Permission } from '@/lib/rbac'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, UserPlus, Shield, Users, Search } from 'lucide-react'
import { toast } from 'sonner'

interface ProjectAssignmentPanelProps {
  projectId: string
  projectName: string
}

interface UserAssignment {
  id: string
  userId: string
  userName: string
  userEmail: string
  role: UserRole
  assignedAt: Date
  assignedBy: string
}

export function ProjectAssignmentPanel({ projectId, projectName }: ProjectAssignmentPanelProps) {
  const { isAdmin, canAssignToProject, validateProjectAssignment } = useRBAC()
  const { hasPermission } = usePermission(Permission.ASSIGN_USERS)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.MEMBER)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  // Early return if user doesn't have permission
  if (!isAdmin || !canAssignToProject || !hasPermission) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to assign users to projects. Only administrators can perform this action.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Fetch current project assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: async () => {
      // This would fetch from your API
      const response = await fetch(`/api/projects/${projectId}/assignments`)
      if (!response.ok) throw new Error('Failed to fetch assignments')
      return response.json()
    },
  })

  // Fetch available users to assign
  const { data: availableUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'available', projectId, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        exclude_project: projectId,
        search: searchQuery,
      })
      const response = await fetch(`/api/users/available?${params}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    },
  })

  // Assign user to project mutation
  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const response = await fetch(`/api/projects/${projectId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign user')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] })
      queryClient.invalidateQueries({ queryKey: ['users', 'available', projectId] })
      setSelectedUserId('')
      setSelectedRole(UserRole.MEMBER)
      toast.success('User assigned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Remove user from project mutation
  const removeUserMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/projects/${projectId}/assignments/${assignmentId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to remove user')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-assignments', projectId] })
      queryClient.invalidateQueries({ queryKey: ['users', 'available', projectId] })
      toast.success('User removed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleAssignUser = () => {
    if (!selectedUserId || !selectedRole) {
      toast.error('Please select a user and role')
      return
    }

    // Validate assignment using RBAC
    const validation = validateProjectAssignment(projectId, selectedUserId, selectedRole)
    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    assignUserMutation.mutate({ userId: selectedUserId, role: selectedRole })
  }

  const handleRemoveUser = (assignmentId: string) => {
    if (confirm('Are you sure you want to remove this user from the project?')) {
      removeUserMutation.mutate(assignmentId)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800'
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800'
      case UserRole.MEMBER:
        return 'bg-green-100 text-green-800'
      case UserRole.VIEWER:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Project Access Management
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage user access and permissions for "{projectName}"
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assignment Form */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign New User
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose user..." />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="loading" disabled>Loading users...</SelectItem>
                  ) : availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>No available users</SelectItem>
                  ) : (
                    availableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.VIEWER}>Viewer (Read-only)</SelectItem>
                  <SelectItem value={UserRole.MEMBER}>Member (Can create/edit)</SelectItem>
                  <SelectItem value={UserRole.MANAGER}>Manager (Full project access)</SelectItem>
                  {isAdmin && (
                    <SelectItem value={UserRole.ADMIN}>Admin (Full system access)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            onClick={handleAssignUser}
            disabled={!selectedUserId || assignUserMutation.isPending}
            className="w-full md:w-auto"
          >
            {assignUserMutation.isPending ? 'Assigning...' : 'Assign User'}
          </Button>
        </div>

        {/* Current Assignments */}
        <div className="space-y-4">
          <h3 className="font-semibold">Current Assignments ({assignments.length})</h3>
          
          {assignmentsLoading ? (
            <div className="text-center py-4">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No users are currently assigned to this project.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {assignments.map((assignment: UserAssignment) => (
                <div 
                  key={assignment.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{assignment.userName}</p>
                      <p className="text-sm text-muted-foreground">{assignment.userEmail}</p>
                    </div>
                    <Badge className={getRoleBadgeColor(assignment.role)}>
                      {assignment.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(assignment.assignedAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveUser(assignment.id)}
                      disabled={removeUserMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Security Notice:</strong> Only administrators can assign users to projects. 
            Users can only access projects they own or have been explicitly assigned to.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
} 