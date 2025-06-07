import * as React from 'react';

declare module 'react-beautiful-dnd' {
  export interface DragDropContextProps {
    onDragEnd: (result: any, provided: any) => void;
    children: React.ReactNode;
  }

  export interface DroppableProps {
    droppableId: string;
    children: (provided: any, snapshot: any) => React.ReactElement;
    type?: string;
    isDropDisabled?: boolean;
    isCombineEnabled?: boolean;
    direction?: 'vertical' | 'horizontal';
    ignoreContainerClipping?: boolean;
    renderClone?: (provided: any, snapshot: any, rubric: any) => React.ReactElement;
  }

  export interface DraggableProps {
    draggableId: string;
    index: number;
    children: (provided: any, snapshot: any) => React.ReactElement;
    isDragDisabled?: boolean;
    disableInteractiveElementBlocking?: boolean;
    shouldRespectForcePress?: boolean;
  }

  export function DragDropContext(props: DragDropContextProps): React.ReactElement;
  export function Droppable(props: DroppableProps): React.ReactElement;
  export function Draggable(props: DraggableProps): React.ReactElement;
} 