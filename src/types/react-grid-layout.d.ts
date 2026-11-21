// Minimal ambient types for react-grid-layout (no @types package installed). Covers only what we use.
declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    static?: boolean;
    [key: string]: unknown;
  }

  export interface GridLayoutProps {
    className?: string;
    cols?: number;
    rowHeight?: number;
    width?: number;
    margin?: [number, number];
    isDraggable?: boolean;
    isResizable?: boolean;
    draggableHandle?: string;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    onLayoutChange?: (layout: Layout[]) => void;
    children?: React.ReactNode;
  }

  const GridLayout: React.ComponentType<GridLayoutProps>;
  export function WidthProvider<P>(component: React.ComponentType<P>): React.ComponentType<P>;
  export default GridLayout;
}

declare module 'react-grid-layout/css/styles.css';
declare module 'react-resizable/css/styles.css';
