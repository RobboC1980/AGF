"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Save,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Palette,
  Bell,
  Globe,
  Shield,
  Download,
  Trash2,
  RefreshCw,
  Settings,
  Moon,
  Sun,
  Monitor,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

// Validation schemas
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  job_title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface NotificationSettings {
  email_notifications: boolean
  push_notifications: boolean
  project_updates: boolean
  task_assignments: boolean
  mentions: boolean
  deadlines: boolean
  weekly_digest: boolean
}

interface PrivacySettings {
  profile_visibility: 'public' | 'team' | 'private'
  show_email: boolean
  show_activity: boolean
  allow_mentions: boolean
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateProfile, isLoading } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState("profile")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    push_notifications: true,
    project_updates: true,
    task_assignments: true,
    mentions: true,
    deadlines: true,
    weekly_digest: false,
  })
  
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profile_visibility: 'team',
    show_email: false,
    show_activity: true,
    allow_mentions: true,
  })

  // Form configurations
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      username: user?.username || "",
      bio: "",
      job_title: "",
      department: "",
      location: "",
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        username: user.username || "",
        bio: "",
        job_title: "",
        department: "",
        location: "",
      })
    }
  }, [user, profileForm])

  const handleProfileSave = async (data: any) => {
    setIsSaving(true)
    try {
      const result = await updateProfile(data)
      if (result.success) {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        })
      } else {
        throw new Error(result.error || "Failed to update profile")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async (data: any) => {
    setIsSaving(true)
    try {
      // Simulate password change API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated.",
      })
      
      passwordForm.reset()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
  }

  const handlePrivacyChange = (key: keyof PrivacySettings, value: any) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} theme`,
    })
  }

  const exportData = () => {
    toast({
      title: "Data Export",
      description: "Your data export will be sent to your email",
    })
  }

  const deleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account",
      variant: "destructive",
    })
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings size={20} />
            <span>User Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage your profile, account settings, and preferences
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-48 border-r bg-slate-50 p-4">
              <TabsList orientation="vertical" className="w-full flex-col h-auto bg-transparent">
                <TabsTrigger value="profile" className="w-full justify-start">
                  <User size={16} className="mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="account" className="w-full justify-start">
                  <Shield size={16} className="mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="appearance" className="w-full justify-start">
                  <Palette size={16} className="mr-2" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger value="notifications" className="w-full justify-start">
                  <Bell size={16} className="mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="privacy" className="w-full justify-start">
                  <Shield size={16} className="mr-2" />
                  Privacy
                </TabsTrigger>
                <TabsTrigger value="data" className="w-full justify-start">
                  <Download size={16} className="mr-2" />
                  Data & Export
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <TabsContent value="profile" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={avatarPreview || user.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Label htmlFor="avatar" className="cursor-pointer">
                          <Button variant="outline" size="sm" asChild>
                            <span>
                              <Camera size={16} className="mr-2" />
                              Change Photo
                            </span>
                          </Button>
                        </Label>
                        <Input
                          id="avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                        <p className="text-sm text-slate-500 mt-1">
                          JPG, PNG or GIF. Max size 2MB.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first_name">First Name</Label>
                          <Input
                            id="first_name"
                            {...profileForm.register("first_name")}
                          />
                          {profileForm.formState.errors.first_name && (
                            <p className="text-sm text-red-500 mt-1">
                              {profileForm.formState.errors.first_name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="last_name">Last Name</Label>
                          <Input
                            id="last_name"
                            {...profileForm.register("last_name")}
                          />
                          {profileForm.formState.errors.last_name && (
                            <p className="text-sm text-red-500 mt-1">
                              {profileForm.formState.errors.last_name.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          {...profileForm.register("username")}
                        />
                        {profileForm.formState.errors.username && (
                          <p className="text-sm text-red-500 mt-1">
                            {profileForm.formState.errors.username.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...profileForm.register("email")}
                        />
                        {profileForm.formState.errors.email && (
                          <p className="text-sm text-red-500 mt-1">
                            {profileForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          placeholder="Tell us about yourself..."
                          {...profileForm.register("bio")}
                        />
                        {profileForm.formState.errors.bio && (
                          <p className="text-sm text-red-500 mt-1">
                            {profileForm.formState.errors.bio.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="job_title">Job Title</Label>
                          <Input
                            id="job_title"
                            {...profileForm.register("job_title")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="department">Department</Label>
                          <Input
                            id="department"
                            {...profileForm.register("department")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="City, Country"
                          {...profileForm.register("location")}
                        />
                      </div>

                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Save size={16} className="mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                      <div>
                        <Label htmlFor="current_password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current_password"
                            type={showCurrentPassword ? "text" : "password"}
                            {...passwordForm.register("current_password")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                        {passwordForm.formState.errors.current_password && (
                          <p className="text-sm text-red-500 mt-1">
                            {passwordForm.formState.errors.current_password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="new_password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new_password"
                            type={showNewPassword ? "text" : "password"}
                            {...passwordForm.register("new_password")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                        {passwordForm.formState.errors.new_password && (
                          <p className="text-sm text-red-500 mt-1">
                            {passwordForm.formState.errors.new_password.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="confirm_password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm_password"
                            type={showConfirmPassword ? "text" : "password"}
                            {...passwordForm.register("confirm_password")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                        {passwordForm.formState.errors.confirm_password && (
                          <p className="text-sm text-red-500 mt-1">
                            {passwordForm.formState.errors.confirm_password.message}
                          </p>
                        )}
                      </div>

                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 size={16} className="mr-2 animate-spin" />
                        ) : (
                          <Lock size={16} className="mr-2" />
                        )}
                        Update Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Theme Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        className="h-auto p-4 flex-col space-y-2"
                        onClick={() => handleThemeChange("light")}
                      >
                        <Sun size={24} />
                        <span>Light</span>
                        {theme === "light" && <Check size={16} />}
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        className="h-auto p-4 flex-col space-y-2"
                        onClick={() => handleThemeChange("dark")}
                      >
                        <Moon size={24} />
                        <span>Dark</span>
                        {theme === "dark" && <Check size={16} />}
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        className="h-auto p-4 flex-col space-y-2"
                        onClick={() => handleThemeChange("system")}
                      >
                        <Monitor size={24} />
                        <span>System</span>
                        {theme === "system" && <Check size={16} />}
                      </Button>
                    </div>
                    
                    <div className="text-sm text-slate-600">
                      Current theme: <Badge variant="secondary">{resolvedTheme}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-slate-500">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={notifications.email_notifications}
                          onCheckedChange={(value) => handleNotificationChange('email_notifications', value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-slate-500">Receive browser push notifications</p>
                        </div>
                        <Switch
                          checked={notifications.push_notifications}
                          onCheckedChange={(value) => handleNotificationChange('push_notifications', value)}
                        />
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Project Updates</Label>
                          <p className="text-sm text-slate-500">When projects you're involved in are updated</p>
                        </div>
                        <Switch
                          checked={notifications.project_updates}
                          onCheckedChange={(value) => handleNotificationChange('project_updates', value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Task Assignments</Label>
                          <p className="text-sm text-slate-500">When tasks are assigned to you</p>
                        </div>
                        <Switch
                          checked={notifications.task_assignments}
                          onCheckedChange={(value) => handleNotificationChange('task_assignments', value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Mentions</Label>
                          <p className="text-sm text-slate-500">When someone mentions you</p>
                        </div>
                        <Switch
                          checked={notifications.mentions}
                          onCheckedChange={(value) => handleNotificationChange('mentions', value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Deadline Reminders</Label>
                          <p className="text-sm text-slate-500">Reminders for upcoming deadlines</p>
                        </div>
                        <Switch
                          checked={notifications.deadlines}
                          onCheckedChange={(value) => handleNotificationChange('deadlines', value)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Weekly Digest</Label>
                          <p className="text-sm text-slate-500">Weekly summary of your activity</p>
                        </div>
                        <Switch
                          checked={notifications.weekly_digest}
                          onCheckedChange={(value) => handleNotificationChange('weekly_digest', value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Profile Visibility</Label>
                      <Select
                        value={privacy.profile_visibility}
                        onValueChange={(value) => handlePrivacyChange('profile_visibility', value)}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                          <SelectItem value="team">Team - Only team members can see your profile</SelectItem>
                          <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Email Address</Label>
                        <p className="text-sm text-slate-500">Display your email on your profile</p>
                      </div>
                      <Switch
                        checked={privacy.show_email}
                        onCheckedChange={(value) => handlePrivacyChange('show_email', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Activity Status</Label>
                        <p className="text-sm text-slate-500">Let others see when you're online</p>
                      </div>
                      <Switch
                        checked={privacy.show_activity}
                        onCheckedChange={(value) => handlePrivacyChange('show_activity', value)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Allow Mentions</Label>
                        <p className="text-sm text-slate-500">Let others mention you in comments</p>
                      </div>
                      <Switch
                        checked={privacy.allow_mentions}
                        onCheckedChange={(value) => handlePrivacyChange('allow_mentions', value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="data" className="space-y-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Export Your Data</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Download a copy of all your data including profile, projects, tasks, and comments.
                      </p>
                      <Button onClick={exportData} variant="outline">
                        <Download size={16} className="mr-2" />
                        Request Data Export
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">Danger Zone</h4>
                      <Alert>
                        <AlertCircle size={16} />
                        <AlertDescription>
                          Once you delete your account, there is no going back. Please be certain.
                        </AlertDescription>
                      </Alert>
                      <Button onClick={deleteAccount} variant="destructive" className="mt-4">
                        <Trash2 size={16} className="mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default UserSettingsModal 