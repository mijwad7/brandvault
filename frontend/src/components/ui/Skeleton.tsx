import { cn } from '../../lib/cn.ts'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-muted-surface motion-reduce:animate-none', className)} />
}
