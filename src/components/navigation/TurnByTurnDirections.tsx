import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Navigation2,
  Clock,
  MapPin,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RouteStep,
  getInstructionIcon,
  formatDistance,
  formatDuration
} from '@/hooks/useRouteDirections';

interface TurnByTurnDirectionsProps {
  steps: RouteStep[];
  totalDistance: number;
  totalDuration: number;
  isLoading?: boolean;
  currentStepIndex?: number;
  onStepClick?: (index: number) => void;
}

export default function TurnByTurnDirections({
  steps,
  totalDistance,
  totalDuration,
  isLoading = false,
  currentStepIndex = 0,
  onStepClick,
}: TurnByTurnDirectionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const displaySteps = showAllSteps ? steps : steps.slice(0, 5);
  const hasMoreSteps = steps.length > 5;

  if (isLoading) {
    return (
      <Card className="bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-muted-foreground">Calculating route...</span>
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) return null;

  return (
    <Card className="bg-card/95 backdrop-blur-sm border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <Navigation2 className="h-5 w-5 text-primary" />
            Navigation Directions
          </span>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardTitle>

        <div className="flex gap-2 mt-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {formatDistance(totalDistance)}
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(totalDuration)}
          </Badge>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {displaySteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg cursor-pointer
                        transition-colors hover:bg-muted/50
                        ${index === currentStepIndex ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}
                      `}
                      onClick={() => onStepClick?.(index)}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold
                        ${index === currentStepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                      `}>
                        {getInstructionIcon(step.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${index === currentStepIndex ? 'text-primary' : ''}`}>
                          {step.instruction}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatDistance(step.distance)}</span>
                          <span>-</span>
                          <span>{formatDuration(step.duration)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground font-medium">
                        {index + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {hasMoreSteps && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowAllSteps(!showAllSteps)}
                  >
                    {showAllSteps ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show all {steps.length} steps
                      </>
                    )}
                  </Button>
                )}
              </ScrollArea>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
