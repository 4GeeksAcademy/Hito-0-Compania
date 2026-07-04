type FeedbackVariant = 'error' | 'success' | 'info';

type FeedbackAlertProps = {
  message: string;
  variant: FeedbackVariant;
  className?: string;
};

const variantClasses: Record<FeedbackVariant, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-green-200 bg-green-50 text-green-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
};

export default function FeedbackAlert({ message, variant, className = '' }: FeedbackAlertProps) {
  return (
    <div className={'rounded-lg border p-3 text-sm ' + variantClasses[variant] + (className ? ' ' + className : '')}>
      {message}
    </div>
  );
}
