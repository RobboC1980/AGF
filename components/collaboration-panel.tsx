"use client"

import type React from "react"
import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  Reply,
  ThumbsUp,
  Edit2,
  Trash2,
  Pin,
  Users,
  Bell,
  CheckCircle2,
  Info,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUsers, useStories } from "@/hooks/useApi"

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
    role?: string
  }
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
  reactions: Array<{
    type: "like" | "love" | "thumbsup"
    count: number
    users: string[]
  }>
  replies?: Comment[]
  isPinned?: boolean
  mentions?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    url: string
  }>
}

interface ActivityItem {
  id: string
  type: "comment" | "status_change" | "assignment" | "mention" | "file_upload"
  user: {
    id: string
    name: string
    avatar?: string
  }
  content: string
  timestamp: string
  metadata?: any
}

interface CollaborationPanelProps {
  entityId: string
  entityType: "project" | "epic" | "story" | "task"
  comments?: Comment[]
  activities?: ActivityItem[]
  onAddComment?: (content: string, mentions?: string[], attachments?: File[]) => void
  onEditComment?: (commentId: string, content: string) => void
  onDeleteComment?: (commentId: string) => void
  onReactToComment?: (commentId: string, reaction: string) => void
  onPinComment?: (commentId: string) => void
  currentUserId?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  entityId,
  entityType,
  comments = [],
  activities = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  onReactToComment,
  onPinComment,
  currentUserId = "current-user",
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [newComment, setNewComment] = useState("")
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments")
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState<string[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Use real data from props (no fallback to mock data)
  const displayComments = comments
  const displayActivities = activities

  const handleSubmitComment = () => {
    if (!newComment.trim()) return

    const mentions = extractMentions(newComment)
    onAddComment?.(newComment, mentions, attachments)
    setNewComment("")
    setAttachments([])
  }

  const handleEditComment = (commentId: string) => {
    const comment = displayComments.find((c) => c.id === commentId)
    if (comment) {
      setEditingComment(commentId)
      setEditContent(comment.content)
    }
  }

  const handleSaveEdit = () => {
    if (editingComment && editContent.trim()) {
      onEditComment?.(editingComment, editContent)
      setEditingComment(null)
      setEditContent("")
    }
  }

  const handleCancelEdit = () => {
    setEditingComment(null)
    setEditContent("")
  }

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@([a-zA-Z0-9-_]+)/g
    const mentions = []
    let match
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1])
    }
    return mentions
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString('en-GB')
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment":
        return MessageSquare
      case "status_change":
        return CheckCircle2
      case "assignment":
        return Users
      case "mention":
        return Bell
      case "file_upload":
        return Paperclip
      default:
        return Info
    }
  }

  const reactionEmojis = {
    like: "👍",
    love: "❤️",
    thumbsup: "👍",
  }

  if (isCollapsed) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <Button onClick={onToggleCollapse} className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg">
          <MessageSquare size={20} className="text-white" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="w-96 h-[600px] flex flex-col shadow-lg border-slate-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare size={20} className="text-blue-600" />
            <span>Collaboration</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Bell size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleCollapse}>
              <X size={16} />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant={activeTab === "comments" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("comments")}
            className="h-8"
          >
            Comments ({displayComments.length})
          </Button>
          <Button
            variant={activeTab === "activity" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("activity")}
            className="h-8"
          >
            Activity ({displayActivities.length})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {activeTab === "comments" ? (
          <>
            {/* Comments List */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {displayComments.map((comment) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`space-y-3 ${comment.isPinned ? "border border-amber-200 bg-amber-50/50 rounded-lg p-3" : ""}`}
                    >
                      {comment.isPinned && (
                        <div className="flex items-center space-x-2 text-amber-700">
                          <Pin size={14} />
                          <span className="text-xs font-medium">Pinned comment</span>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={comment.author.avatar || "/placeholder.svg"} />
                          <AvatarFallback>
                            {comment.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-slate-900 text-sm">{comment.author.name}</span>
                            {comment.author.role && (
                              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                {comment.author.role}
                              </Badge>
                            )}
                            <span className="text-xs text-slate-500">{formatTimestamp(comment.createdAt)}</span>
                            {comment.isEdited && <span className="text-xs text-slate-400">(edited)</span>}
                          </div>

                          {editingComment === comment.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[60px] text-sm"
                                placeholder="Edit your comment..."
                              />
                              <div className="flex items-center space-x-2">
                                <Button size="sm" onClick={handleSaveEdit}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>

                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="space-y-2">
                                  {comment.attachments.map((attachment) => (
                                    <div
                                      key={attachment.id}
                                      className="flex items-center space-x-2 p-2 bg-slate-50 rounded border"
                                    >
                                      <Paperclip size={14} className="text-slate-500" />
                                      <span className="text-sm text-slate-700 flex-1">{attachment.name}</span>
                                      <span className="text-xs text-slate-500">
                                        {(attachment.size / 1024 / 1024).toFixed(1)} MB
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Reactions */}
                              {comment.reactions.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  {comment.reactions.map((reaction) => (
                                    <Button
                                      key={reaction.type}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => onReactToComment?.(comment.id, reaction.type)}
                                    >
                                      <span className="mr-1">{reactionEmojis[reaction.type]}</span>
                                      {reaction.count}
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                                  onClick={() => onReactToComment?.(comment.id, "like")}
                                >
                                  <ThumbsUp size={12} className="mr-1" />
                                  Like
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                                >
                                  <Reply size={12} className="mr-1" />
                                  Reply
                                </Button>
                                {comment.author.id === currentUserId && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700"
                                      >
                                        <MoreHorizontal size={12} />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEditComment(comment.id)}>
                                        <Edit2 size={14} className="mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => onPinComment?.(comment.id)}>
                                        <Pin size={14} className="mr-2" />
                                        {comment.isPinned ? "Unpin" : "Pin"}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => onDeleteComment?.(comment.id)}
                                      >
                                        <Trash2 size={14} className="mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-3 border-l-2 border-slate-200 pl-3">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex space-x-2">
                                  <Avatar className="w-6 h-6 flex-shrink-0">
                                    <AvatarImage src={reply.author.avatar || "/placeholder.svg"} />
                                    <AvatarFallback className="text-xs">
                                      {reply.author.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="font-medium text-slate-900 text-xs">{reply.author.name}</span>
                                      <span className="text-xs text-slate-500">{formatTimestamp(reply.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <Separator />

            {/* Comment Input */}
            <div className="p-4 space-y-3">
              <div className="flex space-x-2">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[60px] text-sm resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmitComment()
                      }
                    }}
                  />

                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 rounded text-sm">
                          <Paperclip size={14} className="text-slate-500" />
                          <span className="flex-1 text-slate-700">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setAttachments([...attachments, ...Array.from(e.target.files)])
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile size={16} />
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send size={14} className="mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Activity Tab */
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3">
              <AnimatePresence>
                {displayActivities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type)
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex space-x-3 py-2"
                    >
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <IconComponent size={14} className="text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={activity.user.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs">
                              {activity.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-slate-900 text-sm">{activity.user.name}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{activity.content}</p>
                        <span className="text-xs text-slate-500">{formatTimestamp(activity.timestamp)}</span>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default CollaborationPanel
