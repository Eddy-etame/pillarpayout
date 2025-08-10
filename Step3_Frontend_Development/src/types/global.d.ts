import { ThreeElements } from '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// Framer Motion type extensions for React 18
declare module 'framer-motion' {
  interface HTMLMotionProps<T> {
    className?: string
  }
  
  interface MotionProps {
    className?: string
  }
}

export {}
