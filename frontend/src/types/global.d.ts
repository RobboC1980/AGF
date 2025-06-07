import * as React from 'react';

declare global {
  namespace React {
    type ReactNode = import('react').ReactNode;
  }
} 