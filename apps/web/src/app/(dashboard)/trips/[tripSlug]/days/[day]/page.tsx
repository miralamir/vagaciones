import { DayScreen } from "@/components/domain/DayScreen";

export default async function TripDayPage({
  params
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  return <DayScreen initialDay={Number(day)} />;
}
