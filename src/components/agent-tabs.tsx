import { cn } from 'cn';
import type { ReactNode } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Agent } from '@/lib/workspace';
import { useUiStore } from '@/state/ui-store';

interface AgentTabsProps {
  agents: readonly Agent[];
  /** 当前显示的 Agent，通常由 `findSelectedAgent` 得到。 */
  agent: Agent;
  /** Tabs 根元素的附加 class，如与内容的间距。 */
  className?: string;
  /** Tab 内容的附加 class。 */
  contentClassName?: string;
  /** 当前 Agent 的 Tab 内容。 */
  children: ReactNode;
}

/**
 * Agent 页和输出页顶部的 Agent Tabs：按录入顺序排列，切换时更新两个页面共用的选中 Agent。
 * 宽屏下 Tab 标题固定，内容由使用方决定如何滚动。
 */
export function AgentTabs({ agents, agent, className, contentClassName, children }: AgentTabsProps) {
  const selectAgent = useUiStore((state) => state.selectAgent);

  return (
    <Tabs
      value={agent.id}
      onValueChange={(value: string) => selectAgent(value)}
      className={cn('md:min-h-0 md:flex-1', className)}
    >
      <TabsList className="max-w-full shrink-0 justify-start overflow-x-auto overflow-y-hidden">
        {agents.map((candidate) => (
          <TabsTrigger key={candidate.id} value={candidate.id} className="flex-none">
            {candidate.name}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={agent.id} className={cn('flex flex-col md:min-h-0', contentClassName)}>
        {children}
      </TabsContent>
    </Tabs>
  );
}
