interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'in-progress';
  text: string;
}

export default function StatusBadge({ status, text }: StatusBadgeProps) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colors[status]}`}>
      {text}
    </span>
  );
}
