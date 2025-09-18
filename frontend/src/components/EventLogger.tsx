import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Event } from "./ProctorInterface";
import { AlertTriangle, Eye, EyeOff, Phone, FileText, Users } from "lucide-react";

interface EventLoggerProps {
  events: Event[];
}

const EventLogger = ({ events }: EventLoggerProps) => {
  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'focus-lost': return <EyeOff className="h-4 w-4" />;
      case 'focus-restored': return <Eye className="h-4 w-4" />;
      case 'face-absent': return <EyeOff className="h-4 w-4" />;
      case 'multiple-faces': return <Users className="h-4 w-4" />;
      case 'phone-detected': return <Phone className="h-4 w-4" />;
      case 'notes-detected': return <FileText className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: Event['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'default';
      default: return 'default';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Event Log</h3>
          <Badge variant="outline" className="text-xs">
            {events.length} Events
          </Badge>
        </div>

        <ScrollArea className="h-80">
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events recorded</p>
                <p className="text-xs">Start monitoring to see activity</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 border border-monitor-border rounded-lg bg-card/50"
                >
                  <div className={`
                    p-2 rounded-full 
                    ${event.severity === 'critical' ? 'bg-status-critical/10 text-status-critical' : ''}
                    ${event.severity === 'warning' ? 'bg-status-warning/10 text-status-warning' : ''}
                    ${event.severity === 'info' ? 'bg-status-active/10 text-status-active' : ''}
                  `}>
                    {getEventIcon(event.type)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={getSeverityVariant(event.severity)}
                        className="text-xs"
                      >
                        {event.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground">
                      {event.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};

export default EventLogger;