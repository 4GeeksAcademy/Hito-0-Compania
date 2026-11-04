type FeedbackVariant = 'error' | 'success' | 'info';

type FeedbackAction = {
  label: string;
  onClick: () => void;
};

type FeedbackAlertProps = {
  message: string;
  variant: FeedbackVariant;
  className?: string;
  action?: FeedbackAction;
};

const variantClasses: Record<FeedbackVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export default function FeedbackAlert({ message, variant, className = '', action }: FeedbackAlertProps) {
  return (
    <div className={'rounded-lg border p-3 text-sm flex items-start justify-between gap-3 ' + variantClasses[variant] + (className ? ' ' + className : '')}>
      <span className="flex-1">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="shrink-0 rounded-md border border-current bg-white/80 px-3 py-1 text-xs font-semibold hover:bg-white transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
