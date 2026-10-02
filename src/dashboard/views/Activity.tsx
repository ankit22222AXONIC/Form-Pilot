import { Card } from '../../shared/components/Card';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { EmptyState } from '../../shared/components/EmptyState';
import { Clock } from 'lucide-react';

export function Activity() {
  return (
    <div className="max-w-4xl space-y-6">
      <SectionHeading 
        title="Activity History" 
        description="Review forms you've analyzed and filled with FormPilot." 
      />
      
      <Card>
        <EmptyState 
          icon={<Clock size={24} />}
          title="No history yet"
          description="Activity will appear here after future functionality is implemented. Forms analyzed and fields filled will be securely logged."
        />
      </Card>
    </div>
  );
}
