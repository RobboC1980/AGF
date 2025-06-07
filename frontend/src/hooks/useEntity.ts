import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type Entity =
  | 'projects' | 'epics' | 'stories' | 'tasks'
  | 'sprints' | 'initiatives' | 'risks' | 'okrs'

export function useEntityList<T>(entity: Entity) {
  return useQuery<T[]>({
    queryKey: [entity],
    queryFn: async () => {
      const { data } = await api.get(`/${entity}`)
      return data
    }
  })
}

export function useEntityMutations<T>(entity: Entity) {
  const qc = useQueryClient()
  
  const create = useMutation({
    mutationFn: (payload: Partial<T>) => api.post(`/${entity}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entity] })
  })
  
  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string, payload: Partial<T> }) =>
      api.put(`/${entity}/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entity] })
  })
  
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/${entity}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [entity] })
  })
  
  return { create, update, del }
}
