"use client"

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  Crown,
  Settings,
  Building,
  Mail,
  Phone,
  Calendar,
  Target,
  Activity,
  Filter,
  ChevronDown,
  Star,
  MapPin,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  department?: string
  location?: string
  phone?: string
  joinedAt: string
  lastActive?: string
  isActive: boolean
  skills?: string[]
  workload?: number
  projects?: number
}

interface Team {
  id: string
  name: string
  description?: string
  avatar?: string
  color: string
  memberCount: number
  projectCount: number
  isDefault: boolean
  isPrivate: boolean
  createdAt: string
  createdBy: string
  members: TeamMember[]
  projects?: string[]
}

interface TeamMember {
  userId: string
  user: User
  role: 'admin' | 'manager' | 'member'
  joinedAt: string
  permissions: string[]
  canManageTeam: boolean
  canManageProjects: boolean
  canAssignTasks: boolean
}

interface TeamManagementPageProps {
  teams?: Team[]
  users?: User[]
  onCreateTeam?: (teamData: Partial<Team>) => Promise<void>
  onUpdateTeam?: (teamId: string, teamData: Partial<Team>) => Promise<void>
  onDeleteTeam?: (teamId: string) => Promise<void>
  onAddMember?: (teamId: string, userId: string, role: string) => Promise<void>
  onRemoveMember?: (teamId: string, userId: string) => Promise<void>
  onUpdateMemberRole?: (teamId: string, userId: string, role: string) => Promise<void>
  isLoading?: boolean
}

const TeamManagementPage: React.FC<TeamManagementPageProps> = ({
  teams = [],
  users = [],
  onCreateTeam,
  onUpdateTeam,
  onDeleteTeam,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  isLoading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [filterRole, setFilterRole] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Team creation form state
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    isPrivate: false
  })

  // Member invitation state
  const [inviteData, setInviteData] = useState({
    userIds: [] as string[],
    role: 'member' as 'admin' | 'manager' | 'member',
    message: ''
  })

  // Filter teams based on search
  const filteredTeams = useMemo(() => {
    return teams.filter(team =>
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [teams, searchQuery])

  // Available users for invitation (not already in selected team)
  const availableUsers = useMemo(() => {
    if (!selectedTeam) return users
    const teamMemberIds = selectedTeam.members.map(m => m.userId)
    return users.filter(user => !teamMemberIds.includes(user.id))
  }, [users, selectedTeam])

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      toast.error('Team name is required')
      return
    }

    try {
      await onCreateTeam?.(newTeam)
      setNewTeam({ name: '', description: '', color: '#3B82F6', isPrivate: false })
      setShowCreateTeamDialog(false)
      toast.success('Team created successfully')
    } catch (error) {
      toast.error('Failed to create team')
    }
  }

  const handleInviteMembers = async () => {
    if (!selectedTeam || inviteData.userIds.length === 0) {
      toast.error('Please select users to invite')
      return
    }

    try {
      for (const userId of inviteData.userIds) {
        await onAddMember?.(selectedTeam.id, userId, inviteData.role)
      }
      
      setInviteData({ userIds: [], role: 'member', message: '' })
      setShowInviteDialog(false)
      toast.success(`Invited ${inviteData.userIds.length} member(s) to ${selectedTeam.name}`)
    } catch (error) {
      toast.error('Failed to invite members')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />
      case 'manager': return <Shield className="w-4 h-4 text-blue-600" />
      default: return <Users className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { color: 'bg-yellow-100 text-yellow-800', label: 'Admin' },
      manager: { color: 'bg-blue-100 text-blue-800', label: 'Manager' },
      member: { color: 'bg-gray-100 text-gray-800', label: 'Member' }
    }
    const roleConfig = config[role as keyof typeof config] || config.member
    return <Badge className={roleConfig.color}>{roleConfig.label}</Badge>
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                  <p className="text-slate-600">Manage teams, members, and permissions</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Settings size={16} className="mr-2" />
                  Settings
                </Button>
                
                <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus size={16} className="mr-2" />
                      Create Team
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Team</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="team-name">Team Name</Label>
                        <Input
                          id="team-name"
                          placeholder="Enter team name..."
                          value={newTeam.name}
                          onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="team-description">Description</Label>
                        <Textarea
                          id="team-description"
                          placeholder="What does this team work on?"
                          value={newTeam.description}
                          onChange={(e) => setNewTeam(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="team-color">Team Color</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <input
                            type="color"
                            value={newTeam.color}
                            onChange={(e) => setNewTeam(prev => ({ ...prev, color: e.target.value }))}
                            className="w-12 h-10 rounded border border-gray-300"
                          />
                          <Input
                            value={newTeam.color}
                            onChange={(e) => setNewTeam(prev => ({ ...prev, color: e.target.value }))}
                            placeholder="#3B82F6"
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <Button variant="outline" onClick={() => setShowCreateTeamDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTeam} disabled={!newTeam.name.trim()}>
                          Create Team
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Teams List */}
            <div className="lg:col-span-1">
              <Card className="shadow-sm border-slate-200/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Teams ({teams.length})</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      >
                        {viewMode === 'grid' ? <Users size={16} /> : <Activity size={16} />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <Input
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {filteredTeams.map((team) => (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedTeam?.id === team.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTeam(team)}
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-sm truncate">{team.name}</h3>
                              {team.isDefault && <Star size={12} className="text-yellow-500" />}
                              {team.isPrivate && <Shield size={12} className="text-gray-500" />}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                              <span>{team.memberCount} members</span>
                              <span>•</span>
                              <span>{team.projectCount} projects</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filteredTeams.length === 0 && searchQuery && (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No teams found</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Team Details */}
            <div className="lg:col-span-2">
              {selectedTeam ? (
                <Card className="shadow-sm border-slate-200/60">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                          style={{ backgroundColor: selectedTeam.color }}
                        >
                          {selectedTeam.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h2 className="text-xl font-bold">{selectedTeam.name}</h2>
                            {selectedTeam.isDefault && <Star size={16} className="text-yellow-500" />}
                            {selectedTeam.isPrivate && <Shield size={16} className="text-gray-500" />}
                          </div>
                          <p className="text-gray-600 text-sm">{selectedTeam.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <UserPlus size={16} className="mr-2" />
                              Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Invite Members to {selectedTeam.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Select Users</Label>
                                <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                                  {availableUsers.map((user) => (
                                    <label key={user.id} className="flex items-center space-x-3 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={inviteData.userIds.includes(user.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setInviteData(prev => ({
                                              ...prev,
                                              userIds: [...prev.userIds, user.id]
                                            }))
                                          } else {
                                            setInviteData(prev => ({
                                              ...prev,
                                              userIds: prev.userIds.filter(id => id !== user.id)
                                            }))
                                          }
                                        }}
                                        className="rounded"
                                      />
                                      <Avatar className="w-6 h-6">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback className="text-xs">
                                          {user.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">{user.name}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="invite-role">Role</Label>
                                <Select value={inviteData.role} onValueChange={(value: any) => setInviteData(prev => ({ ...prev, role: value }))}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-center justify-between pt-4">
                                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleInviteMembers} disabled={inviteData.userIds.length === 0}>
                                  Invite {inviteData.userIds.length} Member{inviteData.userIds.length !== 1 ? 's' : ''}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit2 size={16} className="mr-2" />
                              Edit Team
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Settings size={16} className="mr-2" />
                              Team Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 size={16} className="mr-2" />
                              Delete Team
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="members">Members ({selectedTeam.memberCount})</TabsTrigger>
                        <TabsTrigger value="projects">Projects ({selectedTeam.projectCount})</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <Users size={24} className="mx-auto mb-2 text-blue-600" />
                              <div className="text-2xl font-bold">{selectedTeam.memberCount}</div>
                              <div className="text-sm text-gray-600">Team Members</div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4 text-center">
                              <Target size={24} className="mx-auto mb-2 text-green-600" />
                              <div className="text-2xl font-bold">{selectedTeam.projectCount}</div>
                              <div className="text-sm text-gray-600">Active Projects</div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-4 text-center">
                              <Calendar size={24} className="mx-auto mb-2 text-purple-600" />
                              <div className="text-2xl font-bold">
                                {Math.floor((Date.now() - new Date(selectedTeam.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                              </div>
                              <div className="text-sm text-gray-600">Days Active</div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="members" className="mt-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-medium">Team Members</h3>
                              <Select value={filterRole} onValueChange={setFilterRole}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Roles</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {selectedTeam.members
                              .filter(member => filterRole === 'all' || member.role === filterRole)
                              .map((member) => (
                                <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg">
                                  <div className="flex items-center space-x-4">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={member.user.avatar} />
                                      <AvatarFallback>
                                        {member.user.name.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <h4 className="font-medium">{member.user.name}</h4>
                                        {getRoleIcon(member.role)}
                                      </div>
                                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                                        <span>{member.user.email}</span>
                                        {member.user.department && (
                                          <>
                                            <span>•</span>
                                            <span>{member.user.department}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    {getRoleBadge(member.role)}
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal size={16} />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                          <Shield size={16} className="mr-2" />
                                          Change Role
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Mail size={16} className="mr-2" />
                                          Send Message
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                          <UserMinus size={16} className="mr-2" />
                                          Remove from Team
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="projects" className="mt-6">
                        <div className="text-center py-8 text-gray-500">
                          <Target size={32} className="mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">Project management coming soon</p>
                          <p className="text-xs">Link teams to projects and manage assignments</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm border-slate-200/60">
                  <CardContent className="p-12 text-center">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Team</h3>
                    <p className="text-gray-600">Choose a team from the list to view details and manage members</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default TeamManagementPage 