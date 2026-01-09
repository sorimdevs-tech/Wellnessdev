import { useUser } from "../context/UserContext";

export default function AvailabilityPanel() {
  const { user } = useUser();
  if (!user || user.currentRole !== "doctor") return null;

  // Placeholder for availability management UI
  return (
    <div className="bg-white rounded-xl shadow p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">My Availability</h2>
      <div className="text-gray-500">Set your working hours, breaks, and off-days here. (Coming soon)</div>
    </div>
  );
}
