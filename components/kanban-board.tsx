"use client"

import type React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Archive,
  Star,
  Users,
  Target,
  BookOpen,
  CheckSquare,
  Rocket,
  Clock,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { TooltipProvider } from "@/components/ui/tooltip"

interface KanbanItem {
  id: string
  title: string
  description?: string
  type: "project" | "epic" | "story" | "task"
  priority: "low" | "medium" | "high" | "critical"
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  tags?: string[]
  progress?: number
  storyPoints?: number
  dueDate?: string
  createdAt: string
}

interface KanbanColumn {
  id: string
  title: string
  items: KanbanItem[]
  color: string
  limit?: number
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onItemMove?: (itemId: string, fromColumn: string, toColumn: string, newIndex: number) => void
  onItemEdit?: (item: KanbanItem) => void
  onItemDelete?: (item: KanbanItem) => void
  onAddItem?: (columnId: string) => void
  entityType?: "projects" | "epics" | "stories" | "tasks"
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns: initialColumns,
  onItemMove,
  onItemEdit,
  onItemDelete,
  onAddItem,
  entityType = "stories",
}) => {
  const [columns, setColumns] = useState(initialColumns)

  const typeConfig = {
    project: { icon: Target, color: "text-blue-700", bg: "bg-blue-50" },
    epic: { icon: Rocket, color: "text-purple-700", bg: "bg-purple-50" },
    story: { icon: BookOpen, color: "text-emerald-700", bg: "bg-emerald-50" },
    task: { icon: CheckSquare, color: "text-orange-700", bg: "bg-orange-50" },
  }

  const priorityConfig = {
    low: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    medium: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    high: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  }

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)

    if (!sourceColumn || !destColumn) return

    const sourceItems = Array.from(sourceColumn.items)
    const destItems = source.droppableId === destination.droppableId ? sourceItems : Array.from(destColumn.items)

    const [movedItem] = sourceItems.splice(source.index, 1)

    if (source.droppableId === destination.droppableId) {
      sourceItems.splice(destination.index, 0, movedItem)
      setColumns((prev) => prev.map((col) => (col.id === source.droppableId ? { ...col, items: sourceItems } : col)))
    } else {
      destItems.splice(destination.index, 0, movedItem)
      setColumns((prev) =>
        prev.map((col) => {
          if (col.id === source.droppableId) {
            return { ...col, items: sourceItems }
          }
          if (col.id === destination.droppableId) {
            return { ...col, items: destItems }
          }
          return col
        }),
      )
    }

    onItemMove?.(draggableId, source.droppableId, destination.droppableId, destination.index)
  }

  const getTotalItems = () => {
    return columns.reduce((total, column) => total + column.items.length, 0)
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* Board Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Kanban Board</h2>
            <p className="text-sm text-slate-600">
              {getTotalItems()} items across {columns.length} columns
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Users size={16} className="mr-2" />
              Team View
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp size={16} className="mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto">
            <div className="flex space-x-6 h-full min-w-max pb-6">
              {columns.map((column) => (
                <div key={column.id} className="flex-shrink-0 w-80">
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`h-full flex flex-col rounded-lg border-2 transition-colors ${
                          snapshot.isDraggingOver ? "border-blue-300 bg-blue-50/50" : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        {/* Column Header */}
                        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                              <h3 className="font-semibold text-slate-900">{column.title}</h3>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                                {column.items.length}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onAddItem?.(column.id)}>
                                  <Plus size={16} className="mr-2" />
                                  Add Item
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit2 size={16} className="mr-2" />
                                  Edit Column
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Archive size={16} className="mr-2" />
                                  Archive All
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {column.limit && (
                            <div className="flex items-center space-x-2 text-xs text-slate-600">
                              <span>WIP Limit: {column.limit}</span>
                              {column.items.length > column.limit && (
                                <Badge variant="destructive" className="text-xs">
                                  Over Limit
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Column Content */}
                        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                          <AnimatePresence>
                            {column.items.map((item, index) => {
                              const config = typeConfig[item.type]
                              const IconComponent = config.icon

                              return (
                                <Draggable key={item.id} draggableId={item.id} index={index}>
                                  {(provided, snapshot) => (
                                    <motion.div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -20 }}
                                      transition={{ delay: index * 0.05 }}
                                      className={`transform transition-transform ${
                                        snapshot.isDragging ? "rotate-2 scale-105" : ""
                                      }`}
                                    >
                                      <Card
                                        className={`group hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
                                          snapshot.isDragging ? "shadow-lg ring-2 ring-blue-500" : ""
                                        }`}
                                      >
                                        <CardHeader className="pb-2">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-2">
                                              <div
                                                className={`w-6 h-6 ${config.bg} rounded flex items-center justify-center`}
                                              >
                                                <IconComponent size={12} className={config.color} />
                                              </div>
                                              <Badge
                                                variant="secondary"
                                                className={`${priorityConfig[item.priority].bg} ${priorityConfig[item.priority].color} ${priorityConfig[item.priority].border} border text-xs`}
                                              >
                                                {item.priority}
                                              </Badge>
                                            </div>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <MoreHorizontal size={12} />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onItemEdit?.(item)}>
                                                  <Edit2 size={16} className="mr-2" />
                                                  Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                  <Star size={16} className="mr-2" />
                                                  Favorite
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  className="text-red-600"
                                                  onClick={() => onItemDelete?.(item)}
                                                >
                                                  <Trash2 size={16} className="mr-2" />
                                                  Delete
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </CardHeader>

                                        <CardContent className="space-y-3">
                                          <div>
                                            <h4 className="font-medium text-slate-900 text-sm line-clamp-2 leading-snug">
                                              {item.title}
                                            </h4>
                                            {item.description && (
                                              <p className="text-slate-600 text-xs line-clamp-2 mt-1 leading-relaxed">
                                                {item.description}
                                              </p>
                                            )}
                                          </div>

                                          {typeof item.progress === "number" && (
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-600">Progress</span>
                                                <span className="font-medium text-slate-900">{item.progress}%</span>
                                              </div>
                                              <Progress value={item.progress} className="h-1.5" />
                                            </div>
                                          )}

                                          {item.tags && item.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {item.tags.slice(0, 2).map((tag) => (
                                                <Badge
                                                  key={tag}
                                                  variant="secondary"
                                                  className="text-xs bg-slate-100 text-slate-700"
                                                >
                                                  {tag}
                                                </Badge>
                                              ))}
                                              {item.tags.length > 2 && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs bg-slate-100 text-slate-700"
                                                >
                                                  +{item.tags.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                            <div className="flex items-center space-x-2">
                                              {item.assignee ? (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <Avatar className="w-5 h-5">
                                                      <AvatarImage src={item.assignee.avatar || "/placeholder.svg"} />
                                                      <AvatarFallback className="text-xs">
                                                        {item.assignee.name
                                                          .split(" ")
                                                          .map((n) => n[0])
                                                          .join("")}
                                                      </AvatarFallback>
                                                    </Avatar>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>{item.assignee.name}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              ) : (
                                                <div className="w-5 h-5 bg-slate-200 rounded-full"></div>
                                              )}
                                              {item.storyPoints && (
                                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                                  {item.storyPoints} SP
                                                </Badge>
                                              )}
                                            </div>

                                            {item.dueDate && (
                                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                                <Clock size={10} />
                                                <span>{new Date(item.dueDate).toLocaleDateString('en-GB')}</span>
                                              </div>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  )}
                                </Draggable>
                              )
                            })}
                          </AnimatePresence>
                          {provided.placeholder}

                          {/* Add Item Button */}
                          <Button
                            variant="ghost"
                            className="w-full border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 h-12"
                            onClick={() => onAddItem?.(column.id)}
                          >
                            <Plus size={16} className="mr-2" />
                            Add {entityType.slice(0, -1)}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </TooltipProvider>
  )
}

export default KanbanBoard
