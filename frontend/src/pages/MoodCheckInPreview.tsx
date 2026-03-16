import { MoodCheckIn } from '@/components/dashboard/MoodCheckIn';

export function MoodCheckInPreview() {
  return (
    <MoodCheckIn
      userName="Eric"
      onComplete={(entry) => {
        console.log('Check-in complete:', entry);
        alert('Check-in complete! Entry saved. Check console for details.');
      }}
      onSkip={() => {
        console.log('Check-in skipped');
        alert('Skipped! In the real app, the dashboard would appear.');
      }}
    />
  );
}
