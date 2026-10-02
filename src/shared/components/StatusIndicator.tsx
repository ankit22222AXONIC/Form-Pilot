
interface StatusIndicatorProps {
  status: 'active' | 'inactive' | 'pending';
  text: string;
}

export function StatusIndicator({ status, text }: StatusIndicatorProps) {
  const colors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    pending: 'bg-amber-500',
  };

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span>{text}</span>
    </div>
  );
}
