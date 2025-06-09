import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  AlertCircle,
  Edit2,
  Trash2,
  Calendar,
  Tag,
  Rocket,
  Crown,
  Sparkles
} from 'lucide-react';
import StoryForm from '../components/StoryForm';
import { useAuth } from '../store/useAuth';
import { apiClient } from '../services/api';

interface Story {
  id: string;
  name: string;
  description?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  epic?: {
    id: string;
    name: string;
    project: {
      id: string;
      name: string;
    };
  };
  stats?: {
    totalTasks: number;
    completedTasks: number;
    completionPercentage: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

const StoriesPage: React.FC = () => {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [epicFilter, setEpicFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStories, setSelectedStories] = useState<string[]>([]);

  // Fetch stories
  const { data: storiesResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      apiClient.setToken(token);
      return apiClient.getStories();
    },
    enabled: !!token
  });

  // Fetch epics for filtering
  const { data: epicsResponse } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      apiClient.setToken(token);
      return apiClient.getEpics();
    },
    enabled: !!token
  });

  const stories = storiesResponse?.stories || [];
  const epics = epicsResponse?.epics || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (storyId: string) => {
      await fetch(`http://localhost:4000/stories/${storyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      setSelectedStories([]);
    }
  });

  // Filter stories
  const filteredStories = stories.filter((story: Story) => {
    const matchesSearch = !searchQuery || 
      story.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || story.priority === priorityFilter;
    
    const matchesEpic = epicFilter === 'all' || 
      (epicFilter === 'independent' && !story.epic) ||
      story.epic?.id === epicFilter;
    
    return matchesSearch && matchesPriority && matchesEpic;
  });

  const priorityConfig = {
    low: {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      dot: 'bg-green-500'
    },
    medium: {
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500'
    },
    high: {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      dot: 'bg-orange-500'
    },
    critical: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      dot: 'bg-red-500'
    }
  };

  const handleStorySelect = (storyId: string) => {
    setSelectedStories(prev => 
      prev.includes(storyId) 
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900">Loading Stories</h3>
          <p className="text-gray-500">Getting your user stories ready</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-sm border p-8 max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Stories</h3>
          <p className="text-gray-600 mb-4">We couldn't load your stories. Please try again.</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">User Stories</h1>
                <p className="text-sm text-gray-500">Craft and manage your user stories with AI assistance</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 px-3 py-1.5 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{filteredStories.length} Stories</span>
              </div>
              
              <motion.button
                onClick={() => setShowCreateForm(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Create Story</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <select
                value={epicFilter}
                onChange={(e) => setEpicFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
              >
                <option value="all">All Stories</option>
                <option value="independent">Independent Stories</option>
                {epics.map((epic: any) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stories Grid/List */}
        {filteredStories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="bg-white rounded-lg shadow-sm border p-12 max-w-md mx-auto">
              <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stories Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || priorityFilter !== 'all' || epicFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Start creating your first user story to get organized'
                }
              </p>
              {(!searchQuery && priorityFilter === 'all' && epicFilter === 'all') && (
                <motion.button
                  onClick={() => setShowCreateForm(true)}
                  whileHover={{ scale: 1.02 }}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all flex items-center space-x-2 mx-auto"
                >
                  <Plus size={16} />
                  <span>Create Your First Story</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            <AnimatePresence>
              {filteredStories.map((story: Story, index) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border ${
                    selectedStories.includes(story.id) ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
                  } ${viewMode === 'list' ? 'p-6' : 'p-6'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedStories.includes(story.id)}
                        onChange={() => handleStorySelect(story.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                      />
                      <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-medium border ${priorityConfig[story.priority].bg} ${priorityConfig[story.priority].color} ${priorityConfig[story.priority].border}`}>
                        <div className={`w-2 h-2 rounded-full ${priorityConfig[story.priority].dot}`}></div>
                        <span className="capitalize">{story.priority}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {story.storyPoints && (
                        <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-medium border border-blue-200">
                          {story.storyPoints}sp
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-snug">{story.name}</h3>
                    {story.description && (
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">{story.description}</p>
                    )}
                  </div>

                  {story.epic ? (
                    <div className="mb-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Rocket size={14} className="text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-purple-800">{story.epic.name}</p>
                            <p className="text-xs text-purple-600">{story.epic.project.name}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Crown size={14} className="text-green-600" />
                          <p className="text-sm font-medium text-green-800">Independent Story</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>Updated {new Date(story.updatedAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <motion.button
                        onClick={() => setEditingStory(story)}
                        whileHover={{ scale: 1.1 }}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Edit story"
                      >
                        <Edit2 size={14} />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          if (confirm('Delete this story?')) {
                            deleteMutation.mutate(story.id);
                          }
                        }}
                        whileHover={{ scale: 1.1 }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete story"
                      >
                        <Trash2 size={14} />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Story Form */}
      <AnimatePresence>
        {showCreateForm && (
          <StoryForm
            onSuccess={() => {
              setShowCreateForm(false);
              refetch();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Edit Story Form */}
      <AnimatePresence>
        {editingStory && (
          <StoryForm
            story={editingStory}
            onSuccess={() => {
              setEditingStory(null);
              refetch();
            }}
            onCancel={() => setEditingStory(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoriesPage; 