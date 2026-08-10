/**
 * Utility functions for human-readable customer activity time formatting.
 */

export function formatRelativeTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'Never active';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never active';

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 0) return 'Just now';
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)} sec ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hr' : 'hrs'} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;

  // Formatted date for older activity
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return `Last seen ${date.toLocaleDateString('en-GB', options)}`;
}

export function formatFullTimestamp(dateInput?: string | Date | number | null): string {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export interface ActivityStatusBadge {
  label: string;
  dot: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  category: 'recent' | 'today' | 'older';
}

export function getActivityStatus(dateInput?: string | Date | number | null): ActivityStatusBadge {
  if (!dateInput) {
    return {
      label: 'Never seen',
      dot: '⚪',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-600',
      badgeBorder: 'border-gray-300',
      category: 'older',
    };
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return {
      label: 'Unknown',
      dot: '⚪',
      badgeBg: 'bg-gray-100',
      badgeText: 'text-gray-600',
      badgeBorder: 'border-gray-300',
      category: 'older',
    };
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 5) {
    return {
      label: 'Recently active',
      dot: '🟢',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300',
      category: 'recent',
    };
  }

  if (diffInMinutes < 30) {
    return {
      label: 'Active recently',
      dot: '🟢',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-200',
      category: 'recent',
    };
  }

  if (diffInMinutes < 120) {
    return {
      label: 'Seen earlier',
      dot: '🟡',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300',
      category: 'recent',
    };
  }

  if (diffInMinutes < 1440) {
    return {
      label: 'Seen today',
      dot: '🟠',
      badgeBg: 'bg-orange-50',
      badgeText: 'text-orange-800',
      badgeBorder: 'border-orange-300',
      category: 'today',
    };
  }

  return {
    label: `Last seen ${formatRelativeTime(dateInput)}`,
    dot: '⚪',
    badgeBg: 'bg-gray-50',
    badgeText: 'text-gray-600',
    badgeBorder: 'border-gray-300',
    category: 'older',
  };
}
