import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: 'online' | 'away' | 'busy';
  cursor?: {
    x: number;
    y: number;
    element?: string;
  };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  position: {
    x: number;
    y: number;
    elementId?: string;
  };
  mentions: string[];
  reactions: Array<{
    emoji: string;
    users: string[];
  }>;
  replies: Comment[];
  timestamp: string;
  status: 'active' | 'resolved' | 'archived';
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
  type: 'edit' | 'comment' | 'mention' | 'reaction' | 'status_change';
}

interface CollaborationHubProps {
  projectId: string;
  currentUser: User;
}

const CollaborationHub: React.FC<CollaborationHubProps> = ({ projectId, currentUser }) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [showUsers, setShowUsers] = useState(true);
  const [showActivities, setShowActivities] = useState(false);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentPosition, setCommentPosition] = useState<{x: number, y: number} | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const collaborationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeCollaboration();
    setupRealTimeConnection();
    return () => {
      cleanupConnection();
    };
  }, [projectId]);

  const initializeCollaboration = async () => {
    // Initialize with mock data
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'Alice Johnson',
        avatar: '👩‍💻',
        color: '#3b82f6',
        status: 'online',
        cursor: { x: 100, y: 200 }
      },
      {
        id: '2',
        name: 'Bob Smith',
        avatar: '👨‍💼',
        color: '#10b981',
        status: 'online',
        cursor: { x: 250, y: 150 }
      },
      {
        id: '3',
        name: 'Carol Davis',
        avatar: '👩‍🎨',
        color: '#f59e0b',
        status: 'away'
      }
    ];

    const mockComments: Comment[] = [
      {
        id: '1',
        userId: '1',
        userName: 'Alice Johnson',
        userAvatar: '👩‍💻',
        content: 'This sprint planning looks great! Should we consider adding more buffer time?',
        position: { x: 300, y: 400, elementId: 'sprint-card-1' },
        mentions: [],
        reactions: [
          { emoji: '👍', users: ['2', '3'] },
          { emoji: '🤔', users: ['2'] }
        ],
        replies: [
          {
            id: '1-1',
            userId: '2',
            userName: 'Bob Smith',
            userAvatar: '👨‍💼',
            content: 'Good point! I think 20% buffer would be safe.',
            position: { x: 0, y: 0 },
            mentions: ['1'],
            reactions: [],
            replies: [],
            timestamp: '2024-12-10T15:30:00Z',
            status: 'active'
          }
        ],
        timestamp: '2024-12-10T14:15:00Z',
        status: 'active'
      },
      {
        id: '2',
        userId: '3',
        userName: 'Carol Davis',
        userAvatar: '👩‍🎨',
        content: 'The UI mockups are ready for review. @Alice @Bob please take a look!',
        position: { x: 150, y: 250, elementId: 'design-section' },
        mentions: ['1', '2'],
        reactions: [
          { emoji: '🎨', users: ['1'] }
        ],
        replies: [],
        timestamp: '2024-12-10T16:45:00Z',
        status: 'active'
      }
    ];

    const mockActivities: Activity[] = [
      {
        id: '1',
        userId: '1',
        userName: 'Alice Johnson',
        action: 'commented',
        details: 'Added comment on Sprint Planning',
        timestamp: '2024-12-10T14:15:00Z',
        type: 'comment'
      },
      {
        id: '2',
        userId: '2',
        userName: 'Bob Smith',
        action: 'moved task',
        details: 'User Authentication → In Progress',
        timestamp: '2024-12-10T14:30:00Z',
        type: 'edit'
      },
      {
        id: '3',
        userId: '3',
        userName: 'Carol Davis',
        action: 'mentioned',
        details: 'Mentioned Alice and Bob in design review',
        timestamp: '2024-12-10T16:45:00Z',
        type: 'mention'
      }
    ];

    setActiveUsers(mockUsers);
    setComments(mockComments);
    setActivities(mockActivities);
  };

  const setupRealTimeConnection = () => {
    // Simulate WebSocket connection
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 1000);

    // Simulate real-time cursor updates
    const cursorInterval = setInterval(() => {
      setActiveUsers(prev => prev.map(user => {
        if (user.id !== currentUser.id && user.status === 'online') {
          return {
            ...user,
            cursor: {
              x: Math.random() * 800 + 100,
              y: Math.random() * 600 + 100
            }
          };
        }
        return user;
      }));
    }, 3000);

    return () => {
      clearInterval(cursorInterval);
    };
  };

  const cleanupConnection = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const handleMouseMove = useCallback(
    debounce((e: React.MouseEvent) => {
      const rect = collaborationRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update current user's cursor position
        setActiveUsers(prev => prev.map(user => 
          user.id === currentUser.id 
            ? { ...user, cursor: { x, y } }
            : user
        ));

        // Broadcast cursor position (in real implementation)
        // broadcastCursorPosition(x, y);
      }
    }, 50),
    [currentUser.id]
  );

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isAddingComment) return;
    
    const rect = collaborationRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCommentPosition({ x, y });
      setIsAddingComment(true);
    }
  };

  const addComment = () => {
    if (!newComment.trim() || !commentPosition) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content: newComment,
      position: commentPosition,
      mentions: extractMentions(newComment),
      reactions: [],
      replies: [],
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    setCommentPosition(null);
    setIsAddingComment(false);

    // Add activity
    const activity: Activity = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'commented',
      details: newComment.slice(0, 50) + (newComment.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString(),
      type: 'comment'
    };

    setActivities(prev => [activity, ...prev.slice(0, 19)]);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  const addReaction = (commentId: string, emoji: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const existingReaction = comment.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          if (existingReaction.users.includes(currentUser.id)) {
            existingReaction.users = existingReaction.users.filter(id => id !== currentUser.id);
          } else {
            existingReaction.users.push(currentUser.id);
          }
        } else {
          comment.reactions.push({ emoji, users: [currentUser.id] });
        }
      }
      return comment;
    }));
  };

  const resolveComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? { ...comment, status: 'resolved' }
        : comment
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'away': return '#f59e0b';
      case 'busy': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="collaboration-hub">
      {/* Connection Status */}
      <div className={`connection-status ${connectionStatus}`}>
        <div className="status-indicator">
          {connectionStatus === 'connected' && '🟢'}
          {connectionStatus === 'connecting' && '🟡'}
          {connectionStatus === 'disconnected' && '🔴'}
        </div>
        <span>{connectionStatus}</span>
      </div>

      {/* Collaboration Controls */}
      <div className="collaboration-controls">
        <button 
          className={`control-btn ${showUsers ? 'active' : ''}`}
          onClick={() => setShowUsers(!showUsers)}
        >
          👥 Users ({activeUsers.filter(u => u.status === 'online').length})
        </button>
        <button 
          className={`control-btn ${showComments ? 'active' : ''}`}
          onClick={() => setShowComments(!showComments)}
        >
          💬 Comments ({comments.filter(c => c.status === 'active').length})
        </button>
        <button 
          className={`control-btn ${showActivities ? 'active' : ''}`}
          onClick={() => setShowActivities(!showActivities)}
        >
          📊 Activity
        </button>
      </div>

      {/* Main Collaboration Area */}
      <div 
        ref={collaborationRef}
        className="collaboration-canvas"
        onMouseMove={handleMouseMove}
        onDoubleClick={handleDoubleClick}
      >
        {/* Live Cursors */}
        {activeUsers
          .filter(user => user.id !== currentUser.id && user.cursor && user.status === 'online')
          .map(user => (
            <div
              key={user.id}
              className="live-cursor"
              style={{
                left: user.cursor!.x,
                top: user.cursor!.y,
                color: user.color
              }}
            >
              <div className="cursor-pointer">↖</div>
              <div className="cursor-label">
                <span className="cursor-avatar">{user.avatar}</span>
                <span className="cursor-name">{user.name}</span>
              </div>
            </div>
          ))}

        {/* Comments Overlay */}
        {showComments && comments
          .filter(comment => comment.status === 'active')
          .map(comment => (
            <div
              key={comment.id}
              className="comment-pin"
              style={{
                left: comment.position.x,
                top: comment.position.y
              }}
              onClick={() => setSelectedComment(comment)}
            >
              <div className="comment-indicator">
                <span className="comment-count">
                  {1 + comment.replies.length}
                </span>
              </div>
              
              <div className="comment-preview">
                <div className="comment-header">
                  <span className="comment-avatar">{comment.userAvatar}</span>
                  <span className="comment-author">{comment.userName}</span>
                  <span className="comment-time">{formatTimeAgo(comment.timestamp)}</span>
                </div>
                <div className="comment-content">
                  {comment.content.slice(0, 100)}
                  {comment.content.length > 100 && '...'}
                </div>
                <div className="comment-reactions">
                  {comment.reactions.map(reaction => (
                    <span key={reaction.emoji} className="reaction">
                      {reaction.emoji} {reaction.users.length}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

        {/* Add Comment Input */}
        {isAddingComment && commentPosition && (
          <div
            className="add-comment-popup"
            style={{
              left: commentPosition.x,
              top: commentPosition.y
            }}
          >
            <div className="comment-input-header">
              <span className="current-user-avatar">{currentUser.avatar}</span>
              <span>Add a comment</span>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment... Use @name to mention someone"
              autoFocus
              rows={3}
            />
            <div className="comment-input-actions">
              <button onClick={() => {setIsAddingComment(false); setCommentPosition(null);}}>
                Cancel
              </button>
              <button onClick={addComment} disabled={!newComment.trim()}>
                Comment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Side Panels */}
      <div className="collaboration-sidebar">
        {/* Active Users Panel */}
        {showUsers && (
          <div className="users-panel">
            <h3>👥 Active Users</h3>
            <div className="users-list">
              {activeUsers.map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-avatar">
                    <span>{user.avatar}</span>
                    <div 
                      className="status-dot"
                      style={{ backgroundColor: getStatusColor(user.status) }}
                    />
                  </div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-status">{user.status}</div>
                  </div>
                  {user.id === currentUser.id && (
                    <div className="user-badge">You</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Panel */}
        {showComments && (
          <div className="comments-panel">
            <h3>💬 Comments</h3>
            <div className="comments-list">
              {comments
                .filter(comment => comment.status === 'active')
                .map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-avatar">{comment.userAvatar}</span>
                      <div className="comment-meta">
                        <span className="comment-author">{comment.userName}</span>
                        <span className="comment-time">{formatTimeAgo(comment.timestamp)}</span>
                      </div>
                      <button 
                        className="resolve-btn"
                        onClick={() => resolveComment(comment.id)}
                        title="Resolve comment"
                      >
                        ✓
                      </button>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                    <div className="comment-actions">
                      <div className="reactions">
                        {['👍', '❤️', '😊', '🤔', '👎'].map(emoji => (
                          <button
                            key={emoji}
                            className="reaction-btn"
                            onClick={() => addReaction(comment.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <button className="reply-btn">Reply</button>
                    </div>
                    {comment.reactions.length > 0 && (
                      <div className="comment-reactions">
                        {comment.reactions.map(reaction => (
                          <span key={reaction.emoji} className="reaction">
                            {reaction.emoji} {reaction.users.length}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Activity Panel */}
        {showActivities && (
          <div className="activity-panel">
            <h3>📊 Recent Activity</h3>
            <div className="activity-list">
              {activities.slice(0, 10).map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'comment' && '💬'}
                    {activity.type === 'edit' && '✏️'}
                    {activity.type === 'mention' && '👤'}
                    {activity.type === 'reaction' && '❤️'}
                    {activity.type === 'status_change' && '🔄'}
                  </div>
                  <div className="activity-content">
                    <span className="activity-user">{activity.userName}</span>
                    <span className="activity-action">{activity.action}</span>
                    <div className="activity-details">{activity.details}</div>
                    <div className="activity-time">{formatTimeAgo(activity.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comment Detail Modal */}
      {selectedComment && (
        <div className="comment-modal" onClick={() => setSelectedComment(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Comment Thread</h3>
              <button onClick={() => setSelectedComment(null)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="main-comment">
                <div className="comment-header">
                  <span className="comment-avatar">{selectedComment.userAvatar}</span>
                  <div className="comment-meta">
                    <span className="comment-author">{selectedComment.userName}</span>
                    <span className="comment-time">{formatTimeAgo(selectedComment.timestamp)}</span>
                  </div>
                </div>
                <div className="comment-content">{selectedComment.content}</div>
                <div className="comment-reactions">
                  {selectedComment.reactions.map(reaction => (
                    <span key={reaction.emoji} className="reaction">
                      {reaction.emoji} {reaction.users.length}
                    </span>
                  ))}
                </div>
              </div>
              
              {selectedComment.replies.map(reply => (
                <div key={reply.id} className="reply-comment">
                  <div className="comment-header">
                    <span className="comment-avatar">{reply.userAvatar}</span>
                    <div className="comment-meta">
                      <span className="comment-author">{reply.userName}</span>
                      <span className="comment-time">{formatTimeAgo(reply.timestamp)}</span>
                    </div>
                  </div>
                  <div className="comment-content">{reply.content}</div>
                </div>
              ))}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={() => resolveComment(selectedComment.id)}
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationHub; 