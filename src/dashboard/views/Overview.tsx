import { Card } from '../../shared/components/Card';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { StatusIndicator } from '../../shared/components/StatusIndicator';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { ScanSearch, Activity as ActivityIcon } from 'lucide-react';
import { EmptyState } from '../../shared/components/EmptyState';

export function Overview() {
  return (
    <div className="max-w-4xl space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-gray-900">Welcome to FormPilot</h2>
        <p className="text-gray-500 mt-2 text-lg">Your privacy-first AI assistant for forms, simplified.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <SectionHeading title="Extension Status" />
          <div className="space-y-6">
            <StatusIndicator status="active" text="FormPilot is ready" />
            <p className="text-sm text-gray-500">
              FormPilot is actively protecting your privacy and is ready to assist with any forms on your current tabs.
            </p>
            <PrimaryButton icon={<ScanSearch size={18} />} disabled className="w-full">
              Analyze Current Form (Placeholder)
            </PrimaryButton>
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeading title="Privacy Status" />
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
              <StatusIndicator status="active" text="" />
              <div>
                <h4 className="text-sm font-semibold text-green-900">Data Stored Locally</h4>
                <p className="text-sm text-green-700 mt-1">Your encrypted vault remains on your device. AI analysis only processes form structure and labels; your saved personal data is never transmitted to AI servers.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <section>
        <SectionHeading title="Recent Activity" description="Your latest interactions with FormPilot." />
        <Card>
          <EmptyState 
            icon={<ActivityIcon size={24} />}
            title="No recent activity"
            description="Your activity history will appear here once you start using FormPilot to fill out forms."
          />
        </Card>
      </section>
    </div>
  );
}
