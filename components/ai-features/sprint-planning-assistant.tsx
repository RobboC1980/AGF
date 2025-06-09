"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Target, Users, AlertTriangle, CheckCircle2, Loader2, Sparkles, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useSprintPlanning } from "../../hooks/use-ai-features"

interface SprintPlanningAssistantProps {
  teamId: string
  candidateStories: Array<{
    id: string
    title: string
    description: string
    storyPoints?: number
    priority: "low" | "medium" | "high" | "critical"
    tags?: string[]
  }>
  onCommitSprint?: (selectedStories: string[]) => void
}

export function SprintPlanningAssistant({ teamId, candidateStories, onCommitSprint }: SprintPlanningAssistantProps) {
  const [teamCapacity, setTeamCapacity] = useState<number>(40)
  const [sprintGoal, setSprintGoal] = useState<string>("")
  const [planningResult, setPlanningResult] = useState<any>(null)

  const { mutate: planSprint, isPending } = useSprintPlanning()

  const handlePlanSprint = () => {
    planSprint(
      {
        team_id: teamId,
        team_capacity: teamCapacity,
        candidate_story_ids: candidateStories.map((s) => s.id),
        sprint_goal: sprintGoal || undefined,
      },
      {
        onSuccess: (result) => {
          setPlanningResult(result)
        },
      },
    )
  }

  const handleCommitSprint = () => {
    if (planningResult && onCommitSprint) {
      const selectedStoryIds = planningResult.recommended_stories.map((s: any) => s.id)
      onCommitSprint(selectedStoryIds)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6">
      {/* Planning Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>AI Sprint Planning Assistant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Team Capacity (Story Points)</Label>
              <Input
                id="capacity"
                type="number"
                value={teamCapacity}
                onChange={(e) => setTeamCapacity(Number(e.target.value))}
                min={1}
                max={200}
              />
            </div>
            <div>
              <Label htmlFor="goal">Sprint Goal (Optional)</Label>
              <Input
                id="goal"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="What do you want to achieve this sprint?"
              />
            </div>
          </div>

          <Button onClick={handlePlanSprint} disabled={isPending || candidateStories.length === 0} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is planning your sprint...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 mr-2" />
                Generate Sprint Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Candidate Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Candidate Stories ({candidateStories.length})</span>
            <Badge variant="outline">
              {candidateStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)} total points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {candidateStories.map((story) => (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 border rounded-lg hover:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{story.title}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{story.description}</p>
                    {story.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {story.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-3">
                    <Badge className={getPriorityColor(story.priority)}>{story.priority}</Badge>
                    {story.storyPoints && <Badge variant="outline">{story.storyPoints} pts</Badge>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Planning Results */}
      {planningResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Sprint Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <span>Recommended Sprint Plan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{planningResult.total_points}</div>
                  <div className="text-sm text-slate-600">Story Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(planningResult.capacity_utilization)}%
                  </div>
                  <div className="text-sm text-slate-600">Capacity Used</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{planningResult.recommended_stories.length}</div>
                  <div className="text-sm text-slate-600">Stories</div>
                </div>
              </div>

              <Progress value={planningResult.capacity_utilization} className="mb-4" />

              <Button onClick={handleCommitSprint} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Commit Sprint Plan
              </Button>
            </CardContent>
          </Card>

          {/* Recommended Stories */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Stories (Ranked by AI)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planningResult.recommended_stories.map((story: any, index: number) => (
                  <motion.div
                    key={story.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-3 border rounded-lg bg-green-50 border-green-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className="bg-green-100 text-green-800">#{index + 1}</Badge>
                          <h4 className="font-medium text-sm">{story.title}</h4>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{story.rationale}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Badge variant="outline">{story.points} pts</Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          Score: {Math.round(story.priority_score * 100)}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risks and Warnings */}
          {(planningResult.risks.length > 0 || planningResult.dependency_warnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Risks & Dependencies</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {planningResult.risks.map((risk: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-2 bg-amber-50 rounded border-l-4 border-amber-400"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </div>
                ))}
                {planningResult.dependency_warnings.map((warning: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-2 bg-blue-50 rounded border-l-4 border-blue-400"
                  >
                    <Users className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{warning}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Metadata */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Generated by {planningResult.ai_metadata.model_used} in{" "}
                  {planningResult.ai_metadata.processing_time.toFixed(2)}s
                </span>
                <span>{planningResult.ai_metadata.tokens_used} tokens used</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
