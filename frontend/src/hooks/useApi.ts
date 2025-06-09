import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const lastDepsRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiCall();
      
      // Only update state if this request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (error: any) {
      // Only update state if this request wasn't aborted and it's not an abort error
      if (!abortControllerRef.current?.signal.aborted && error.name !== 'AbortError') {
        let errorMessage = error instanceof Error ? error.message : 'An error occurred';
        
        // Handle rate limiting errors specifically
        if (error.response?.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
          console.warn('Rate limit hit:', error.response?.data);
        }
        
        setState({ 
          data: null, 
          loading: false, 
          error: errorMessage
        });
      }
    }
  }, []);

  useEffect(() => {
    // Stringify dependencies to check for deep equality
    const depsString = JSON.stringify(dependencies);
    
    // Only fetch if dependencies actually changed
    if (depsString !== lastDepsRef.current) {
      lastDepsRef.current = depsString;
      fetchData();
    }

    // Cleanup function to abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, dependencies);

  return {
    ...state,
    refetch: fetchData,
  };
}

// Specific hooks for common operations
export function useProjects() {
  return useApi(() => apiClient.getProjects());
}

export function useProject(id: string) {
  return useApi(() => apiClient.getProject(id), [id]);
}

export function useEpics(projectId?: string) {
  return useApi(() => apiClient.getEpics(projectId), [projectId]);
}

export function useStories(epicId?: string) {
  return useApi(() => apiClient.getStories(epicId), [epicId]);
}

export function useTasks(filters?: { storyId?: string; sprintId?: string; status?: string; assignedTo?: string }) {
  return useApi(() => apiClient.getTasks(filters), [JSON.stringify(filters)]);
}

export function useSprints(projectId?: string) {
  return useApi(() => apiClient.getSprints(projectId), [projectId]);
}

export function useDashboard() {
  return useApi(() => apiClient.getDashboard());
}

// Hook for API mutations (create, update, delete)
export function useApiMutation<TData, TVariables = void>() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TData | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = async (
    mutationFn: (variables: TVariables) => Promise<TData>,
    variables: TVariables
  ): Promise<TData> => {
    setState({ loading: true, error: null, data: null });
    try {
      const result = await mutationFn(variables);
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ loading: false, error: errorMessage, data: null });
      throw error;
    }
  };

  return {
    ...state,
    mutate,
  };
} 