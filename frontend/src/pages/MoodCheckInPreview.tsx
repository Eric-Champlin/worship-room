import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn';

export function MoodCheckInPreview() {
  return (
    <MoodCheckIn
      userName="Eric"
      onComplete={(_entry) => {
        alert('Check-in complete! Entry saved.');
      }}
      onSkip={() => {
        alert('Skipped! In the real app, the dashboard would appear.');
      }}
    />
  );
}
